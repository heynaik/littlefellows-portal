import { NextResponse } from "next/server";
import { wooCommerceClient } from "@/lib/woocommerce";
import { requireUser } from "@/lib/server/auth";

export async function GET(req: Request) {
    const guard = await requireUser(req);
    if (guard instanceof Response) return guard;
    if (guard.role !== 'admin') {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        const { searchParams } = new URL(req.url);
        const page = searchParams.get("page") || "1";
        const per_page = searchParams.get("per_page") || "20";
        const search = searchParams.get("search") || "";
        const role = searchParams.get("role") || "all";
        const type = searchParams.get("type") || "all"; // 'all', 'registered', 'guest'
        const sort = searchParams.get("sort") || "date_desc"; // 'date_desc', 'spend_desc', 'orders_desc'
        const minOrders = searchParams.get("min_orders") || "0";

        // Fetch Customers (Registered) AND Orders (to find Guests)
        // Note: Pagination across two different sources is complex. 

        // Fetch Logic based on Type
        let customersTask = Promise.resolve({ data: [], headers: {} });
        let ordersTask = Promise.resolve({ data: [], headers: {} });

        // 1. Fetch Registered if type is 'all' or 'registered'
        if (type === 'all' || type === 'registered') {
            customersTask = wooCommerceClient.get("customers", {
                role: "all",
                per_page: 100,
                search: search
            });
        }

        // 2. Fetch Orders (for Guests) if type is 'all' or 'guest'
        if (type === 'all' || type === 'guest') {
            ordersTask = wooCommerceClient.get("orders", {
                per_page: 100,
                search: search
            });
        }

        const [customersRes, ordersRes] = await Promise.all([customersTask, ordersTask]);

        const registeredParams = (customersRes as any).data || [];
        const orders = (ordersRes as any).data || [];

        // Map Registered Users to common shape
        const customerMap = new Map();

        registeredParams.forEach((c: any) => {
            const emailKey = (c.email || "").toLowerCase();
            if (!emailKey) return;

            customerMap.set(emailKey, {
                id: c.id,
                email: c.email,
                first_name: c.first_name,
                last_name: c.last_name,
                username: c.username,
                date_created: c.date_created,
                total_spent: c.total_spent || "0.00",
                orders_count: c.orders_count || 0,
                billing: c.billing,
                avatar_url: c.avatar_url,
                is_guest: false
            });
        });

        // Extract Guests from Orders AND Backfill Registered Users
        orders.forEach((o: any) => {
            const email = (o.billing?.email || "").toLowerCase();
            if (!email) return;

            const isGuestOrder = o.customer_id === 0;

            if (type === 'guest' && !isGuestOrder) return;
            if (type === 'registered' && isGuestOrder) return;

            // If not already in map, add as Guest
            if (!customerMap.has(email)) {
                if (type === 'all' && !isGuestOrder) {
                    // Registered user not in list (pagination?), ignore for now
                }

                customerMap.set(email, {
                    id: isGuestOrder ? `guest-${o.id}` : o.customer_id,
                    email: email,
                    first_name: o.billing.first_name,
                    last_name: o.billing.last_name,
                    username: o.customer_id === 0 ? "Guest" : "Customer",
                    date_created: o.date_created,
                    total_spent: o.total,
                    orders_count: 1, // Placeholder for guest
                    billing: o.billing,
                    avatar_url: "",
                    is_guest: isGuestOrder
                });
            } else {
                // Customer exists (Registered). Check if we can enrich data from this order.
                const existing = customerMap.get(email);

                // Backfill Name if missing
                if ((!existing.first_name && !existing.last_name) && (o.billing.first_name || o.billing.last_name)) {
                    existing.first_name = o.billing.first_name;
                    existing.last_name = o.billing.last_name;
                }

                // Backfill Phone if missing
                if (!existing.billing?.phone && o.billing.phone) {
                    if (!existing.billing) existing.billing = {};
                    existing.billing.phone = o.billing.phone;
                }

                // Backfill Address if missing
                if (!existing.billing?.city && o.billing.city) {
                    // If the profile has absolutely no address, take the order's billing address
                    existing.billing = { ...existing.billing, ...o.billing };
                }

                // Update Spend/Count if they appear to be zero (sync issue)
                // If the registered user has 0 orders but we found an order, clearly they have at least 1.
                if (Number(existing.orders_count) === 0) {
                    existing.orders_count = 1; // At least one
                    // We could try to sum up totals but that requires iterating all orders for this user. 
                    // For now, at least fixing the "0 orders" display is good.
                }
            }
        });

        let allCustomers = Array.from(customerMap.values());

        // FILTER: Min Orders (Repeat Customers)
        if (Number(minOrders) > 0) {
            allCustomers = allCustomers.filter((c: any) => c.orders_count >= Number(minOrders));
        }

        // SORTING
        allCustomers.sort((a: any, b: any) => {
            if (sort === 'spend_desc') {
                return Number(b.total_spent) - Number(a.total_spent);
            } else if (sort === 'orders_desc') {
                return b.orders_count - a.orders_count;
            } else {
                // Default: date_desc
                return new Date(b.date_created).getTime() - new Date(a.date_created).getTime();
            }
        });

        // Simple Slice for Pagination
        const pageNum = Number(page);
        const perPageNum = Number(per_page);
        const start = (pageNum - 1) * perPageNum;
        const paginatedCustomers = allCustomers.slice(start, start + perPageNum);

        return NextResponse.json({
            customers: paginatedCustomers,
            total: allCustomers.length,
            totalPages: Math.ceil(allCustomers.length / perPageNum)
        });

    } catch (error: any) {
        console.error("[customers.GET]", error?.response?.data || error);
        return NextResponse.json({
            message: "Failed to fetch customers",
            error: error?.message
        }, { status: 500 });
    }
}

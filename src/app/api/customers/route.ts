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
            customerMap.set(c.email, {
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

        // Extract Guests from Orders
        orders.forEach((o: any) => {
            const email = o.billing?.email;
            if (!email) return;

            const isGuestOrder = o.customer_id === 0;

            if (type === 'guest' && !isGuestOrder) return;
            if (type === 'registered' && isGuestOrder) return;

            // If not already in map, add.
            if (!customerMap.has(email)) {
                if (type === 'all' && !isGuestOrder) {
                    // Registered user not in list (pagination?), ignore for now to avoid duplicates or incomplete data
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
                // Determine if we should update stats?
                // For guests, we might want to sum up if we find multiple orders
                // But for simplicity in this merged view, we rely on what we have.
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

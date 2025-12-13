
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function main() {
    console.log("----------------------------------------");
    console.log("DEBUG: Simulating Customer Route Logic");

    // Dynamic import
    const { wooCommerceClient } = await import('../src/lib/woocommerce');

    try {
        const type = 'all';
        const search = '';

        console.log("Fetching data from WooCommerce...");

        const customersTask = wooCommerceClient.get("customers", {
            role: "all",
            per_page: 100,
            search: search
        });

        const ordersTask = wooCommerceClient.get("orders", {
            per_page: 100,
            search: search
        });

        const [customersRes, ordersRes] = await Promise.all([customersTask, ordersTask]);

        const registeredParams = (customersRes as any).data || [];
        const orders = (ordersRes as any).data || [];

        console.log(`Raw Registered Customers: ${registeredParams.length}`);
        console.log(`Raw Orders: ${orders.length}`);

        // --- MIMIC ROUTE LOGIC START ---
        const customerMap = new Map();

        registeredParams.forEach((c: any) => {
            const emailKey = (c.email || "").toLowerCase();

            // LOG DROPPED USERS
            if (!emailKey) {
                console.log("!! Dropping registered user due to missing email:", c.id, c.username);
                return;
            }

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

        console.log(`Map size after registered: ${customerMap.size}`);

        orders.forEach((o: any) => {
            const email = (o.billing?.email || "").toLowerCase();
            if (!email) {
                // console.log("!! Dropping order due to missing billing email:", o.id);
                return;
            }

            const isGuestOrder = o.customer_id === 0;

            if (type === 'guest' && !isGuestOrder) return;
            if (type === 'registered' && isGuestOrder) return;

            if (!customerMap.has(email)) {
                if (type === 'all' && !isGuestOrder) {
                    // console.log("!! Skipping registered user found in order but not in customer list (pagination?):", email);
                }

                // Add Guest
                customerMap.set(email, {
                    id: isGuestOrder ? `guest-${o.id}` : o.customer_id,
                    email: email,
                    first_name: o.billing.first_name,
                    last_name: o.billing.last_name,
                    username: o.customer_id === 0 ? "Guest" : "Customer",
                    date_created: o.date_created,
                    total_spent: o.total,
                    orders_count: 1,
                    billing: o.billing,
                    avatar_url: "",
                    is_guest: isGuestOrder
                });
            } else {
                // Backfill Logic
                const existing = customerMap.get(email);

                if ((!existing.first_name && !existing.last_name) && (o.billing.first_name || o.billing.last_name)) {
                    console.log(`>> Backfilling Name for ${email}: ${o.billing.first_name}`);
                    existing.first_name = o.billing.first_name;
                    existing.last_name = o.billing.last_name;
                }

                if (!existing.billing?.city && o.billing.city) {
                    console.log(`>> Backfilling Address for ${email}`);
                    existing.billing = { ...existing.billing, ...o.billing };
                }
            }
        });

        let allCustomers = Array.from(customerMap.values());
        console.log(`Final Customers Count: ${allCustomers.length}`);

        if (allCustomers.length > 0) {
            console.log("First Customer in List:", JSON.stringify(allCustomers[0], null, 2));
        }

    } catch (err: any) {
        console.error("Error:", err.message);
    }
}

main();

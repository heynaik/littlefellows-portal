import { NextResponse } from "next/server";
import { wooCommerceClient } from "@/lib/woocommerce";
import { differenceInDays, parseISO } from 'date-fns';

export async function GET() {
    try {
        // Fetch last 100 orders to calculate "Recent Revenue"
        // This is more robust than reports/sales which can be empty or cached.
        const response = await wooCommerceClient.get("orders", {
            per_page: 100,
            page: 1,
            _fields: "total,status,date_created,created_via" // Fetch ONLY needed fields for speed
        });

        const orders = response.data;

        // Revenue: Sum of non-cancelled/failed
        const revenueOrders = orders.filter((o: any) => ['completed', 'processing', 'on-hold'].includes(o.status));
        const totalSales = revenueOrders.reduce((acc: number, order: any) => acc + parseFloat(order.total || "0"), 0);

        // Priority Count: > 4 days and not completed
        // Replicating logic here to avoid importing relative 'src/lib/utils' which might be iffy in some build setups if not configured, 
        // but importing is cleaner. Let's try importing.
        // Actually, for safety and speed in this tool, I'll inline the simple logic or dynamic import.
        // Let's import.
        const now = new Date();
        const priorityCount = orders.filter((order: any) => {
            const status = order.status;
            if (['completed', 'cancelled', 'refunded', 'failed', 'trash'].includes(status)) return false;
            const age = differenceInDays(now, parseISO(order.date_created));
            return age > 4;
        }).length;

        return NextResponse.json({
            revenue: totalSales,
            currency_symbol: "₹",
            order_count: revenueOrders.length,
            priority_count: priorityCount
        });

    } catch (error: any) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

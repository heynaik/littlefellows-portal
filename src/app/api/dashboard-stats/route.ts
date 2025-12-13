import { NextResponse } from "next/server";
import { wooCommerceClient } from "@/lib/woocommerce";
import { differenceInDays, parseISO, format } from 'date-fns';

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
        const now = new Date();
        const priorityCount = orders.filter((order: any) => {
            const status = order.status;
            if (['completed', 'cancelled', 'refunded', 'failed', 'trash'].includes(status)) return false;
            const age = differenceInDays(now, parseISO(order.date_created));
            return age > 4;
        }).length;

        // Fetch Sales Report (Last 30 Days) for Chart
        let chartData: { date: string, total: number, orders: number }[] = [];
        try {
            const reportRes = await wooCommerceClient.get("reports/sales", {
                period: "month", // Last month (approx 30 days)
                date_min: format(new Date(now.setDate(now.getDate() - 30)), 'yyyy-MM-dd'),
                date_max: format(new Date(), 'yyyy-MM-dd')
            });
            // Support both array or object response structure depending on version
            const reports = Array.isArray(reportRes.data) ? reportRes.data : [];

            // Transform for Recharts: { date: 'Dec 01', total: 150.00 }
            if (reports.length > 0) {
                chartData = reports[0].totals ? Object.keys(reports[0].totals).map(dateStr => ({
                    date: format(parseISO(dateStr), 'MMM dd'),
                    total: parseFloat(reports[0].totals[dateStr].sales) || 0,
                    orders: parseInt(reports[0].totals[dateStr].orders) || 0
                })) : [];
            }
        } catch (reportError) {
            console.warn("Failed to fetch reports/sales, skipping chart data", reportError);
            // Fallback: If report fails (permissions?), we could manually aggregate 'orders' if we had fetched enough.
            // For now, return empty chart data.
        }

        return NextResponse.json({
            revenue: totalSales,
            currency_symbol: "₹",
            order_count: revenueOrders.length,
            priority_count: priorityCount,
            chart_data: chartData
        });

    } catch (error: any) {
        console.error("Error fetching dashboard stats:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

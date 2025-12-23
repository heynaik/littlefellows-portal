import { NextResponse } from "next/server";
import { wooCommerceClient } from "@/lib/woocommerce";
import { requireUser } from "@/lib/server/auth";
import { isFirebaseAdminInitialized } from "@/lib/server/firebaseAdmin";

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
        const status = searchParams.get("status") || "any";

        const params: any = {
            page,
            per_page,
            order: "desc",
            orderby: "date",
        };

        if (search) params.search = search;
        if (status !== "any") params.status = status;

        const response = await wooCommerceClient.get("orders", params);
        const orders = response.data;

        // Check Internal DB for Production Status
        if (isFirebaseAdminInitialized && orders.length > 0) {
            try {
                // Woo order IDs are numbers, we store them as numbers or strings in 'wcId'
                // Let's handle generic matching.
                const wcIds = orders.map((o: any) => o.id);

                // Firestore 'in' query supports up to 10 items (or 30?). Safe batching or just query?
                // For simplicity/perf in this scale, we can query orders where wcId is in this list.
                // Assuming adminDb is available.
                const { adminDb } = await import("@/lib/server/firebaseAdmin");

                // Firestore 'in' limit is 10. We might have 20 orders.
                // Strategy: Just fetch all internal orders? No, that's bad scaling.
                // Strategy: Chunck queries? Or just for now, simple implementation logic.
                // Let's just checking specific active ones.

                // BETTER STRATEGY for small batches: 
                // Fetch internal orders that have a 'wcId' field. 
                // Ideally we have an index on wcId.

                const chunkSize = 10;
                const chunks = [];
                for (let i = 0; i < wcIds.length; i += chunkSize) {
                    chunks.push(wcIds.slice(i, i + chunkSize));
                }

                await Promise.all(chunks.map(async (chunk) => {
                    const snap = await adminDb.collection("orders").where("wcId", "in", chunk).get();

                    // First pass: Collect all vendor IDs
                    const internalOrders: any[] = [];
                    const vendorIds = new Set<string>();

                    snap.docs.forEach((doc: any) => {
                        const d = doc.data();
                        internalOrders.push(d);
                        if (d.vendorId) vendorIds.add(d.vendorId);
                    });

                    // Fetch Vendors if any
                    const vendorMap: Record<string, string> = {};
                    if (vendorIds.size > 0) {
                        const vIds = Array.from(vendorIds);
                        await Promise.all(vIds.map(async (vid) => {
                            const vDoc = await adminDb.collection("users").doc(vid).get();
                            if (vDoc.exists) {
                                vendorMap[vid] = vDoc.data()?.name || vDoc.data()?.email || "Unknown";
                            }
                        }));
                    }

                    // Second pass: Map to Woo orders
                    internalOrders.forEach((data) => {
                        const match = orders.find((o: any) => o.id === data.wcId);
                        if (match) {
                            match.status = data.stage || "Assigned to Vendor";
                            match.internal_stage = data.stage;
                            match.s3Key = data.s3Key;
                            if (data.vendorId) {
                                match.vendor_name = vendorMap[data.vendorId];
                            }
                        }
                    });
                }));

            } catch (dbError) {
                console.error("[woo-orders.GET] Failed to sync internal status:", dbError);
            }
        } else if (!isFirebaseAdminInitialized) {
            // DEV MODE Persistence
            try {
                const { getMockOrders } = require("@/lib/server/localStore");
                const mockOrders = getMockOrders();

                // We also need vendor names. Since we are in dev mode, we can just map the dummy IDs we added in vendors/route.ts
                const mockVendorMap: Record<string, string> = {
                    "v-test-01": "Test Vendor (Dev)",
                    "v-print-02": "Fast Prints Co."
                };

                orders.forEach((order: any) => {
                    // Find internal mock order
                    const match = mockOrders.find((m: any) => m.wcId === order.id || m.wcId === String(order.id));
                    if (match) {
                        order.status = match.stage || "Assigned to Vendor";
                        if (match.vendorId) {
                            order.vendor_name = mockVendorMap[match.vendorId] || "Unknown Vendor";
                        }
                    }
                });
            } catch (e) {
                console.error("Failed to load mock persistence", e);
            }
        }

        return NextResponse.json({
            orders: orders,
            total: response.headers["x-wp-total"],
            totalPages: response.headers["x-wp-totalpages"],
        });

    } catch (error: any) {
        console.error("[woo-orders.GET]", error?.response?.data || error);
        return NextResponse.json({
            message: "Failed to fetch orders",
            error: error?.message
        }, { status: 500 });
    }
}

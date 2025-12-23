import { NextResponse } from "next/server";
import { wooCommerceClient } from "@/lib/woocommerce";
import { requireUser } from "@/lib/server/auth";
import { isFirebaseAdminInitialized } from "@/lib/server/firebaseAdmin";

export async function GET(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const guard = await requireUser(req);
    if (guard instanceof Response) return guard;
    if (guard.role !== 'admin') {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        // 1. Fetch from WooCommerce
        const response = await wooCommerceClient.get(`orders/${id}`);
        const order = response.data;

        // 2. Hydrate with Internal DB (Production Status)
        if (isFirebaseAdminInitialized) {
            try {
                const { adminDb } = await import("@/lib/server/firebaseAdmin");

                // Find internal doc by wcId
                const snap = await adminDb.collection("orders").where("wcId", "==", Number(id)).get(); // woo IDs are numbers

                // Fallback check for string ID if number failed (legacy?)
                let internalOrder = snap.empty ? null : snap.docs[0].data();
                if (!internalOrder && snap.empty) {
                    const snapStr = await adminDb.collection("orders").where("wcId", "==", String(id)).get();
                    internalOrder = snapStr.empty ? null : snapStr.docs[0].data();
                }

                if (internalOrder) {
                    order.status = internalOrder.stage || "Assigned to Vendor";
                    order.internal_stage = internalOrder.stage;
                    order.s3Key = internalOrder.s3Key; // Pass s3Key

                    if (internalOrder.vendorId) {
                        const vDoc = await adminDb.collection("users").doc(internalOrder.vendorId).get();
                        if (vDoc.exists) {
                            order.vendor_name = vDoc.data()?.name || "Unknown";
                        }
                    }
                }
            } catch (dbError) {
                console.error("[woo-orders.id] Failed to sync internal status:", dbError);
            }
        }

        return NextResponse.json(order);

    } catch (error: any) {
        console.error(`[woo-orders.GET ${id}]`, error?.response?.data || error);
        return NextResponse.json({
            message: "Failed to fetch order",
            error: error?.message
        }, { status: 500 });
    }
}

export async function PUT(
    req: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    // Auth Check
    const guard = await requireUser(req);
    if (guard instanceof Response) return guard;
    if (guard.role !== 'admin') {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    let body;
    try {
        body = await req.json();
    } catch (e) {
        return NextResponse.json({ message: "Invalid JSON" }, { status: 400 });
    }

    // Basic validation
    if (!body.meta_data && !body.status) {
        return NextResponse.json({ message: "Nothing to update" }, { status: 400 });
    }

    try {
        // 1. Attempt Update WooCommerce Order
        const response = await wooCommerceClient.put(`orders/${id}`, body);

        // 2. ALWAYS Save to Local JSON (Hybrid Persistence)
        // This ensures that even if WC API is read-only or slow, we keep our voice data.
        try {
            const { saveVoiceData } = require("@/lib/server/localStore");
            saveVoiceData(id, body.meta_data);
        } catch (localSaveError) {
            console.error("[woo-orders.PUT] Warning: Failed to sync local persistence", localSaveError);
        }

        return NextResponse.json({
            success: true,
            message: "Updated in WooCommerce",
            order: response.data
        });

    } catch (error: any) {
        console.warn(`[woo-orders.PUT] WooCommerce update failed for Order ${id}. Attempting Local Fallback.`, error.message);

        // 2. Fallback: Save to Local JSON
        try {
            const { saveVoiceData } = require("@/lib/server/localStore");
            const saved = saveVoiceData(id, body.meta_data);

            if (saved) {
                return NextResponse.json({
                    success: true,
                    message: "Saved to Local Storage Fallback",
                    fallback: true
                });
            }
        } catch (localError: any) {
            console.error("[woo-orders.PUT] Local Fallback failed:", localError);
        }

        return NextResponse.json({
            message: "Failed to update order",
            error: error?.message
        }, { status: 500 });
    }
}

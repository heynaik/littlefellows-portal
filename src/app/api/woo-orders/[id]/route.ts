import { NextResponse } from "next/server";
import { wooCommerceClient } from "@/lib/woocommerce";
import { requireUser } from "@/lib/server/auth";

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

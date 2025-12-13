import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebaseAdmin";
import { wooCommerceClient } from "@/lib/woocommerce";
import type { Order } from "@/lib/types";
import { FieldValue } from "firebase-admin/firestore";

export async function POST(req: Request) {
    const guard = await requireUser(req);
    if (guard instanceof Response) return guard;

    if (!adminDb) {
        return NextResponse.json({ message: "Sync skipped (Dev Mode - No DB)" }, { status: 200 });
    }

    if (guard.role !== "admin") {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
    }

    try {
        // 1. Fetch from WooCommerce
        const { data: wcOrders } = await wooCommerceClient.get("orders", {
            per_page: 20, // Sync last 20 orders
        });

        if (!Array.isArray(wcOrders)) {
            throw new Error("Invalid response from WooCommerce");
        }

        const collection = adminDb.collection("orders");
        let syncedCount = 0;

        // 2. Process each order
        for (const wcOrder of wcOrders) {
            // Check if order already exists by wcId
            const snapshot = await collection.where("wcId", "==", wcOrder.id).limit(1).get();

            const orderData: Partial<Order> = {
                wcId: wcOrder.id,
                orderId: String(wcOrder.id), // Use WC ID as display Order ID
                // Map other fields
                customerName: [wcOrder.billing?.first_name, wcOrder.billing?.last_name].filter(Boolean).join(" "),
                customerEmail: wcOrder.billing?.email,
                totalAmount: wcOrder.total,
                currency: wcOrder.currency,
                wcStatus: wcOrder.status,
                lineItems: wcOrder.line_items?.map((item: any) => ({
                    id: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    total: item.total,
                })),
                updatedAt: Date.now(), // update local timestamp
            };

            // If book title isn't set locally, try to infer from line items?
            // For now, let's join item names if it's a new order
            if (snapshot.empty) {
                orderData.bookTitle = wcOrder.line_items?.map((i: any) => i.name).join(", ") || "Untitled API Order";
                orderData.binding = "Soft"; // Default
                orderData.stage = "Uploaded"; // Default start stage
                orderData.createdAt = Date.now();

                await collection.add(orderData);
            } else {
                // Update existing order (sync status/details but PRESERVE internal fields like stage/binding if they might change locally)
                // Actually, we might want to update customer details if they changed.
                const docId = snapshot.docs[0].id;
                await collection.doc(docId).update(orderData);
            }
            syncedCount++;
        }

        return NextResponse.json({ message: "Sync successful", count: syncedCount }, { status: 200 });

    } catch (error: any) {
        console.error("[orders.sync]", error?.response?.data || error);
        return NextResponse.json({
            message: "Failed to sync orders",
            error: error?.message
        }, { status: 500 });
    }
}

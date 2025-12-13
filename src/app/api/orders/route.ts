// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import type { Order, Stage } from "@/lib/types";
import { requireUser } from "@/lib/server/auth";
import { adminDb, isFirebaseAdminInitialized } from "@/lib/server/firebaseAdmin";
import { wooCommerceClient } from "@/lib/woocommerce";
import { FieldValue, Timestamp } from "firebase-admin/firestore";

type CreateOrderPayload = Partial<Order>;
type UpdateOrderPayload = { id: string; patch: Partial<Order> };
type UpdateStagePayload = { id: string; stage: string };

type RawOrder = {
  id?: string;
  orderId?: string | null;
  bookTitle?: string | null;
  binding?: Order["binding"] | null;
  deadline?: string | null;
  notes?: string | null;
  s3Key?: string | null;
  stage?: Stage | null;
  vendorId?: string | null;
  createdAt?: Timestamp | number | null;
  updatedAt?: Timestamp | number | null;
  wcId?: string | number | null;
};

type UserDoc = {
  email?: string | null;
  vendorId?: string | null;
  vendorCode?: string | null;
  contactEmail?: string | null;
  username?: string | null;
  legacyIds?: string[];
};

async function resolveVendorIdentifiers(uid: string, email?: string | null) {
  const identifiers = new Set<string>();
  const userCollection = adminDb.collection("users");

  identifiers.add(uid);
  if (email) identifiers.add(email);

  let userDoc = await userCollection.doc(uid).get();
  if (!userDoc.exists && email) {
    const byEmail = await userCollection.where("email", "==", email).limit(1).get();
    if (!byEmail.empty) {
      userDoc = byEmail.docs[0];
    }
  }

  if (userDoc.exists) {
    identifiers.add(userDoc.id);
    const data = (userDoc.data() ?? {}) as UserDoc;
    const altKeys: Array<keyof UserDoc> = [
      "vendorId",
      "vendorCode",
      "email",
      "contactEmail",
      "username",
    ];
    for (const key of altKeys) {
      const value = data?.[key];
      if (typeof value === "string" && value.trim()) {
        identifiers.add(value.trim());
      }
    }
    if (Array.isArray(data?.legacyIds)) {
      for (const legacy of data.legacyIds) {
        if (typeof legacy === "string" && legacy.trim()) {
          identifiers.add(legacy.trim());
        }
      }
    }
  }

  return Array.from(identifiers).filter((value) => value.length > 0);
}

function toMillis(value: unknown): number {
  if (typeof value === "number") return value;
  if (value instanceof Timestamp) return value.toMillis();
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis: () => number }).toMillis();
  }
  return Date.now();
}

function normalize(raw: RawOrder): Order {
  return {
    id: raw.id,
    orderId: (raw.orderId ?? "") as string,
    bookTitle: (raw.bookTitle ?? "Untitled") as string,
    binding: (raw.binding ?? "Soft") as Order["binding"],
    deadline: (raw.deadline ?? new Date().toISOString().split("T")[0]) as string,
    notes: raw.notes ?? "",
    s3Key: raw.s3Key ?? null,
    stage: (typeof raw.stage === "string" ? (raw.stage as Stage) : "Uploaded"),
    vendorId: raw.vendorId ?? null,
    createdAt: toMillis(raw.createdAt),
    updatedAt: toMillis(raw.updatedAt),
  };
}

export async function GET(req: Request) {
  const userOrResp = await requireUser(req);
  if (userOrResp instanceof Response) return userOrResp;

  try {
    // FALLBACK: If DB is not initialized, fetch directly from WooCommerce
    if (!isFirebaseAdminInitialized) {
      const { uid, role, email } = userOrResp;

      const { data: wcOrders } = await wooCommerceClient.get("orders", { per_page: 50 });
      let fallbackOrders: Order[] = wcOrders.map((o: any) => ({
        id: "fallback-" + o.id,
        orderId: String(o.id),
        bookTitle: o.line_items?.map((i: any) => i.name).join(", ") || "Untitled",
        binding: "Soft",
        deadline: new Date().toISOString().split("T")[0],
        notes: "Dev Mode: Direct from Woo",
        s3Key: null,
        stage: "Uploaded",
        vendorId: null,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        // Woo Fields
        wcId: o.id,
        customerName: [o.billing?.first_name, o.billing?.last_name].filter(Boolean).join(" "),
        customerEmail: o.billing?.email,
        totalAmount: o.total,
        currency: o.currency,
        wcStatus: o.status,
      }));

      // Apply Filter for Vendor in Dev Mode
      if (role !== "admin") {
        // In real logic we resolve identifiers. In dev fallback, we'll just check exact match or email.
        // Since fallback defaults vendorId to null, this effectively hides everything unless we mock assignment.
        // This is desired: "why see info without assigning?" -> now you won't.
        fallbackOrders = fallbackOrders.filter(o =>
          o.vendorId === uid || o.vendorId === email
        );
      }

      return NextResponse.json(fallbackOrders, { status: 200 });
    }

    const { uid, role, email } = userOrResp;
    const col = adminDb.collection("orders");
    let orders: Order[] = [];

    if (role === "admin") {
      const snap = await col.orderBy("updatedAt", "desc").get();
      orders = snap.docs.map((d: any) => normalize({ id: d.id, ...d.data() } as RawOrder));
    } else {
      const identifierList = await resolveVendorIdentifiers(uid, email);
      if (process.env.NODE_ENV !== "production") {
        console.log("[orders.GET] vendor identifiers", {
          uid,
          email,
          identifiers: identifierList,
        });
      }
      const snapshots = await Promise.all(
        identifierList.map((identifier) =>
          col.where("vendorId", "==", identifier).get()
        )
      );

      const merged = new Map<string, RawOrder>();
      for (const snap of snapshots) {
        snap.docs.forEach((doc: any) => {
          merged.set(doc.id, { id: doc.id, ...doc.data() } as RawOrder);
        });
      }

      orders = Array.from(merged.values()).map((raw) => normalize(raw));
      orders.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0));
      if (process.env.NODE_ENV !== "production") {
        const totalDocs = snapshots.reduce((sum, snap) => sum + snap.size, 0);
        console.log("[orders.GET] vendor matches", {
          uid,
          totalDocs,
          uniqueOrders: orders.length,
        });
      }
    }

    return NextResponse.json(orders, { status: 200 });
  } catch (error: any) {
    console.error("[orders.GET]", error);
    return NextResponse.json({ message: "Failed to fetch orders", error: error.message }, { status: 500 });
  }
}



export async function POST(req: Request) {
  // DEV FALLBACK
  if (!isFirebaseAdminInitialized) {
    console.warn("[API] POST Orders: Dev Mode (No DB). Mocking success.");
    const body = (await req.json()) as CreateOrderPayload;
    const mockOrder: RawOrder = {
      id: "mock-id-" + Date.now(),
      orderId: body.orderId || "MOCK-ORDER",
      bookTitle: body.bookTitle || "Mock Title",
      binding: body.binding || "Soft",
      deadline: body.deadline || new Date().toISOString().split("T")[0],
      notes: body.notes || "",
      s3Key: body.s3Key || null,
      stage: body.stage || "Uploaded",
      vendorId: body.vendorId || null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      wcId: body.wcId, // CRITICAL for linking
    };

    // Persist to local store
    try {
      const { saveMockOrder } = require("@/lib/server/localStore");
      saveMockOrder(mockOrder);
    } catch (e) { console.error("Mock save failed", e); }

    return NextResponse.json(normalize(mockOrder), { status: 201 });
  }

  const guard = await requireUser(req);
  if (guard instanceof Response) return guard;
  if (guard.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const body = (await req.json()) as CreateOrderPayload;
    const payload = {
      orderId: body.orderId ?? "",
      bookTitle: body.bookTitle ?? "Untitled",
      binding: body.binding ?? "Soft",
      deadline: body.deadline ?? new Date().toISOString().split("T")[0],
      notes: body.notes ?? "",
      s3Key: body.s3Key ?? null,
      stage: body.stage ?? "Uploaded",
      vendorId: body.vendorId ?? null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      wcId: body.wcId, // Store Woo ID
      wcStatus: body.wcStatus,
      customerName: body.customerName,
      customerEmail: body.customerEmail,
      totalAmount: body.totalAmount,
      currency: body.currency,
      lineItems: body.lineItems,
    };

    const ref = await adminDb.collection("orders").add(payload);
    const saved = await ref.get();
    return NextResponse.json(normalize({ id: ref.id, ...saved.data() } as RawOrder), { status: 201 });
  } catch (error) {
    console.error("[orders.POST]", error);
    return NextResponse.json({ message: "Failed to create order" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  // DEV FALLBACK
  if (!isFirebaseAdminInitialized) {
    console.warn("[API] PUT Orders: Dev Mode. Mocking success.");
    const { id, patch } = (await req.json()) as UpdateOrderPayload;

    try {
      const { saveMockOrder } = require("@/lib/server/localStore");
      saveMockOrder({ id, ...patch, updatedAt: Date.now() });
    } catch (e) { console.error("Mock save failed", e); }

    return NextResponse.json({ ...patch, id, updatedAt: Date.now() }, { status: 200 });
  }

  const guard = await requireUser(req);
  if (guard instanceof Response) return guard;
  if (guard.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const { id, patch } = (await req.json()) as UpdateOrderPayload;
    if (!id) {
      return NextResponse.json({ message: "id required" }, { status: 400 });
    }

    const ref = adminDb.collection("orders").doc(id);
    await ref.update({ ...patch, updatedAt: FieldValue.serverTimestamp() });
    const snap = await ref.get();
    return NextResponse.json(normalize({ id, ...snap.data() } as RawOrder), { status: 200 });
  } catch (error) {
    console.error("[orders.PUT]", error);
    return NextResponse.json({ message: "Failed to update order" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  // DEV FALLBACK
  if (!isFirebaseAdminInitialized) {
    console.warn("[API] PATCH Orders: Dev Mode. Mocking success.");
    const { id, stage } = (await req.json()) as UpdateStagePayload;

    try {
      const { saveMockOrder } = require("@/lib/server/localStore");
      saveMockOrder({ id, stage, updatedAt: Date.now() });
    } catch (e) { console.error("Mock save failed", e); }

    return NextResponse.json({ id, stage, updatedAt: Date.now() }, { status: 200 });
  }

  const guard = await requireUser(req);
  if (guard instanceof Response) return guard;

  try {
    const { id, stage } = (await req.json()) as UpdateStagePayload;
    if (!id) {
      return NextResponse.json({ message: "id required" }, { status: 400 });
    }

    const ref = adminDb.collection("orders").doc(id);
    const snap = await ref.get();
    const data = snap.data() as RawOrder | undefined;

    if (!snap.exists) {
      return NextResponse.json({ message: "Not found" }, { status: 404 });
    }

    if (guard.role !== "admin") {
      const identifiers = await resolveVendorIdentifiers(guard.uid, guard.email ?? null);
      const assigned = typeof data?.vendorId === "string" ? data.vendorId.trim() : "";
      if (!assigned || !identifiers.includes(assigned)) {
        return NextResponse.json({ message: "Forbidden" }, { status: 403 });
      }
    }

    await ref.update({ stage, updatedAt: FieldValue.serverTimestamp() });
    const updated = await ref.get();
    return NextResponse.json(normalize({ id, ...updated.data() } as RawOrder), { status: 200 });
  } catch (error) {
    console.error("[orders.PATCH]", error);
    return NextResponse.json({ message: "Failed to update stage" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  // DEV FALLBACK
  if (!isFirebaseAdminInitialized) {
    console.warn("[API] DELETE Orders: Dev Mode. Mocking success.");
    return new NextResponse(null, { status: 204 });
  }

  const guard = await requireUser(req);
  if (guard instanceof Response) return guard;
  if (guard.role !== "admin") {
    return NextResponse.json({ message: "Forbidden" }, { status: 403 });
  }

  try {
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) {
      return NextResponse.json({ message: "id required" }, { status: 400 });
    }

    await adminDb.collection("orders").doc(id).delete();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("[orders.DELETE]", error);
    return NextResponse.json({ message: "Failed to delete order" }, { status: 500 });
  }
}

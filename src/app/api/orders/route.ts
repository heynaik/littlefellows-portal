// src/app/api/orders/route.ts
import { NextResponse } from "next/server";
import type { Order, Stage } from "@/lib/types";
import { requireUser } from "@/lib/server/auth";
import { adminDb } from "@/lib/server/firebaseAdmin";
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
  const { uid, role, email } = userOrResp;

  try {
    const col = adminDb.collection("orders");
    let orders: Order[] = [];

    if (role === "admin") {
      const snap = await col.orderBy("updatedAt", "desc").get();
      orders = snap.docs.map((d) => normalize({ id: d.id, ...d.data() } as RawOrder));
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
        snap.docs.forEach((doc) => {
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
  } catch (error) {
    console.error("[orders.GET]", error);
    return NextResponse.json({ message: "Failed to fetch orders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
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

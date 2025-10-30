// src/app/api/admin/stats/route.ts
import { NextResponse } from "next/server";
import { db } from "@/lib/firebase";
import { collection, getDocs, Timestamp } from "firebase/firestore";
import type { Stage } from "@/lib/types";
import { requireAdmin } from "@/lib/server/auth";

function isToday(ts: number) {
  const d = new Date(ts);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
}

function daysUntil(dateStr: string) {
  const today = new Date();
  const d = new Date(dateStr + "T00:00:00");
  const diff = Math.ceil((d.getTime() - new Date(today.toDateString()).getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard instanceof Response) return guard;
  const snap = await getDocs(collection(db, "orders"));

  type FirestoreOrderDoc = {
    createdAt?: number | Timestamp;
    deadline?: string;
    s3Key?: string | null;
    stage?: Stage;
  };

  const items = snap.docs.map((doc) => {
    const data = doc.data() as FirestoreOrderDoc;
    return { id: doc.id, ...data };
  });

  const byStage: Record<Stage, number> = {
    Uploaded: 0,
    "Assigned to Vendor": 0,
    Printing: 0,
    "Quality Check": 0,
    Packed: 0,
    "Shipped to Admin": 0,
    "Received by Admin": 0,
    "Final Packed for Customer": 0,
    "Shipped to Customer": 0,
    Delivered: 0,
  } as Record<Stage, number>;

  let newToday = 0;
  let dueSoon = 0; // within next 3 days
  let missingPdfs = 0;

  for (const o of items) {
    const createdAtValue = o.createdAt;
    const createdAt =
      typeof createdAtValue === "number"
        ? createdAtValue
        : createdAtValue instanceof Timestamp
        ? createdAtValue.toMillis()
        : Date.now();
    const stage = (o.stage ?? "Uploaded") as Stage;
    byStage[stage] = (byStage[stage] ?? 0) + 1;
    if (isToday(createdAt)) newToday += 1;
    if (!o.s3Key) missingPdfs += 1;
    const du = daysUntil(o.deadline ?? "");
    if (!Number.isNaN(du) && du >= 0 && du <= 3) dueSoon += 1;
  }

  const result = {
    newToday,
    dueSoon,
    missingPdfs,
    byStage,
    total: items.length,
  };
  return NextResponse.json(result, { status: 200 });
}

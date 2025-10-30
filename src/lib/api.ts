// src/lib/api.ts
import type { Order } from '@/lib/types';

type ReqInit = RequestInit & { parse?: "json" | "text" | "void" };

import { auth } from '@/lib/firebase';
import { getIdToken } from 'firebase/auth';

async function req<T = unknown>(path: string, init?: ReqInit): Promise<T> {
  const parse = init?.parse ?? "json";
  let authHeader: Record<string, string> = {};
  try {
    const u = auth.currentUser;
    if (u) {
      const tok = await getIdToken(u, true);
      authHeader = { Authorization: `Bearer ${tok}` };
    }
  } catch {}
  const res = await fetch(path, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...authHeader,
      ...(init?.headers || {}),
    },
    cache: "no-store",
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => "");
    throw new Error(`[API ${res.status}] ${path}: ${msg || res.statusText}`);
  }
  if (parse === "json") return (await res.json()) as T;
  if (parse === "text") return (await res.text()) as T;
  // parse === "void"
  return undefined as unknown as T;
}

/* ---------- Orders ---------- */
export function getOrders() {
  return req<Order[]>("/api/orders");
}

export function createOrder(body: Partial<Order>) {
  return req<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

/** Used by Edit modal */
export function updateOrder(id: string, patch: Partial<Order>) {
  return req<Order>("/api/orders", {
    method: "PUT",
    body: JSON.stringify({ id, patch }),
  });
}

export function deleteOrder(id: string) {
  return req<void>("/api/orders?id=" + encodeURIComponent(id), {
    method: "DELETE",
    parse: "void",
  });
}

/** Optional: change just the stage dropdown */
export function changeStage(id: string, stage: string) {
  return req<Order>("/api/orders", {
    method: "PATCH",
    body: JSON.stringify({ id, stage }),
  });
}

/* ---------- Files (S3) ---------- */
export function getUploadUrl(fileName: string, contentType: string) {
  const qs = new URLSearchParams({ fileName, contentType }).toString();
  return req<{ url: string; key: string }>(`/api/upload-url?${qs}`);
}

/** Link used for “View / Download PDF” */
export function previewHref(key: string) {
  // Go through signed redirect so it works with private buckets
  return `/api/view-url?key=${encodeURIComponent(key)}`;
}

/* ---------- Admin Stats ---------- */
export type AdminStats = {
  newToday: number;
  dueSoon: number;
  missingPdfs: number;
  total: number;
  byStage: Record<string, number>;
};

export function getAdminStats() {
  return req<AdminStats>("/api/admin/stats");
}

/* ---------- Vendors (admin) ---------- */
export type Vendor = {
  vendorId: string;
  name: string;
  contactEmail?: string;
  active?: boolean;
};

export function getVendors() {
  return req<Vendor[]>("/api/admin/vendors");
}

// src/app/api/admin/vendors/route.ts
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb, isFirebaseAdminInitialized } from '@/lib/server/firebaseAdmin';

export async function GET(req: Request) {
  // Check for Dev Mode / Fallback first
  if (!isFirebaseAdminInitialized) {
    console.warn("[API] Vendors: Firebase Admin not initialized. Returning dummy vendors.");
    return NextResponse.json([
      { vendorId: "v-test-01", name: "Test Vendor (Dev)", contactEmail: "vendor@test.com", active: true },
      { vendorId: "v-print-02", name: "Fast Prints Co.", contactEmail: "prints@fast.com", active: true }
    ], { status: 200 });
  }

  const guard = await requireAdmin(req);
  if (guard instanceof Response) return guard;

  try {
    const snap = await adminDb.collection('users').where('role', '==', 'vendor').get();
    const vendors = snap.docs.map((d: any) => ({
      vendorId: d.id,
      name: d.data().name || d.data().email || d.id,
      contactEmail: d.data().email || '',
      active: d.data().active ?? true,
    }));
    return NextResponse.json(vendors, { status: 200 });
  } catch (error) {
    console.error("[API] Failed to fetch vendors:", error);
    // Fallback on error too, or return empty
    return NextResponse.json([], { status: 200 });
  }
}


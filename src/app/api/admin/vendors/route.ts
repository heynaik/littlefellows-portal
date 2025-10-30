// src/app/api/admin/vendors/route.ts
import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/server/auth';
import { adminDb } from '@/lib/server/firebaseAdmin';

export async function GET(req: Request) {
  const guard = await requireAdmin(req);
  if (guard instanceof Response) return guard;
  const snap = await adminDb.collection('users').where('role', '==', 'vendor').get();
  const vendors = snap.docs.map((d) => ({
    vendorId: d.id,
    name: d.data().name || d.data().email || d.id,
    contactEmail: d.data().email || '',
    active: d.data().active ?? true,
  }));
  return NextResponse.json(vendors, { status: 200 });
}


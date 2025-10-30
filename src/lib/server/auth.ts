// src/lib/server/auth.ts
import { NextResponse } from 'next/server';
import { adminAuth, adminDb } from './firebaseAdmin';

export type ServerUser = {
  uid: string;
  role: 'admin' | 'vendor';
  email?: string | null;
};

export async function getUserFromRequest(req: Request): Promise<ServerUser | null> {
  const authz = req.headers.get('authorization') || req.headers.get('Authorization');
  const token = authz?.startsWith('Bearer ') ? authz.slice(7) : null;
  if (!token) return null;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    const uid = decoded.uid;
    const email = decoded.email ?? null;
    const snap = await adminDb.collection('users').doc(uid).get();
    const role = (snap.exists && (snap.data()?.role as 'admin' | 'vendor')) || 'vendor';
    const fallbackEmail = snap.exists ? (snap.data()?.email as string | undefined) ?? null : null;
    return { uid, role, email: email ?? fallbackEmail };
  } catch {
    return null;
  }
}

export async function requireAdmin(req: Request): Promise<ServerUser | NextResponse> {
  const user = await getUserFromRequest(req);
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ message: 'Forbidden' }, { status: 403 });
  }
  return user;
}

export async function requireUser(req: Request): Promise<ServerUser | NextResponse> {
  const user = await getUserFromRequest(req);
  if (!user) return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
  return user;
}

// src/lib/server/firebaseAdmin.ts
import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

function getPrivateKey() {
  const raw = process.env.FIREBASE_PRIVATE_KEY || '';
  const replaced = raw.replace(/\\n/g, '\n');
  if (replaced.startsWith('"') && replaced.endsWith('"')) {
    return replaced.slice(1, -1);
  }
  return replaced;
}

function assertEnv(name: string, value: string | undefined) {
  if (!value || value.trim() === '') {
    throw new Error(`[Firebase Admin] Missing required env: ${name}`);
  }
}

function buildCredential() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = getPrivateKey();

  console.log('[firebaseAdmin] env summary', {
    projectId,
    clientEmail,
    privateKeyPresent: !!privateKey,
    privateKeyLength: privateKey?.length ?? 0,
    keys: Object.keys(process.env).filter((key) => key.includes('FIREBASE')),
  });

  assertEnv('FIREBASE_PROJECT_ID', projectId);
  assertEnv('FIREBASE_CLIENT_EMAIL', clientEmail);
  assertEnv('FIREBASE_PRIVATE_KEY', privateKey);
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error(
      '[Firebase Admin] FIREBASE_PRIVATE_KEY appears malformed (missing BEGIN PRIVATE KEY). Ensure literal \\n newlines or proper quoting.'
    );
  }
  return { projectId, clientEmail, privateKey } as {
    projectId: string;
    clientEmail: string;
    privateKey: string;
  };
}

export const adminApp = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(buildCredential()),
    });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

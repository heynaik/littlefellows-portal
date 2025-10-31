// src/lib/server/firebaseAdmin.ts
import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

type AdminCredential = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function stripWrappingQuotes(value: string) {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

function decodeIfBase64(raw: string): string | null {
  const sanitized = raw.replace(/\s+/g, '');
  if (!sanitized || sanitized.length % 4 !== 0) return null;
  if (!/^[a-zA-Z0-9+/=]+$/.test(sanitized)) return null;
  try {
    return Buffer.from(sanitized, 'base64').toString('utf8');
  } catch {
    return null;
  }
}

function normalizePrivateKey(raw?: string | null) {
  if (!raw) return '';
  let value = raw.trim();
  if (!value) return '';

  const decoded = decodeIfBase64(value);
  if (decoded && decoded.includes('BEGIN PRIVATE KEY')) {
    value = decoded.trim();
  }

  value = stripWrappingQuotes(value);
  value = value.replace(/\\r/g, '\r').replace(/\\n/g, '\n').trim();
  return value;
}

function tryParseServiceAccount(raw?: string | null): AdminCredential | null {
  if (!raw) return null;
  let text = raw.trim();
  if (!text) return null;

  const decoded = decodeIfBase64(text);
  if (decoded) {
    text = decoded.trim();
  }

  text = stripWrappingQuotes(text);

  try {
    const json = JSON.parse(text) as {
      project_id?: string;
      projectId?: string;
      client_email?: string;
      clientEmail?: string;
      private_key?: string;
      privateKey?: string;
    };
    const projectId = json.project_id ?? json.projectId ?? '';
    const clientEmail = json.client_email ?? json.clientEmail ?? '';
    const privateKey = normalizePrivateKey(json.private_key ?? json.privateKey ?? '');
    if (projectId && clientEmail && privateKey) {
      return { projectId, clientEmail, privateKey };
    }
  } catch {
    // ignore parse failure
  }
  return null;
}

function requireEnv(name: string, value: string | undefined | null) {
  if (!value || value.trim() === '') {
    throw new Error(`[Firebase Admin] Missing required env: ${name}`);
  }
  return value.trim();
}

function buildCredential(): AdminCredential {
  const jsonSource =
    tryParseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT) ??
    tryParseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_JSON) ??
    tryParseServiceAccount(process.env.FIREBASE_SERVICE_ACCOUNT_BASE64) ??
    tryParseServiceAccount(process.env.FIREBASE_ADMIN_CREDENTIALS) ??
    tryParseServiceAccount(process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON);

  if (jsonSource) {
    const normalized: AdminCredential = {
      projectId: requireEnv('FIREBASE_PROJECT_ID (service account)', jsonSource.projectId),
      clientEmail: requireEnv('FIREBASE_CLIENT_EMAIL (service account)', jsonSource.clientEmail),
      privateKey: normalizePrivateKey(jsonSource.privateKey),
    };

    console.log('[firebaseAdmin] env summary', {
      projectId: normalized.projectId,
      clientEmail: normalized.clientEmail,
      privateKeyPresent: normalized.privateKey.length > 0,
      privateKeyLength: normalized.privateKey.length,
      source: 'service-account-json',
      keys: Object.keys(process.env).filter((key) => key.includes('FIREBASE')),
    });

    if (!normalized.privateKey.includes('BEGIN PRIVATE KEY')) {
      throw new Error(
        '[Firebase Admin] Service account private key appears malformed (missing BEGIN PRIVATE KEY).'
      );
    }

    return normalized;
  }

  const projectId = requireEnv(
    'FIREBASE_PROJECT_ID',
    process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID
  );
  const clientEmail = requireEnv('FIREBASE_CLIENT_EMAIL', process.env.FIREBASE_CLIENT_EMAIL);

  const privateKeyCandidates = [
    process.env.FIREBASE_PRIVATE_KEY,
    process.env.FIREBASE_PRIVATE_KEY_BASE64,
    process.env.FIREBASE_ADMIN_PRIVATE_KEY,
  ];
  let privateKey = '';
  for (const candidate of privateKeyCandidates) {
    const normalized = normalizePrivateKey(candidate);
    if (normalized) {
      privateKey = normalized;
      break;
    }
  }
  privateKey = requireEnv('FIREBASE_PRIVATE_KEY', privateKey);

  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    throw new Error(
      '[Firebase Admin] FIREBASE_PRIVATE_KEY appears malformed (missing BEGIN PRIVATE KEY). Ensure literal \\n newlines, proper quoting, or provide the key via FIREBASE_PRIVATE_KEY_BASE64.'
    );
  }

  const summary = {
    projectId,
    clientEmail,
    privateKeyPresent: privateKey.length > 0,
    privateKeyLength: privateKey.length,
    source: 'split-env',
    keys: Object.keys(process.env).filter((key) => key.includes('FIREBASE')),
  };
  console.log('[firebaseAdmin] env summary', summary);

  return { projectId, clientEmail, privateKey };
}

export const adminApp = getApps().length
  ? getApp()
  : initializeApp({
      credential: cert(buildCredential()),
    });

export const adminAuth = getAuth(adminApp);
export const adminDb = getFirestore(adminApp);

// server-only S3 utils
import 'server-only';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET;
const REGION = process.env.S3_REGION;
const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID;
const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY;

export const isS3Configured = Boolean(BUCKET && REGION && ACCESS_KEY && SECRET_KEY);

// Create client lazily or safely
export const s3 = isS3Configured ? new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: ACCESS_KEY || "",
    secretAccessKey: SECRET_KEY || "",
  },
}) : null;

export function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function presignPutUrl(key: string, contentType: string) {
  if (!s3 || !BUCKET) throw new Error("S3 is not configured");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
  return url;
}

export async function putJson<T>(key: string, data: T) {
  if (!s3 || !BUCKET) throw new Error("S3 is not configured");
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: "application/json",
    Body: JSON.stringify(data),
  });
  await s3.send(cmd);
}

export async function listKeys(prefix: string) {
  if (!s3 || !BUCKET) return [];
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix });
  const r = await s3.send(cmd);
  return (r.Contents || []).map((o) => o.Key!).filter(Boolean);
}

export async function getJson<T>(key: string): Promise<T | null> {
  if (!s3 || !BUCKET) return null;
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const r = await s3.send(cmd);
  const body = await r.Body?.transformToString();
  if (!body) return null;
  return JSON.parse(body) as T;
}

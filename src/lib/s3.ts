// server-only S3 utils
import 'server-only';
import { S3Client, PutObjectCommand, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET!;
const REGION = process.env.AWS_REGION!;

if (!BUCKET || !REGION) {
  throw new Error("S3_BUCKET and AWS_REGION must be set in .env.local");
}

export const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export function sanitizeFileName(name: string) {
  return name.replace(/[^\w.\-]+/g, "_");
}

export async function presignPutUrl(key: string, contentType: string) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const url = await getSignedUrl(s3, cmd, { expiresIn: 3600 });
  return url;
}

export async function putJson<T>(key: string, data: T) {
  const cmd = new PutObjectCommand({
    Bucket: BUCKET,
    Key: key,
    ContentType: "application/json",
    Body: JSON.stringify(data),
  });
  await s3.send(cmd);
}

export async function listKeys(prefix: string) {
  const cmd = new ListObjectsV2Command({ Bucket: BUCKET, Prefix: prefix });
  const r = await s3.send(cmd);
  return (r.Contents || []).map((o) => o.Key!).filter(Boolean);
}

export async function getJson<T>(key: string): Promise<T | null> {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  const r = await s3.send(cmd);
  const body = await r.Body?.transformToString();
  if (!body) return null;
  return JSON.parse(body) as T;
}

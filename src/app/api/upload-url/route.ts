import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const BUCKET = process.env.S3_BUCKET || process.env.BUCKET_NAME;
const REGION = process.env.AWS_REGION;

if (!BUCKET || !REGION) {
  throw new Error("S3_BUCKET and AWS_REGION must be set in .env.local");
}

const s3 = new S3Client({
  region: REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID as string,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY as string,
  },
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const rawName = searchParams.get("fileName") || "upload.pdf";
    const contentType = searchParams.get("contentType") || "application/pdf";

    const ts = Date.now();
    const safeName = rawName.replace(/\s+/g, "-");
    const key = `orders/${ts}-${safeName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      ContentType: contentType,
    });

    const url = await getSignedUrl(s3, command, { expiresIn: 60 }); // seconds

    return NextResponse.json({ url, key });
  } catch (error) {
    console.error("upload-url error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to create upload URL";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

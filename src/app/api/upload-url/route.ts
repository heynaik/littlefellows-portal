import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 Client lazily or check in handler
const BUCKET = process.env.S3_BUCKET || process.env.BUCKET_NAME;
const REGION = process.env.S3_REGION || process.env.AWS_REGION;
const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID || process.env.AWS_ACCESS_KEY_ID;
const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY || process.env.AWS_SECRET_ACCESS_KEY;

// We do not throw here to avoid crashing the server on boot


export async function GET(req: Request) {
  try {
    if (!BUCKET || !REGION || !ACCESS_KEY || !SECRET_KEY) {
      // FALLBACK: Use Local Upload if S3 is not configured
      const { searchParams } = new URL(req.url);
      const rawName = searchParams.get("fileName") || "upload.bin";
      const safeName = rawName.replace(/\s+/g, "-");
      const ts = Date.now();
      const finalName = `${ts}-${safeName}`;

      // Return a URL that points to our local upload API
      // Front-end will PUT to this URL
      const origin = new URL(req.url).origin;
      const uploadUrl = `${origin}/api/local-upload?filename=${finalName}`;

      return NextResponse.json({
        url: uploadUrl,
        key: `local/${finalName}`,
        isLocal: true
      });
    }

    const s3 = new S3Client({
      region: REGION,
      credentials: {
        accessKeyId: ACCESS_KEY,
        secretAccessKey: SECRET_KEY,
      },
    });

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

    // Log config status (masked)
    console.log("Config Check:", {
      bucket: !!BUCKET,
      region: !!REGION,
      accessKey: !!ACCESS_KEY,
      secret: !!SECRET_KEY
    });

    const message =
      error instanceof Error ? error.message : "Failed to create upload URL";
    return NextResponse.json({ error: message, details: JSON.stringify(error) }, { status: 500 });
  }
}

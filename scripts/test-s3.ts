// Inline minimal S3 logic to avoid module resolution issues in script
import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function testS3() {
    console.log("Checking Environment...");
    const BUCKET = process.env.S3_BUCKET;
    const REGION = process.env.S3_REGION;
    const ACCESS_KEY = process.env.S3_ACCESS_KEY_ID;
    const SECRET_KEY = process.env.S3_SECRET_ACCESS_KEY;

    console.log("S3_BUCKET:", BUCKET ? "SET" : "MISSING");
    console.log("S3_REGION:", REGION ? "SET" : "MISSING");
    console.log("S3_ACCESS_KEY_ID:", ACCESS_KEY ? "SET" : "MISSING");
    console.log("S3_SECRET_ACCESS_KEY:", SECRET_KEY ? "SET" : "MISSING");

    if (!BUCKET || !REGION || !ACCESS_KEY || !SECRET_KEY) {
        console.error("❌ Missing S3 Environment Variables.");
        return;
    }

    const s3 = new S3Client({
        region: REGION,
        credentials: {
            accessKeyId: ACCESS_KEY,
            secretAccessKey: SECRET_KEY,
        },
    });

    try {
        console.log("Attempting to write test JSON...");
        const putCmd = new PutObjectCommand({
            Bucket: BUCKET,
            Key: "test-s3-connectivity.json",
            ContentType: "application/json",
            Body: JSON.stringify({ message: "Hello from S3 Test", timestamp: new Date().toISOString() }),
        });
        await s3.send(putCmd);
        console.log("✅ Write Successful.");

        console.log("Attempting to read test JSON...");
        const getCmd = new GetObjectCommand({ Bucket: BUCKET, Key: "test-s3-connectivity.json" });
        const r = await s3.send(getCmd);
        const body = await r.Body?.transformToString();
        console.log("✅ Read Successful:", body);

    } catch (error: any) {
        console.error("❌ S3 Operation Failed:", error);
    }
}

testS3();

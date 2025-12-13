import { isS3Configured } from "../src/lib/s3";

console.log("isS3Configured:", isS3Configured);
console.log("Env vars:", {
    BUCKET: !!process.env.S3_BUCKET,
    REGION: !!process.env.S3_REGION,
    KEY: !!process.env.S3_ACCESS_KEY_ID,
    SECRET: !!process.env.S3_SECRET_ACCESS_KEY
});

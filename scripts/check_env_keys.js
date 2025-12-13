const fs = require('fs');
const path = require('path');

const envPath = path.resolve(process.cwd(), '.env.local');

try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    console.log("Checking .env.local keys...");
    const keys = ['S3_BUCKET', 'BUCKET_NAME', 'S3_REGION', 'AWS_REGION', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY'];

    keys.forEach(key => {
        const regex = new RegExp(`^${key}=`, 'm');
        const exists = regex.test(envFile);
        console.log(`${key}: ${exists ? "SET" : "MISSING"}`);
    });

    // Also check if any content exists
    console.log("File length:", envFile.length);

} catch (e) {
    console.error("Could not read .env.local:", e.message);
}

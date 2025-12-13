
import fs from 'fs';
import path from 'path';

async function testZip() {
    console.log("Testing ZIP generation...");
    const payload = {
        filename: "test-archive",
        urls: [
            { url: "https://via.placeholder.com/150", name: "test-image-1.png" },
            { url: "https://via.placeholder.com/200", name: "test-image-2.png" }
        ]
    };

    try {
        const res = await fetch('http://localhost:3000/api/download-zip', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!res.ok) {
            console.error("API Error:", res.status, res.statusText);
            const text = await res.text();
            console.error("Body:", text);
            return;
        }

        const buffer = await res.arrayBuffer();
        const filePath = path.join(process.cwd(), 'test-output.zip');
        fs.writeFileSync(filePath, Buffer.from(buffer));

        console.log(`Saved ZIP to ${filePath} (${buffer.byteLength} bytes)`);
        console.log("Try running 'unzip -t test-output.zip' to verify integrity.");

    } catch (err) {
        console.error("Test Failed:", err);
    }
}

testZip();

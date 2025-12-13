async function testUpload() {
    const url = 'http://localhost:3000/api/local-upload?filename=test-upload.txt';

    console.log("1. Testing Local Upload PUT...");

    const content = "Hello World Content";

    try {
        const res = await fetch(url, {
            method: "PUT",
            body: content
        });

        if (!res.ok) {
            console.error("Upload failed:", res.status, await res.text());
            return;
        }

        const json = await res.json();
        console.log("Response:", json);

        if (json.success === true && json.path === "/uploads/test-upload.txt") {
            console.log("✅ SUCCESS: Upload API returned correct path.");
        } else {
            console.error("❌ FAILURE: Unexpected response format.");
        }

    } catch (err) {
        console.error("Test failed:", err);
    }
}

testUpload();

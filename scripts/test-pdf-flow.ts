
import { spawn } from 'child_process';

const BASE_URL = 'http://localhost:3000';

async function run() {
    console.log("1. Creating Mock Order...");
    const orderId = "TEST-PDF-" + Date.now();

    // 1. Create Order (Simulate Woo Order existing)
    // We can't easily simulate Woo webhooks, but we can use our internal POST to create the record
    const createRes = await fetch(`${BASE_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            orderId: orderId,
            wcId: 999999, // Mock Woo ID
            bookTitle: "Test Book",
            s3Key: "production/test-file.pdf",
            stage: "Assigned to Vendor",
            vendorId: "v-test-01"
        })
    });

    if (!createRes.ok) {
        console.error("Failed to create order:", await createRes.text());
        return;
    }
    const order = await createRes.json();
    console.log("Order Created:", order.id, order.s3Key);

    if (order.s3Key !== "production/test-file.pdf") {
        console.error("❌ s3Key mismatch in creation response");
    } else {
        console.log("✅ s3Key saved correctly");
    }

    // 2. Fetch Woo Orders (This mimics the frontend call)
    // Note: This mocked endpoint might not return our manually created internal order unless we mock the Woo response too.
    // BUT, in my current implementation, I check `isFirebaseAdminInitialized`.
    // If I am running against the real dev server (which uses localStore fallback if firebase fails, or firebase if active).

    // Let's test the `view-url` endpoint directly with the key we saved.
    console.log("\n2. Testing View URL Generation...");
    const viewUrlRes = await fetch(`${BASE_URL}/api/view-url?key=${encodeURIComponent(order.s3Key)}`, {
        redirect: 'manual'
    });

    // We expect a 302 redirect or a signed URL if we changed logic. My code does `NextResponse.redirect`.
    // So fetch with `redirect: manual` should give us opaqueredirect or status 302/307.
    console.log("View URL Status:", viewUrlRes.status);

    if (viewUrlRes.status === 302 || viewUrlRes.status === 307 || viewUrlRes.type === 'opaqueredirect') {
        console.log("✅ View URL endpoint is redirecting (Signed URL generated)");
        const location = viewUrlRes.headers.get('location');
        console.log("Redirect Location (Partial):", location ? location.substring(0, 50) + "..." : "N/A");
    } else if (viewUrlRes.status === 200) {
        // Maybe it returned JSON?
        const json = await viewUrlRes.json();
        console.log("Response:", json);
    } else {
        console.error("❌ View URL failed", await viewUrlRes.text());
    }

    console.log("\nDone.");
}

run().catch(console.error);

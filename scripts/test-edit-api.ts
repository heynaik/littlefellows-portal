import { fetch } from 'undici';

async function testEditFlow() {
    const baseUrl = 'http://localhost:3000/api/stories';
    console.log("1. Creating Story...");

    const newStory = {
        title: "API Edit Test",
        description: "Original Description",
        character: "Bot",
        genre: "Test",
        ageRange: "5",
        idealFor: "Testing",
        pageCount: 1,
        pages: [{ title: "P1", content: "Original content" }]
    };

    const createRes = await fetch(baseUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newStory)
    });

    if (!createRes.ok) {
        console.error("Create failed:", await createRes.text());
        return;
    }

    const created: any = await createRes.json();
    const id = created.id;
    console.log("   Created ID:", id);

    console.log("2. Updating Story (PUT)...");
    const updatePayload = {
        ...created,
        title: "API Edit Test UPDATED",
        description: "Updated Description"
    };

    const updateRes = await fetch(`${baseUrl}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
        console.error("Update failed:", await updateRes.text());
        return;
    }
    console.log("   Update success.");

    console.log("3. Verifying Update (GET)...");
    const getRes = await fetch(`${baseUrl}/${id}`);
    const fetched: any = await getRes.json();

    if (fetched.title === "API Edit Test UPDATED") {
        console.log("✅ SUCCESS: Title updated correctly.");
    } else {
        console.error("❌ FAILURE: Title mismatch.", fetched.title);
    }

    if (fetched.description === "Updated Description") {
        console.log("✅ SUCCESS: Description updated correctly.");
    } else {
        console.error("❌ FAILURE: Description mismatch.");
    }
}

testEditFlow();

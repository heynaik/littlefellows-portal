async function verifyDelete() {
    // 1. Create a dummy story
    console.log("Creating dummy story...");
    const createRes = await fetch("http://localhost:3000/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            title: "Delete Test",
            description: "To be deleted",
            ageRange: "5", character: "Test", genre: "Test", idealFor: "Test", pageCount: 1,
            pages: [{ title: "P1", content: "C1" }]
        })
    });
    const created = await createRes.json();
    console.log("Creation Response:", JSON.stringify(created, null, 2));
    const id = created.id;
    console.log("Created ID:", id);

    if (!id) {
        console.error("Failed to create story");
        return;
    }

    // 2. Verify it exists
    console.log("Verifying existence...");
    const getRes = await fetch(`http://localhost:3000/api/stories/${id}`);
    if (getRes.status !== 200) {
        console.error("Failed to fetch created story", getRes.status);
        return;
    }
    console.log("Story exists.");

    // 3. Delete it
    console.log("Deleting story...");
    const delRes = await fetch(`http://localhost:3000/api/stories/${id}`, { method: "DELETE" });
    if (delRes.status !== 200) {
        const err = await delRes.text();
        console.error("Delete failed:", delRes.status, err);
        return;
    }
    console.log("Delete successful.");

    // 4. Verify it's gone
    console.log("Verifying deletion...");
    const checkRes = await fetch(`http://localhost:3000/api/stories/${id}`);
    if (checkRes.status === 404) {
        console.log("✅ SUCCESS: Story is gone (404).");
    } else {
        console.error("❌ FAILURE: Story still exists or other error.", checkRes.status);
    }
}

verifyDelete();

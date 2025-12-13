
const fs = require('fs');
const path = require('path');

async function verifyImageUpdate() {
    const baseUrl = 'http://localhost:3000/api';
    const TEST_IMAGE_NAME = 'test-update-image.png';
    const TEST_CONTENT_TYPE = 'image/png';

    console.log('1. Setup: Creating a story to update...');
    const createRes = await fetch(`${baseUrl}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: "Image Update Test",
            description: "Testing image update capability",
            idealFor: "Testers",
            ageRange: "5-10",
            character: "ImgBot",
            genre: "Test",
            pageCount: 1,
            pages: [{ title: "P1", content: "Content", imagePrompt: "Prompt" }],
            narrationFlow: "Flow"
        })
    });

    if (!createRes.ok) {
        console.error('Failed to create initial story');
        return;
    }
    const { storyId } = await createRes.json();
    console.log(`   Story created: ${storyId}`);

    console.log('2. Emulating Client Image Upload...');
    // A. Get Upload URL
    const uploadUrlRes = await fetch(`${baseUrl}/upload-url?fileName=${TEST_IMAGE_NAME}&contentType=${TEST_CONTENT_TYPE}`);
    if (!uploadUrlRes.ok) {
        console.error('Failed to get upload URL');
        return;
    }
    const { url, key, isLocal } = await uploadUrlRes.json();
    console.log(`   Got upload URL. Key: ${key}, Local: ${isLocal}`);

    // B. Upload File (In simulation, we just assume the PUT to 'url' works or we skip the actual binary upload if it's local mocking)
    // For local dev, the 'url' is likely an API endpoint that expects a file.
    // If isLocal is true, 'url' is /api/local-upload...

    // Check if we need to "upload" to make the file exist for the system?
    // In strict local mode, we might need to actually PUT data.
    if (isLocal) {
        const mockFileContent = Buffer.from("fake image data");
        const putRes = await fetch(url, { method: "PUT", body: mockFileContent, headers: { "Content-Type": TEST_CONTENT_TYPE } });
        if (!putRes.ok) console.warn("   Warning: Fake upload failed, might affect retrieval if validation exists.");
        else console.log("   Fake image upload completed.");
    }

    // Determine the final URL exactly as the client would
    let finalCoverUrl = url.split('?')[0];
    if (isLocal) {
        // The client logic for local:
        // const uploadData = await uploadRes.json();
        // coverImageUrl = uploadData.path; 
        // We need to replicate that if we want to be accurate.
        // Assuming the previous PUT returned JSON:
        // Note: The previous PUT in this script might define the response.
    }

    // Simplify: For this test, we care about the PUT /api/stories/[id] payload persistence.
    // The client sends 'coverImageKey' and 'coverImageUrl'.
    const newKey = key;
    const newUrl = isLocal ? `/uploads/${key}` : finalCoverUrl; // Approximation of what client derives


    console.log('3. Updating Story with New Image Data...');
    const updatePayload = {
        title: "Image Update Test (Updated)",
        description: "Updated description",
        character: "ImgBot",
        genre: "Test",
        ageRange: "5-10",
        idealFor: "Testers",
        pageCount: 1,
        pages: [{ title: "P1", content: "Content", imagePrompt: "Prompt" }],
        narrationFlow: "Flow",
        coverImageKey: newKey,
        coverImageUrl: newUrl
    };

    const updateRes = await fetch(`${baseUrl}/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
        console.error('Failed to update story with image', await updateRes.text());
        return;
    }
    console.log('   Update success.');

    console.log('4. Verifying Persistence...');
    const getRes = await fetch(`${baseUrl}/stories/${storyId}`);
    const story = await getRes.json();

    if (story.coverImageKey === newKey && story.coverImageUrl === newUrl) {
        console.log('✅ TEST PASSED: Image data persisted successfully.');
        console.log(`   Key: ${story.coverImageKey}`);
        console.log(`   Url: ${story.coverImageUrl}`);
    } else {
        console.error('❌ TEST FAILED: Image data mismatch.');
        console.error('   Expected:', { newKey, newUrl });
        console.error('   Got:', { key: story.coverImageKey, url: story.coverImageUrl });
    }

    // Cleanup
    await fetch(`${baseUrl}/stories/${storyId}`, { method: 'DELETE' });
}

verifyImageUpdate();


const fs = require('fs');
const path = require('path');

async function testEditStoryPersistence() {
    const baseUrl = 'http://localhost:3000/api';

    console.log('1. Creating a temporary story...');
    const createRes = await fetch(`${baseUrl}/stories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            title: "Temp Test Story",
            description: "Testing edit persistence",
            idealFor: "Testing",
            ageRange: "5-10",
            character: "Tester",
            genre: "Test",
            pageCount: 2,
            pages: [
                { title: "Page 1", content: "Original content", imagePrompt: "Original prompt" }
            ],
            narrationFlow: "Start"
        })
    });

    if (!createRes.ok) {
        console.error('Failed to create story', await createRes.text());
        return;
    }

    const { storyId } = await createRes.json();
    console.log(`   Created story: ${storyId}`);

    // Simulate the NEW Edit Page payload (Rich structure)
    console.log('2. Updating story with RICH payload (Titles + Prompts)...');
    const updatePayload = {
        title: "Updated Title",
        description: "Updated Description",
        character: "Tester Updated",
        genre: "Test Updated",
        ageRange: "6-12",
        idealFor: "Advanced Testing",
        pageCount: 3,
        narrationFlow: "Updated Flow",
        pages: [
            {
                title: "Chapter 1: The Beginning",
                content: "This is the first page content.",
                imagePrompt: "A bright sunny day in test land"
            },
            {
                title: "Chapter 2: The Middle",
                content: "This is the second page content.",
                imagePrompt: "A cloudy afternoon"
            },
            {
                title: "Chapter 3: The End",
                content: "This is the final page.",
                imagePrompt: "Sunset over the digital horizon"
            }
        ],
        coverImageUrl: null,
        coverImageKey: null
    };

    const updateRes = await fetch(`${baseUrl}/stories/${storyId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatePayload)
    });

    if (!updateRes.ok) {
        console.error('Failed to update story', await updateRes.text());
        return;
    }
    console.log('   Update successful.');

    // Verify Persistence
    console.log('3. Verifying persisted data...');
    const getRes = await fetch(`${baseUrl}/stories/${storyId}`);
    const story = await getRes.json();

    let success = true;

    // Check Title
    if (story.title !== "Updated Title") {
        console.error('FAIL: Title mismatch');
        success = false;
    }

    // Check Pages Length
    if (story.pages.length !== 3) {
        console.error(`FAIL: Expected 3 pages, got ${story.pages.length}`);
        success = false;
    }

    // Check Detailed Page Data (The core fix)
    const p1 = story.pages[0];
    if (p1.title !== "Chapter 1: The Beginning" || p1.imagePrompt !== "A bright sunny day in test land") {
        console.error('FAIL: Page 1 metadata lost!', p1);
        success = false;
    } else {
        console.log('   SUCCESS: Page 1 metadata persisted correctly.');
    }

    const p3 = story.pages[2];
    if (p3.title !== "Chapter 3: The End" || p3.imagePrompt !== "Sunset over the digital horizon") {
        console.error('FAIL: Page 3 metadata lost!', p3);
        success = false;
    } else {
        console.log('   SUCCESS: Page 3 metadata persisted correctly.');
    }

    if (success) {
        console.log('\n✅ TEST PASSED: Edit Flow correctly persists rich page data.');
    } else {
        console.error('\n❌ TEST FAILED: Data loss detected.');
    }

    // Cleanup
    console.log('4. Cleaning up...');
    await fetch(`${baseUrl}/stories/${storyId}`, { method: 'DELETE' });
}

testEditStoryPersistence();

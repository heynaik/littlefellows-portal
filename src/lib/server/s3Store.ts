import { s3, getJson, putJson, isS3Configured } from "@/lib/s3";
import * as localStore from "@/lib/server/localStore";

const STORIES_KEY = "stories/index.json";

export async function getStories() {
    // FALLBACK: If S3 is not configured, use local store
    if (!isS3Configured) {
        console.warn("[s3Store] S3 keys missing. Falling back to localStore.");
        return localStore.getStories();
    }

    try {
        const s3Stories = await getJson<any[]>(STORIES_KEY) || [];

        // MERGE LOCAL STORIES (Migration Strategy)
        // We include local stories so users don't "lose" data when adding S3 keys.
        // If they edit a local story, it will be saved to S3 (migrated).
        const localStories = localStore.getStories();
        const s3Ids = new Set(s3Stories.map((s: any) => s.id));
        const uniqueLocal = localStories.filter((s: any) => !s3Ids.has(s.id));

        return [...s3Stories, ...uniqueLocal];

    } catch (error) {
        console.error("Failed to read stories from S3 (likely config error). Falling back to local:", error);
        return localStore.getStories();
    }
}

export async function saveStory(story: any) {
    // FALLBACK: If S3 is not configured, use local store
    if (!isS3Configured) {
        console.warn("[s3Store] S3 keys missing. Falling back to localStore.");
        return localStore.saveStory(story);
    }

    try {
        const allStories = await getStories();

        // If updating an existing story (check by ID if provided, otherwise assume new)
        if (story.id) {
            const idx = allStories.findIndex((s: any) => s.id === story.id);
            if (idx > -1) {
                allStories[idx] = { ...allStories[idx], ...story, updatedAt: new Date().toISOString() };
            } else {
                allStories.unshift({ ...story, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
            }
        } else {
            // Generate a simple ID
            const newId = `s3-${Date.now()}`;
            allStories.unshift({
                id: newId,
                ...story,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            });
        }

        await putJson(STORIES_KEY, allStories);
        // Return the full saved object (finding it by reference or reconstruction)
        // Since we modified allStories in place or unshifted, we can return the relevant item.
        const savedItem = story.id
            ? allStories.find((s: any) => s.id === story.id)
            : allStories[0]; // If new, it's at the top

        console.log("[s3Store] Saved Item:", savedItem);
        return savedItem;
    } catch (error) {
        console.error("Failed to save story to S3. Falling back to local:", error);
        // Fallback: Save to local store if S3 fails
        return localStore.saveStory(story);
    }
}

export async function deleteStory(id: string) {
    // FALLBACK: If S3 is not configured, use local store
    if (!isS3Configured) {
        console.warn("[s3Store] S3 keys missing. Falling back to localStore.");
        return localStore.deleteStory(id);
    }

    try {
        const allStories = await getStories();
        const initialLen = allStories.length;
        const newStories = allStories.filter((s: any) => s.id !== id);

        if (newStories.length === initialLen) return false; // Not found

        await putJson(STORIES_KEY, newStories);
        return true;
    } catch (error) {
        console.error("Failed to delete story from S3. Falling back to local:", error);
        return localStore.deleteStory(id);
    }
}

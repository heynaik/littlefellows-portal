import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'src', 'data');
const DATA_FILE = path.join(DATA_DIR, 'voice_data.json');
const MOCK_ORDERS_FILE = path.join(DATA_DIR, 'mock_orders.json');
const STORIES_FILE = path.join(DATA_DIR, 'stories.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Ensure files exist
if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify({}), 'utf-8');
}
if (!fs.existsSync(MOCK_ORDERS_FILE)) {
    fs.writeFileSync(MOCK_ORDERS_FILE, JSON.stringify([]), 'utf-8');
}
if (!fs.existsSync(STORIES_FILE)) {
    fs.writeFileSync(STORIES_FILE, JSON.stringify([]), 'utf-8');
}

// --- Voice Data ---
export function getVoiceData() {
    try {
        const data = fs.readFileSync(DATA_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Failed to read local voice data:", error);
        return {};
    }
}

export function saveVoiceData(orderId: string, metaData: any[]) {
    try {
        const allData = getVoiceData();
        const currentMeta = allData[orderId] || [];

        // Merge
        const newMeta = [...currentMeta];
        metaData.forEach((item: any) => {
            const idx = newMeta.findIndex((m: any) => m.key === item.key);
            if (idx > -1) {
                newMeta[idx] = item;
            } else {
                newMeta.push(item);
            }
        });

        allData[orderId] = newMeta;

        fs.writeFileSync(DATA_FILE, JSON.stringify(allData, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error("Failed to save local voice data:", error);
        return false;
    }
}

// --- Mock Orders ---
export function getMockOrders() {
    try {
        if (!fs.existsSync(MOCK_ORDERS_FILE)) return [];
        const data = fs.readFileSync(MOCK_ORDERS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Failed to read local mock orders:", error);
        return [];
    }
}

export function saveMockOrder(order: any) {
    try {
        const allOrders = getMockOrders();
        const idx = allOrders.findIndex((o: any) => o.wcId === order.wcId || o.id === order.id);

        if (idx > -1) {
            allOrders[idx] = { ...allOrders[idx], ...order };
        } else {
            allOrders.push(order);
        }

        fs.writeFileSync(MOCK_ORDERS_FILE, JSON.stringify(allOrders, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error("Failed to save local mock order:", error);
        return false;
    }
}

// --- Stories ---
export function getStories() {
    try {
        if (!fs.existsSync(STORIES_FILE)) return [];
        const data = fs.readFileSync(STORIES_FILE, 'utf-8');
        return JSON.parse(data);
    } catch (error) {
        console.error("Failed to read local stories:", error);
        return [];
    }
}

export function saveStory(story: any) {
    try {
        const allStories = getStories();
        // If updating an existing story (check by ID if provided, otherwise assume new)
        if (story.id) {
            const idx = allStories.findIndex((s: any) => s.id === story.id);
            if (idx > -1) {
                allStories[idx] = { ...allStories[idx], ...story, updatedAt: new Date().toISOString() };
                fs.writeFileSync(STORIES_FILE, JSON.stringify(allStories, null, 2), 'utf-8');
                return allStories[idx];
            } else {
                // Technically shouldn't happen if checking existence, but treat as new or error?
                // Let's treat as insert for now if ID provided but not found
                const newStory = { ...story, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
                allStories.unshift(newStory);
                fs.writeFileSync(STORIES_FILE, JSON.stringify(allStories, null, 2), 'utf-8');
                return newStory;
            }
        } else {
            // Generate a simple ID
            const newId = `local-${Date.now()}`;
            const newStory = {
                id: newId,
                ...story,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };
            allStories.unshift(newStory);
            fs.writeFileSync(STORIES_FILE, JSON.stringify(allStories, null, 2), 'utf-8');
            return newStory;
        }
    } catch (error) {
        console.error("Failed to save local story:", error);
        return false;
    }
}

export function deleteStory(id: string) {
    try {
        let allStories = getStories();
        const initialLen = allStories.length;
        allStories = allStories.filter((s: any) => s.id !== id);

        if (allStories.length === initialLen) return false; // Not found

        fs.writeFileSync(STORIES_FILE, JSON.stringify(allStories, null, 2), 'utf-8');
        return true;
    } catch (error) {
        console.error("Failed to delete local story:", error);
        return false;
    }
}

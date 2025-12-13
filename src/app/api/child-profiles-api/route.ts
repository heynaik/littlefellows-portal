import { NextResponse } from "next/server";
import fs, { existsSync, mkdirSync } from "fs";
import path from "path";

// Define the path to the local JSON DB
const DATA_DIR = path.join(process.cwd(), "src", "data");
const DATA_FILE = path.join(DATA_DIR, "child_profiles.json");

// Helper to read data
function readData(): any[] {
    if (!existsSync(DATA_FILE)) return [];
    try {
        const fileContent = fs.readFileSync(DATA_FILE, "utf-8");
        return JSON.parse(fileContent);
    } catch (e) {
        console.error("Error reading local child_profiles.json", e);
        return [];
    }
}

// Helper to write data
function writeData(data: any[]) {
    if (!existsSync(DATA_DIR)) {
        mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), "utf-8");
}

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const parentEmail = searchParams.get("parentEmail");
    const childName = searchParams.get("childName");
    const getAll = searchParams.get("getAll");

    const profiles = readData();

    if (getAll) {
        // Return all profiles sorted by createdAt desc
        const sorted = profiles.sort((a, b) => {
            const dateA = new Date(a.createdAt || 0).getTime();
            const dateB = new Date(b.createdAt || 0).getTime();
            return dateB - dateA;
        });
        return NextResponse.json(sorted);
    }

    if (parentEmail && childName) {
        const profile = profiles.find(
            p => p.parentEmail === parentEmail && p.childName === childName
        );
        return NextResponse.json(profile || null);
    }

    return NextResponse.json(profiles);
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { parentEmail, childName, voiceUrl, voiceOwner, action } = body;

        let profiles = readData();

        if (action === "delete_voice") {
            // Find and update
            const idx = profiles.findIndex(
                p => p.parentEmail === parentEmail && p.childName === childName
            );

            if (idx > -1) {
                profiles[idx].voiceUrl = null;
                profiles[idx].voiceOwner = null;
                profiles[idx].updatedAt = new Date().toISOString();
                writeData(profiles);
            }
            return NextResponse.json({ success: true });
        }

        // Create or Update
        const idx = profiles.findIndex(
            p => p.parentEmail === parentEmail && p.childName === childName
        );

        const now = new Date().toISOString();

        if (idx > -1) {
            // Update
            profiles[idx] = {
                ...profiles[idx],
                voiceUrl: voiceUrl || profiles[idx].voiceUrl,
                voiceOwner: voiceOwner || profiles[idx].voiceOwner,
                updatedAt: now
            };
        } else {
            // Create New
            const newProfile = {
                id: `local_${Date.now()}`,
                parentEmail,
                childName,
                voiceUrl,
                voiceOwner,
                createdAt: now,
                updatedAt: now
            };
            profiles.push(newProfile);
        }

        writeData(profiles);
        return NextResponse.json({ success: true, id: idx > -1 ? profiles[idx].id : "new" });

    } catch (error) {
        console.error("Local DB Save Error:", error);
        return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }
}

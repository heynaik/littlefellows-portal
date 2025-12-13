import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { adminDb, isFirebaseAdminInitialized } from "@/lib/server/firebaseAdmin";

import { getStories, saveStory, deleteStory } from "@/lib/server/s3Store";
import { FieldValue } from "firebase-admin/firestore";

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireUser(req);
        if (user instanceof Response) return user;

        const { id } = await params;

        if (!isFirebaseAdminInitialized) {
            console.warn("[Stories API] Dev mode: Finding in S3 store.");
            const stories = await getStories();
            const story = stories.find((s: any) => String(s.id).trim() === String(id).trim());

            if (!story) {
                return NextResponse.json({ error: "Story not found in S3 store" }, { status: 404 });
            }
            return NextResponse.json(story);
        }

        const docRef = adminDb.collection("stories").doc(id);
        const doc = await docRef.get();

        if (!doc.exists) {
            return NextResponse.json({ error: "Story not found" }, { status: 404 });
        }

        const story = {
            id: doc.id,
            ...doc.data(),
            createdAt: doc.data()?.createdAt?.toDate?.() || doc.data()?.createdAt,
            updatedAt: doc.data()?.updatedAt?.toDate?.() || doc.data()?.updatedAt,
        };

        return NextResponse.json(story);

    } catch (error: any) {
        console.error("[stories.GET_ID] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireUser(req);
        if (user instanceof Response) return user;

        const { id } = await params;
        const body = await req.json();

        // Validate essentials
        if (!body.title) {
            return NextResponse.json({ error: "Title is required" }, { status: 400 });
        }

        const updateData = {
            ...body,
            updatedAt: isFirebaseAdminInitialized ? FieldValue.serverTimestamp() : new Date().toISOString(),
        };

        if (!isFirebaseAdminInitialized) {
            console.warn("[Stories API] Dev mode: Updating in S3 store.");
            // S3 store's saveStory handles updates if ID is present
            const savedStory = await saveStory({ id, ...updateData });
            if (!savedStory) {
                return NextResponse.json({ error: "Failed to update story in S3" }, { status: 500 });
            }
            return NextResponse.json({ ...savedStory, message: "Story updated locally/S3" });
        }

        const docRef = adminDb.collection("stories").doc(id);
        await docRef.update(updateData);

        return NextResponse.json({ id, message: "Story updated successfully" });

    } catch (error: any) {
        console.error("[stories.PUT] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
    try {
        const user = await requireUser(req);
        if (user instanceof Response) return user;

        const { id } = await params;

        if (!isFirebaseAdminInitialized) {
            console.warn("[Stories API] Dev mode: Deleting from S3 store.");
            const deleted = await deleteStory(id);

            if (!deleted) {
                return NextResponse.json({ error: "Failed to delete story (or not found)" }, { status: 404 });
            }
            return NextResponse.json({ message: "Story deleted locally/S3" });
        }

        const docRef = adminDb.collection("stories").doc(id);
        await docRef.delete();

        return NextResponse.json({ message: "Story deleted successfully" });

    } catch (error: any) {
        console.error("[stories.DELETE] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

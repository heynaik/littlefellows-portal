"use strict";
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/server/auth";
import { adminDb, isFirebaseAdminInitialized } from "@/lib/server/firebaseAdmin";
import { FieldValue } from "firebase-admin/firestore";

import { getStories, saveStory } from "@/lib/server/s3Store";

export async function GET(req: Request) {
    try {
        const user = await requireUser(req);
        if (user instanceof Response) return user;

        if (!isFirebaseAdminInitialized) {
            console.warn("[Stories API] Dev mode: fetching from S3 store.");
            const stories = await getStories();
            return NextResponse.json(stories);
        }

        const snapshot = await adminDb.collection("stories").orderBy("createdAt", "desc").get();
        const stories = snapshot.docs.map((doc: any) => ({
            id: doc.id,
            ...doc.data(),
            // Convert Firestore timestamps to dates if needed, or send as is
            createdAt: doc.data().createdAt?.toDate?.() || doc.data().createdAt,
        }));

        return NextResponse.json(stories);
    } catch (error: any) {
        console.error("[stories.GET] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await requireUser(req);
        if (user instanceof Response) return user;

        const body = await req.json();
        const { title, description, idealFor, ageRange, character, genre, pageCount, pages, narrationFlow, coverImageKey, coverImageUrl } = body;

        if (!title || !pages || !Array.isArray(pages)) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const newStory = {
            title,
            description,
            idealFor,
            ageRange,
            character,
            genre,
            status: "published",
            pageCount: Number(pageCount),
            pages,
            narrationFlow,
            coverImageKey: coverImageKey || null,
            coverImageUrl: coverImageUrl || null,
            createdBy: user.uid,
        };

        if (!isFirebaseAdminInitialized) {
            console.warn("[Stories API] Dev mode: Saving to S3 store.");
            const savedStory = await saveStory(newStory);
            if (!savedStory) throw new Error("Failed to save to S3 store");
            return NextResponse.json({ message: "Saved to S3", ...savedStory });
        }

        const docRef = await adminDb.collection("stories").add({
            ...newStory,
            createdAt: FieldValue.serverTimestamp(),
            updatedAt: FieldValue.serverTimestamp(),
        });

        return NextResponse.json({ id: docRef.id, ...newStory });
    } catch (error: any) {
        console.error("[stories.POST] Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

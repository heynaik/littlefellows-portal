
import { NextResponse } from "next/server";
import { adminDb } from "@/lib/server/firebaseAdmin";

const COLLECTION = "child_profiles";

export async function GET(req: Request) {
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    const { searchParams } = new URL(req.url);
    const parentEmail = searchParams.get("parentEmail");
    const childName = searchParams.get("childName");
    const getAll = searchParams.get("getAll");

    try {
        if (getAll) {
            const snapshot = await adminDb
                .collection(COLLECTION)
                .orderBy("createdAt", "desc")
                .get();

            const profiles = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data(),
                // Convert Timestamps to ISO strings
                createdAt: doc.data().createdAt?.toDate().toISOString(),
                updatedAt: doc.data().updatedAt?.toDate().toISOString()
            }));
            return NextResponse.json(profiles);
        }

        if (parentEmail && childName) {
            const snapshot = await adminDb
                .collection(COLLECTION)
                .where("parentEmail", "==", parentEmail)
                .where("childName", "==", childName)
                .limit(1)
                .get();

            if (snapshot.empty) {
                return NextResponse.json(null);
            }

            const doc = snapshot.docs[0];
            const data = doc.data();
            return NextResponse.json({
                id: doc.id,
                ...data,
                createdAt: data.createdAt?.toDate().toISOString(),
                updatedAt: data.updatedAt?.toDate().toISOString()
            });
        }

        return NextResponse.json({ error: "Missing parameters" }, { status: 400 });

    } catch (error) {
        console.error("Firestore GET Error:", error);
        return NextResponse.json({ error: "Failed to fetch profiles" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    if (!adminDb) {
        return NextResponse.json({ error: "Firebase Admin not initialized" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const { parentEmail, childName, voiceUrl, voiceOwner, action } = body;

        if (!parentEmail || !childName) {
            return NextResponse.json({ error: "Missing parentEmail or childName" }, { status: 400 });
        }

        // Check if profile exists
        const snapshot = await adminDb
            .collection(COLLECTION)
            .where("parentEmail", "==", parentEmail)
            .where("childName", "==", childName)
            .limit(1)
            .get();

        const now = new Date();

        if (action === "delete_voice") {
            if (!snapshot.empty) {
                const docId = snapshot.docs[0].id;
                await adminDb.collection(COLLECTION).doc(docId).update({
                    voiceUrl: null,
                    voiceOwner: null,
                    updatedAt: now
                });
            }
            return NextResponse.json({ success: true });
        }

        // Upsert Logic
        if (!snapshot.empty) {
            // Update
            const docId = snapshot.docs[0].id;
            const existingData = snapshot.docs[0].data();

            await adminDb.collection(COLLECTION).doc(docId).update({
                voiceUrl: voiceUrl || existingData.voiceUrl,
                voiceOwner: voiceOwner || existingData.voiceOwner,
                updatedAt: now
            });
            return NextResponse.json({ success: true, id: docId });
        } else {
            // Create
            const newDoc = await adminDb.collection(COLLECTION).add({
                parentEmail,
                childName,
                voiceUrl,
                voiceOwner,
                createdAt: now,
                updatedAt: now
            });
            return NextResponse.json({ success: true, id: newDoc.id });
        }

    } catch (error) {
        console.error("Firestore POST Error:", error);
        return NextResponse.json({ error: "Failed to save profile" }, { status: 500 });
    }
}

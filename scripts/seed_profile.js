
const { initializeApp } = require('firebase/app');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function seed() {
    console.log("Seeding profile for Atharv...");
    try {
        await addDoc(collection(db, "child_profiles"), {
            parentEmail: "maram.tejaswini@gmail.com",
            childName: "Atharv",
            voiceOwner: "Simulation Dad",
            voiceUrl: "https://example.com/fallback-check.mp3",
            createdAt: new Date(),
            updatedAt: new Date()
        });
        console.log("SUCCESS: Profile seeded.");
    } catch (e) {
        console.error("FAILED to seed:", e);
    }
}

seed();

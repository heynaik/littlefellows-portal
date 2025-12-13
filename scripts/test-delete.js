require('dotenv').config({ path: '.env.local' });
const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, doc, setDoc, deleteDoc, serverTimestamp } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

async function testDelete() {
    try {
        // 1. Sign In
        await signInWithEmailAndPassword(auth, "test-secure-admin@example.com", "Password123!");
        console.log("Signed in as Admin.");

        const code = "DELETE-TEST-" + Math.floor(Math.random() * 1000);

        // 2. Create Dummy
        console.log(`Creating test invite: ${code}`);
        await setDoc(doc(db, "invites", code), {
            role: "vendor",
            isUsed: false,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });
        console.log("Created. Now deleting...");

        // 3. Delete
        await deleteDoc(doc(db, "invites", code));
        console.log("SUCCESS: Invite deleted.");

    } catch (e) {
        console.error("FAILURE:", e.code, e.message);
    }
    process.exit(0);
}

testDelete();

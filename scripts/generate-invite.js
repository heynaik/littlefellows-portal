require('dotenv').config({ path: '.env.local' });
const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, collection, doc, setDoc, serverTimestamp } = require("firebase/firestore");

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

async function generateInvite() {
    try {
        // Sign in as Admin
        await signInWithEmailAndPassword(auth, "test-secure-admin@example.com", "Password123!");
        console.log("Signed in as Admin.");

        const code = "VENDOR-TEST-" + Math.floor(Math.random() * 1000);
        console.log(`Generating invite code: ${code}`);

        await setDoc(doc(db, "invites", code), {
            role: "vendor",
            isUsed: false,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });
        console.log("SUCCESS: Code created.");
        console.log("CODE:" + code); // Marker for me to read
    } catch (e) {
        console.error("ERROR:", e);
    }
    process.exit(0);
}

generateInvite();

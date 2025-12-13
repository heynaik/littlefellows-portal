require('dotenv').config({ path: '.env.local' });
const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, doc, setDoc, getDoc, serverTimestamp } = require("firebase/firestore");
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

async function testGeneration() {
    try {
        // 1. Sign In
        await signInWithEmailAndPassword(auth, "test-secure-admin@example.com", "Password123!");
        console.log("Signed in as Admin.");

        // 2. Generate Vendor Code
        const vendorCode = "VENDOR-GEN-" + Math.floor(Math.random() * 1000);
        console.log(`\nGenerating Vendor Invite: ${vendorCode}`);
        await setDoc(doc(db, "invites", vendorCode), {
            role: "vendor",
            isUsed: false,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });

        // Verify Vendor
        const vSnap = await getDoc(doc(db, "invites", vendorCode));
        if (vSnap.exists() && vSnap.data().role === 'vendor') {
            console.log("✅ SUCCESS: Vendor code created and verified in DB.");
        } else {
            console.error("❌ FAILED: Vendor code not found or wrong role.");
        }

        // 3. Generate Admin Code
        const adminCode = "ADMIN-GEN-" + Math.floor(Math.random() * 1000);
        console.log(`\nGenerating Admin Invite: ${adminCode}`);
        await setDoc(doc(db, "invites", adminCode), {
            role: "admin",
            isUsed: false,
            createdAt: serverTimestamp(),
            createdBy: auth.currentUser.uid
        });

        // Verify Admin
        const aSnap = await getDoc(doc(db, "invites", adminCode));
        if (aSnap.exists() && aSnap.data().role === 'admin') {
            console.log("✅ SUCCESS: Admin code created and verified in DB.");
        } else {
            console.error("❌ FAILED: Admin code not found or wrong role.");
        }

    } catch (e) {
        console.error("FAILURE:", e);
    }
    process.exit(0);
}

testGeneration();

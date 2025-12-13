require('dotenv').config({ path: '.env.local' });
const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, collection, query, where, orderBy, getDocs } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword } = require("firebase/auth");

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);
const auth = getAuth(app);

async function testVendorsQuery() {
    try {
        // 1. Sign In as Admin
        await signInWithEmailAndPassword(auth, "test-secure-admin@example.com", "Password123!");
        console.log("Signed in as Admin.");

        // 2. Run Query
        console.log("Querying for vendors...");
        const q = query(
            collection(db, "users"),
            where("role", "==", "vendor"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);

        if (snapshot.empty) {
            console.log("⚠️ No vendors found (Query worked, but no data).");
        } else {
            console.log(`✅ SUCCESS: Found ${snapshot.size} vendors.`);
            snapshot.forEach(doc => {
                console.log(` - ID: ${doc.id}, Email: ${doc.data().email}, Joined: ${doc.data().createdAt?.toDate()}`);
            });
        }

    } catch (e) {
        console.error("❌ QUERY FAILED:", e.code, e.message);
        if (e.code === 'failed-precondition') {
            console.log("\n💡 LINK TO CREATE INDEX:", e.message);
        }
    }
    process.exit(0);
}

testVendorsQuery();

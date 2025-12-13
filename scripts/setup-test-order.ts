const { initializeApp } = require('firebase/app');
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require('firebase/auth');
const { getFirestore, collection, addDoc, serverTimestamp } = require('firebase/firestore');
const dotenv = require('dotenv');

dotenv.config({ path: '.env.local' });
dotenv.config(); // fallback

const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

// Check config
if (!firebaseConfig.apiKey) {
    console.error("Missing Firebase Config keys. Check .env.local");
    process.exit(1);
}

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

async function main() {
    const email = "heynaik7@gmail.com";
    const password = "heynaik1@";

    console.log(`Authenticating as ${email}...`);

    let user;
    try {
        const cred = await signInWithEmailAndPassword(auth, email, password);
        user = cred.user;
        console.log(`Logged in! UID: ${user.uid}`);
    } catch (e: any) {
        if (e.code === 'auth/user-not-found' || e.code === 'auth/invalid-credential') {
            console.log("User not found or invalid creds. Attempting creation...");
            try {
                const cred = await createUserWithEmailAndPassword(auth, email, password);
                user = cred.user;
                console.log(`Created User! UID: ${user.uid}`);
                // Note: Normally we'd need to create a Firestore user profile too. 
                // We'll skip that for now as we just need the UID for the Order Assignment test.
                // But valid Login requires a "role" in "users" collection usually for the APP.
                // Let's seed that too just in case.
                const { setDoc, doc } = require('firebase/firestore');
                await setDoc(doc(db, 'users', user.uid), {
                    email: email,
                    role: 'vendor',
                    name: 'Test Vendor HeyNaik',
                    createdAt: new Date()
                });
                console.log("Seeded User Profile.");

            } catch (createErr: any) {
                console.error("Failed to create user:", createErr.message);
                process.exit(1);
            }
        } else {
            console.error("Login failed:", e.message);
            process.exit(1);
        }
    }

    // Create Order
    const orderId = `TEST-${Date.now().toString().slice(-4)}`;
    const payload = {
        wcId: 999999, // Fake Woo ID
        orderId: orderId, // Display ID
        bookTitle: "The Great Auto-Test Adventure",
        customerName: "Auto Test Bot",
        customerEmail: "bot@test.com",
        totalAmount: "50.00",
        currency: "USD",
        binding: "Hard",
        stage: "Assigned to Vendor",
        vendorId: user.uid,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        s3Key: null,
        notes: "Automated verification test via Client SDK"
    };

    console.log("Assigning test order...");
    await addDoc(collection(db, 'orders'), payload);

    console.log(`✅ SUCCESS: Created Order #${orderId} assigned to ${email}`);
    process.exit(0);
}

main();

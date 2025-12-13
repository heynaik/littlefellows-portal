require('dotenv').config({ path: '.env.local' });
const { initializeApp, getApps, getApp } = require("firebase/app");
const { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp } = require("firebase/firestore");
const { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } = require("firebase/auth");

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

// Use a master admin to create the invites first (Server/Admin Action)
async function setupInvite(role) {
    await signInWithEmailAndPassword(auth, "test-secure-admin@example.com", "Password123!");
    const code = `${role.toUpperCase()}-TEST-${Math.floor(Math.random() * 10000)}`;
    await setDoc(doc(db, "invites", code), {
        role,
        isUsed: false,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser.uid
    });
    console.log(`[SETUP] Created Valid ${role} Invite: ${code}`);
    return code;
}

// Simulate the User's actions on the Login Page
async function simulateClientValidation(code, intendedRole) {
    console.log(`\n--- Testing Code: ${code} for Role: ${intendedRole} ---`);

    // 1. Validation Logic (Pre-Login)
    // Note: Rules allow 'get' if true.
    const inviteRef = doc(db, "invites", code);
    let snap;
    try {
        snap = await getDoc(inviteRef);
    } catch (e) {
        if (e.code === 'permission-denied') {
            console.log("❌ REJECTED: Permission Denied (Likely invalid code/Does not exist).");
            return false;
        }
        throw e;
    }

    if (!snap.exists()) {
        console.log("❌ REJECTED: Code does not exist (Invalid Code).");
        return false;
    }

    const data = snap.data();
    if (data.role !== intendedRole) {
        console.log(`❌ REJECTED: Role mismatch (Code is for ${data.role}, wanted ${intendedRole}).`);
        return false;
    }
    if (data.isUsed) {
        console.log("❌ REJECTED: Code already used.");
        return false;
    }

    console.log("✅ CHECK PASSED: Code is valid and unused in DB.");

    // 2. Consumption Logic (Post-Login)
    // We need to be authenticated to 'update' (mark as used)
    // Create a temporary user to simulate the new signup
    const tempEmail = `test-user-${Math.floor(Math.random() * 10000)}@example.com`;
    console.log("...Simulating Sign Up...");
    try {
        const userCred = await createUserWithEmailAndPassword(auth, tempEmail, "Password123!");
        const user = userCred.user;

        console.log("...Marking Invite as Used...");
        await updateDoc(inviteRef, {
            isUsed: true,
            usedBy: user.uid,
            usedAt: serverTimestamp()
        });
        console.log("✅ SUCCESS: Account Created & Invite Marked Used.");
        return true;
    } catch (e) {
        console.error("❌ ERROR during consumption:", e.message);
        return false;
    }
}

async function runTests() {
    try {
        // Test 1: Invalid Code
        await simulateClientValidation("INVALID-CODE-999", "vendor");

        // Test 2: Valid Vendor Code
        const vCode = await setupInvite("vendor");
        await simulateClientValidation(vCode, "vendor");

        // Test 3: Valid Admin Code
        const aCode = await setupInvite("admin");
        await simulateClientValidation(aCode, "admin");

    } catch (e) {
        console.error(e);
    }
    process.exit(0);
}

runTests();

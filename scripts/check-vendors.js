
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
require('dotenv').config({ path: '.env.local' });

// Simplify credential loading for this script (copying logic from firebaseAdmin.ts roughly)
function getCreds() {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (raw) {
        try {
            return JSON.parse(raw);
        } catch (e) { console.error("Parse error", e); }
    }
    return {
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(/\\n/g, '\n'),
    };
}


async function main() {
    console.log("Checking Environment Variables...");
    const keys = [
        "FIREBASE_PROJECT_ID",
        "FIREBASE_CLIENT_EMAIL",
        "FIREBASE_PRIVATE_KEY",
        "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
        "FIREBASE_SERVICE_ACCOUNT"
    ];

    const status = {};
    keys.forEach(k => {
        const val = process.env[k];
        status[k] = val ? (val.length > 20 ? "Present (Long)" : `Present: ${val}`) : "MISSING";
    });

    console.table(status);

    // Try to init if we have at least project ID
    const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!projectId) {
        console.error("FATAL: No Project ID found.");
        return;
    }

    // Attempt Client SDK check if Admin fails?
    // But we really want to check Admin SDK for the API.

    // Check if we can construct Admin Creds
    if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
        console.log("Admin Credentials appear present. Attempting connection...");
        try {
            initializeApp({
                credential: cert({
                    projectId: projectId,
                    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                    privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
                })
            });
            const db = getFirestore();
            const snap = await db.collection('users').where('role', '==', 'vendor').get();
            console.log(`Connection Successful. Found ${snap.size} vendors.`);
        } catch (e) {
            console.error("Admin Init Failed:", e.message);
        }
    } else {
        console.error("Missing Admin Private Key or Client Email. Admin SDK will not work.");
    }
}


main();

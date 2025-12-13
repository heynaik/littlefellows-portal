
import { cert, initializeApp, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import * as dotenv from 'dotenv';
dotenv.config();

// Re-implement simplified credential logic or import
// Importing from src might be tricky with ts-node if paths aren't set, so I'll keep it self-contained or try relative.
// Let's try relative import first, relying on tsconfig-paths if available, or just copy the logic to be safe/standalone.

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT || process.env.FIREBASE_ADMIN_CREDENTIALS;

async function main() {
    const email = process.argv[2];
    if (!email) {
        console.error("Usage: npx ts-node scripts/promote-admin.ts <email>");
        process.exit(1);
    }

    console.log(`Promoting ${email} to ADMIN...`);

    // Initialize
    let app;
    if (!getApps().length) {
        if (serviceAccount) {
            app = initializeApp({ credential: cert(JSON.parse(serviceAccount)) });
        } else {
            // Fallback or error
            // Ideally use applicationDefault if available
            try {
                app = initializeApp();
            } catch (e) {
                console.error("Failed to init Firebase Admin. Ensure FIREBASE_SERVICE_ACCOUNT env is set.");
                process.exit(1);
            }
        }
    } else {
        app = getApp();
    }

    const auth = getAuth(app);
    const db = getFirestore(app);

    try {
        const user = await auth.getUserByEmail(email);
        console.log(`Found user: ${user.uid}`);

        // Update Firestore
        await db.collection('users').doc(user.uid).set({
            role: 'admin',
            updatedAt: new Date(),
            email: email
        }, { merge: true });

        console.log("✅ Firestore 'role' set to 'admin'.");

        // Optional: Set Custom Claim
        await auth.setCustomUserClaims(user.uid, { role: 'admin' });
        console.log("✅ Auth Custom Claims set to { role: 'admin' }.");

        console.log("\nSuccess! Please log out and log back in.");
        process.exit(0);
    } catch (error) {
        console.error("Error:", error);
        process.exit(1);
    }
}

main();

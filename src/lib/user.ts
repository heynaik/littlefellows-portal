// src/lib/user.ts
"use client";
import { db } from "./firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

/** Ensure a Firestore user doc exists; default role = vendor */
export async function ensureUserDoc(
  uid: string,
  email: string | null,
  initialRole?: "admin" | "vendor"
) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      email: email ?? "",
      role: initialRole ?? "vendor",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return initialRole ?? "vendor";
  }
  const data = snap.data() as { role?: "admin" | "vendor" };
  return data.role ?? "vendor";
}

export async function getUserRole(uid: string) {
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  return snap.exists() ? ((snap.data().role as "admin" | "vendor") ?? "vendor") : "vendor";
}
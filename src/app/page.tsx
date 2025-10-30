"use client";
import Link from "next/link";
import { useAuthUser } from "../lib/auth";
import { getUserRole } from "../lib/user";
import { useEffect, useState } from "react";

export default function Home() {
  const { user, loading } = useAuthUser();
  const [role, setRole] = useState<"admin" | "vendor" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!loading && user) {
        const r = await getUserRole(user.uid);
        if (!cancelled) setRole(r);
      }
    })();
    return () => { cancelled = true; };
  }, [loading, user]);

  return (
    <main className="p-6">
      <h1 className="mb-2 text-2xl font-semibold">LittleFellows Portal</h1>
      {loading ? (
        <p>Loading…</p>
      ) : user ? (
        <div className="space-y-2">
          <p className="text-gray-700">Signed in as <b>{user.email}</b></p>
          {role === "admin" ? (
            <Link className="rounded bg-indigo-600 px-4 py-2 text-white" href="/admin/orders">
              Go to Admin Orders
            </Link>
          ) : role === "vendor" ? (
            <Link className="rounded bg-indigo-600 px-4 py-2 text-white" href="/vendor/orders">
              Go to Vendor Orders
            </Link>
          ) : (
            <p className="text-sm text-red-600">Account not configured.</p>
          )}
        </div>
      ) : (
        <Link className="rounded bg-indigo-600 px-4 py-2 text-white" href="/login">
          Sign in
        </Link>
      )}
    </main>
  );
}
"use client";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "@/lib/auth";
import { getUserRole } from "@/lib/user";

export default function Home() {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [role, setRole] = useState<"admin" | "vendor" | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!loading && user) {
        const resolvedRole = await getUserRole(user.uid);
        if (!cancelled) setRole(resolvedRole);
      } else if (!loading && !user) {
        setRole(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [loading, user]);

  useEffect(() => {
    if (!loading && user && role) {
      const destination = role === "admin" ? "/admin" : "/vendor/orders";
      router.replace(destination);
    }
  }, [loading, role, router, user]);

  const primaryCta = useMemo(() => {
    if (loading) {
      return { href: "#", label: "Checking account…" };
    }
    if (user && role) {
      return {
        href: role === "admin" ? "/admin" : "/vendor/orders",
        label: role === "admin" ? "Go to Admin Dashboard" : "Go to Vendor Workspace",
      };
    }
    return { href: "/login", label: "Sign in" };
  }, [loading, role, user]);

  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-indigo-50 via-white to-blue-50 text-slate-900">
      <div className="absolute -top-24 right-0 h-96 w-96 rounded-full bg-indigo-100 blur-3xl" />
      <div className="absolute -bottom-40 left-10 h-80 w-80 rounded-full bg-blue-100 blur-3xl" />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center px-6 py-16 lg:px-12">
        <header className="max-w-3xl space-y-6">
          <div className="flex items-center gap-3">
            <Image
              src="/fellowe.png"
              alt="LittleFellows logo"
              width={48}
              height={48}
              className="h-12 w-12 rounded-full border border-indigo-100 bg-white shadow-sm"
              priority
            />
            <span className="inline-flex items-center rounded-full bg-indigo-100 px-4 py-1 text-sm font-medium text-indigo-600">
              LittleFellows Production Portal
            </span>
          </div>
          <h1 className="text-4xl font-semibold tracking-tight text-slate-900 sm:text-5xl">
            Keep every custom book moving—from upload to delivery.
          </h1>
          <p className="text-lg text-slate-600">
            Manage proofs, assign vendors, watch production stages, and hit delivery dates.
            LittleFellows teams and partners collaborate here to keep orders on track.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href={primaryCta.href}
              className="rounded-lg bg-indigo-600 px-6 py-3 text-base font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600"
            >
              {primaryCta.label}
            </Link>
            <Link
              href="mailto:support@littlefellows.com"
              className="rounded-lg border border-indigo-200 px-6 py-3 text-base font-semibold text-indigo-600 transition hover:border-indigo-300 hover:bg-white"
            >
              Request access
            </Link>
          </div>
        </header>

        <section className="mt-16 grid gap-6 sm:grid-cols-3">
          {[
            {
              title: "Track production",
              description:
                "Filter by stage, review notes, and surface bottlenecks so every order ships on time.",
            },
            {
              title: "Secure uploads",
              description:
                "Vendors upload PDFs through pre-signed S3 links—no inbox attachments, no size limits.",
            },
            {
              title: "Vendor-ready tools",
              description:
                "Simple dashboards help partners view assignments, update status, and collaborate quickly.",
            },
          ].map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-indigo-100 bg-white/70 p-6 shadow-sm backdrop-blur transition hover:-translate-y-1 hover:shadow-md"
            >
              <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
              <p className="mt-2 text-sm text-slate-500">{item.description}</p>
            </article>
          ))}
        </section>

        {!loading && user && !role && (
          <p className="mt-8 text-sm text-red-500">
            Your account is missing a role. Please contact an administrator for access.
          </p>
        )}
      </div>
    </main>
  );
}

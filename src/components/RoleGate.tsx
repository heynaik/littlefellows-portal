"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthUser } from "@/lib/auth";
import { getUserRole } from "@/lib/user";

type Role = "admin" | "vendor";

type RoleGateProps = {
  allow?: Role;
  children: React.ReactNode;
  loadingFallback?: React.ReactNode;
  unauthorizedFallback?: React.ReactNode;
};

export default function RoleGate({
  allow,
  children,
  loadingFallback = (
    <div className="flex min-h-[200px] items-center justify-center text-slate-500">
      Checking permissions…
    </div>
  ),
  unauthorizedFallback = (
    <div className="flex min-h-[200px] items-center justify-center text-slate-500">
      You do not have permission to view this page.
    </div>
  ),
}: RoleGateProps) {
  const router = useRouter();
  const { user, loading } = useAuthUser();
  const [role, setRole] = useState<Role | null>(null);
  const [checkingRole, setCheckingRole] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  useEffect(() => {
    let active = true;
    async function resolveRole() {
      if (!user) {
        setRole(null);
        return;
      }
      try {
        setCheckingRole(true);
        const nextRole = await getUserRole(user.uid);
        if (!active) return;
        setRole(nextRole);
      } finally {
        if (active) setCheckingRole(false);
      }
    }
    resolveRole();
    return () => {
      active = false;
    };
  }, [user]);

  if (loading || checkingRole || !user) {
    return <>{loadingFallback}</>;
  }

  if (allow && role && role !== allow) {
    // Redirect to the appropriate dashboard when possible.
    const redirectPath = role === "admin" ? "/admin" : "/vendor/orders";
    router.replace(redirectPath);
    return <>{unauthorizedFallback}</>;
  }

  if (allow && role === null) {
    return <>{loadingFallback}</>;
  }

  return <>{children}</>;
}

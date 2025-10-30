"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Gauge, LayoutGrid, Users, Settings, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "./Logo";

const NAV = [
  { href: "/admin/orders",    label: "Dashboard", icon: Gauge },
  { href: "/admin/vendors",   label: "Vendors",   icon: Users },
  { href: "/admin/analytics", label: "Analytics", icon: LayoutGrid },
  { href: "/admin/settings",  label: "Settings",  icon: Settings },
];

export default function Sidebar(){
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-[240px] flex-col bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur">
      <div className="px-3 pt-5 pb-4 shadow-sm">
        <Logo showText={false} size={60} />
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-md text-sm",
              pathname?.startsWith(href)
                ? "bg-indigo-50 text-indigo-700"
                : "text-slate-700 hover:bg-slate-50"
            )}
          >
            <Icon size={18} />
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="p-4">
        <button
          onClick={() => signOut(auth)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}

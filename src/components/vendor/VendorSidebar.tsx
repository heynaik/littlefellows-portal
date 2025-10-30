"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, LogOut } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "../Logo";

const NAV = [
  { href: "/vendor/orders", label: "Orders", icon: LayoutDashboard },
];

export default function VendorSidebar() {
  const pathname = usePathname();

  return (
    <aside className="sticky top-0 flex h-screen w-[220px] flex-col bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur">
      <div className="px-3 pt-5 pb-4 shadow-sm">
        <Logo showText={false} size={60} />
      </div>
      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={clsx(
                "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-indigo-50 text-indigo-700"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              )}
            >
              <Icon size={18} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 pb-4">
        <button
          onClick={() => signOut(auth)}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-3 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-slate-800"
        >
          <LogOut size={16} />
          Logout
        </button>
        <div className="mt-3 text-center text-xs text-slate-400">
          Developed by LittleFellows
        </div>
      </div>
    </aside>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { Gauge, LayoutGrid, Users, Settings, LogOut, Ticket, ShoppingBag, Smile, BarChart3, BookOpen, ClipboardCheck } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "./Logo";

const NAV_GROUPS = [
  {
    title: "Dashboards",
    items: [
      { href: "/admin", label: "Overview", icon: Gauge },
      { href: "/admin/analytics", label: "Analytics", icon: BarChart3 },
    ]
  },
  {
    title: "Store Management",
    items: [
      { href: "/admin/woo-orders", label: "Incoming Orders", icon: ShoppingBag },
      { href: "/admin/products", label: "Products", icon: LayoutGrid }, // Consider a different icon if possible, e.g., Box or Package
      { href: "/admin/customers", label: "Customers", icon: Users },
      { href: "/admin/child-profiles", label: "Child Profiles", icon: Smile },
      { href: "/admin/stories", label: "Stories", icon: BookOpen },
    ]
  },
  {
    title: "Operations",
    items: [
      { href: "/admin/vendors", label: "Vendors", icon: Users },
      { href: "/admin/assigned", label: "Assigned Jobs", icon: ClipboardCheck },
      { href: "/admin/invites", label: "Manage Invites", icon: Ticket },
    ]
  },
  {
    title: "System",
    items: [
      { href: "/admin/settings", label: "Settings", icon: Settings },
    ]
  }
];

export default function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="sticky top-0 flex h-screen w-[240px] flex-col bg-white/95 shadow-xl ring-1 ring-black/5 backdrop-blur overflow-y-auto">
      <div className="px-5 pt-6 pb-6 text-center">
        <Logo showText={true} size={40} />
      </div>

      <nav className="flex-1 px-3 pb-4 space-y-6">
        {NAV_GROUPS.map((group, idx) => (
          <div key={idx}>
            <div className="px-3 mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
              {group.title}
            </div>
            <div className="space-y-1">
              {group.items.map(({ href, label, icon: Icon }) => {
                // Fix: "Overview" (/admin) should essentially be exact match to avoid highlighting on all sub-pages
                // But other items should match their children (e.g. /admin/stories -> /admin/stories/create)
                const isActive = href === "/admin"
                  ? pathname === href
                  : pathname?.startsWith(href);

                return (
                  <Link
                    key={href}
                    href={href}
                    className={clsx(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                      isActive
                        ? "bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200"
                        : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                    )}
                  >
                    <Icon size={18} className={clsx(isActive ? "text-indigo-600" : "text-slate-400")} />
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-100">
        <button
          onClick={() => signOut(auth)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-50 px-3 py-2.5 text-sm font-bold text-slate-600 hover:bg-red-50 hover:text-red-600 hover:shadow-sm transition-all border border-slate-200 hover:border-red-200"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </aside>
  );
}

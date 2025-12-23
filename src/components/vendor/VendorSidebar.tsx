"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { LayoutDashboard, LogOut, X, Printer } from "lucide-react";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import Logo from "../Logo";

const NAV = [
  { href: "/vendor/orders", label: "Orders", icon: LayoutDashboard },
  { href: "/vendor/printing", label: "Printing", icon: Printer },
];

interface VendorSidebarProps {
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}

export default function VendorSidebar({ isOpen, setIsOpen }: VendorSidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={clsx(
        "fixed inset-y-0 left-0 z-30 flex h-full w-[240px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out md:static md:translate-x-0",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}
    >
      <div className="flex items-center justify-between px-4 pt-5 pb-4 shadow-sm">
        <Logo showText={false} size={50} />
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden p-2 text-slate-400 hover:text-slate-600"
        >
          <X size={20} />
        </button>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setIsOpen(false)} // Close on navigate (mobile)
              className={clsx(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-bold transition-all",
                active
                  ? "bg-indigo-50 text-indigo-700 shadow-sm shadow-indigo-100"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
              )}
            >
              <Icon size={20} />
              <span>{label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="px-4 pb-6">
        <button
          onClick={() => signOut(auth)}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-slate-200 transition-all hover:bg-slate-800 hover:shadow-xl hover:-translate-y-0.5"
        >
          <LogOut size={18} />
          Logout
        </button>
        <div className="mt-4 text-center text-[10px] font-bold uppercase tracking-widest text-slate-300">
          LittleFellows v1.0
        </div>
      </div>
    </aside>
  );
}

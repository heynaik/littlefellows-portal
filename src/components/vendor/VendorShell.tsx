"use client";

import type { ReactNode } from "react";
import VendorSidebar from "./VendorSidebar";
import VendorTopbar from "./VendorTopbar";

export default function VendorShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex">
      <VendorSidebar />
      <div className="min-h-screen flex-1 bg-slate-50">
        <VendorTopbar />
        <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
      </div>
    </div>
  );
}

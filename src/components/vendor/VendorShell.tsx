"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import VendorSidebar from "./VendorSidebar";
import VendorTopbar from "./VendorTopbar";

export default function VendorShell({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <VendorSidebar isOpen={isOpen} setIsOpen={setIsOpen} />

      {/* Overlay for mobile */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 md:hidden animate-in fade-in"
          onClick={() => setIsOpen(false)}
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <VendorTopbar onOpenSidebar={() => setIsOpen(true)} />
        <main className="flex-1 overflow-y-auto px-4 py-8 md:px-8 max-w-7xl mx-auto w-full">
          {children}
        </main>
      </div>
    </div>
  );
}

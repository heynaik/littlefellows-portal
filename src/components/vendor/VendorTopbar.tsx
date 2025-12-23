"use client";

import { Menu } from "lucide-react";

export default function VendorTopbar({ onOpenSidebar }: { onOpenSidebar: () => void }) {
  return (
    <header className="h-16 px-6 flex items-center justify-between md:hidden bg-white border-b border-slate-100 shadow-sm">
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenSidebar}
          className="p-2 -ml-2 rounded-lg text-slate-600 hover:bg-slate-100"
        >
          <Menu size={24} />
        </button>
        <span className="font-bold text-slate-800">Little Fellows</span>
      </div>
    </header>
  );
}

"use client";
import { X } from "lucide-react";
import { useEffect } from "react";

export default function Modal({
  title,
  open,
  onClose,
  children,
  footer,
  size = "md",
}: {
  title: string;
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    if (open) document.addEventListener("keydown", onEsc);
    return () => document.removeEventListener("keydown", onEsc);
  }, [open, onClose]);

  if (!open) return null;

  const widths = { sm: "max-w-md", md: "max-w-xl", lg: "max-w-3xl" }[size];

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-[1px]"
        onClick={onClose}
      />
      {/* Panel */}
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className={`w-full ${widths} rounded-2xl bg-white shadow-xl border border-[var(--border)]`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-base font-semibold">{title}</h3>
            <button className="p-1 rounded hover:bg-slate-100" onClick={onClose}>
              <X size={18} />
            </button>
          </div>
          <div className="px-5 py-4">{children}</div>
          {footer && (
            <div className="px-5 py-4 border-t border-[var(--border)] bg-slate-50/60 rounded-b-2xl">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
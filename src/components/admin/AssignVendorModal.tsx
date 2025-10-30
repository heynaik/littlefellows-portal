// src/components/admin/AssignVendorModal.tsx
"use client";
import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import type { Vendor } from "../../lib/api";
import { getVendors } from "../../lib/api";

export default function AssignVendorModal({
  open,
  onClose,
  onSelect,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (vendorId: string) => void;
}) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    if (!open) return;
    getVendors().then(setVendors).catch(console.error);
  }, [open]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return vendors;
    return vendors.filter(
      (v) =>
        v.vendorId.toLowerCase().includes(s) ||
        v.name.toLowerCase().includes(s) ||
        (v.contactEmail || "").toLowerCase().includes(s)
    );
  }, [vendors, q]);

  return (
    <Modal open={open} onClose={onClose} title="Assign / Reassign Vendor">
      <input
        placeholder="Search vendors…"
        className="mb-3 w-full rounded border px-3 py-2 text-sm"
        value={q}
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {filtered.length === 0 ? (
          <p className="text-sm text-gray-500">No vendors found.</p>
        ) : (
          filtered.map((v) => (
            <button
              key={v.vendorId}
              className="flex w-full items-center justify-between rounded border px-3 py-2 text-left hover:bg-gray-50"
              onClick={() => {
                onSelect(v.vendorId);
                onClose();
              }}
            >
              <div>
                <div className="font-medium">{v.name}</div>
                <div className="text-xs text-gray-500">{v.vendorId} · {v.contactEmail}</div>
              </div>
              <span className="text-xs text-gray-500">{v.active ? "Active" : "Inactive"}</span>
            </button>
          ))
        )}
      </div>
    </Modal>
  );
}
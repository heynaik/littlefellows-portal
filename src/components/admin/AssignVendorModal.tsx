// src/components/admin/AssignVendorModal.tsx
'use client';
import { useEffect, useMemo, useState } from "react";
import Modal from "../../components/Modal";
import type { Vendor } from "../../lib/api";

export default function AssignVendorModal({
  open,
  onClose,
  onSelect,
  vendors,
  loading,
  error,
  onEnsureVendors,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (vendorId: string) => void;
  vendors: Vendor[];
  loading: boolean;
  error: string | null;
  onEnsureVendors?: () => Promise<void> | void;
}) {
  const [q, setQ] = useState("");

  useEffect(() => {
    if (open && vendors.length === 0 && !loading) {
      onEnsureVendors?.();
    }
  }, [open, vendors.length, loading, onEnsureVendors]);

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
        disabled={loading}
      />
      {error && (
        <p className="mb-3 text-sm text-red-600">{error}</p>
      )}
      <div className="max-h-72 space-y-2 overflow-y-auto">
        {loading ? (
          <p className="text-sm text-gray-500">Loading vendors…</p>
        ) : filtered.length === 0 ? (
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

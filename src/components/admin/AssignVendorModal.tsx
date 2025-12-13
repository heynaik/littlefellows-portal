"use client";

import { useEffect, useState } from "react";
import { Loader2, UploadCloud, X } from "lucide-react";
import { getUploadUrl } from "@/lib/api";
import type { Order, Vendor } from "@/lib/types";
import clsx from "clsx";

interface AssignVendorModalProps {
  order: {
    id: number;
    number: string;
    billing: { first_name: string; last_name: string; email: string };
    line_items: any[];
    total: string;
    currency: string;
    status: string;
  };
  onClose: () => void;
  onSuccess: (vendorName: string) => void;
}

export default function AssignVendorModal({ order, onClose, onSuccess }: AssignVendorModalProps) {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loadingVendors, setLoadingVendors] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [vendorId, setVendorId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadVendors();
  }, []);

  async function loadVendors() {
    setLoadingVendors(true);
    try {
      // Use Client SDK to fetch vendors directly (matches Vendors Page logic)
      // This bypasses potential Admin SDK init issues on the server API
      const { collection, query, where, getDocs } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      const q = query(collection(db, "users"), where("role", "==", "vendor"));
      const snap = await getDocs(q);

      const list = snap.docs.map(doc => {
        const data = doc.data();
        return {
          vendorId: doc.id,
          name: data.name || data.email || doc.id,
          email: data.email,
          role: "vendor",
          ...data
        } as Vendor;
      });

      setVendors(list);
    } catch (e) {
      console.error(e);
      setError("Failed to load vendors");
    } finally {
      setLoadingVendors(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      if (!file) throw new Error("Please upload a Final Printing PDF");
      if (!vendorId) throw new Error("Please select a vendor");

      // 1. Upload File
      const ext = file.name.split('.').pop();
      const fileName = `production/${order.number}-final.${ext}`;
      const { url, key: s3Key } = await getUploadUrl(fileName, file.type);

      await fetch(url, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type }
      });

      // 2. Resolve internal order (Create or Update) Direct to Firestore
      const { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp } = await import("firebase/firestore");
      const { db } = await import("@/lib/firebase");

      // Check existence by Woo ID
      const q = query(collection(db, "orders"), where("wcId", "==", order.id));
      const snap = await getDocs(q);

      const payload: any = {
        wcId: order.id,
        orderId: order.number,
        bookTitle: order.line_items.map((i: any) => i.name).join(", "),
        customerName: `${order.billing.first_name} ${order.billing.last_name}`.trim(),
        customerEmail: order.billing.email,
        totalAmount: order.total,
        currency: order.currency,
        stage: "Assigned to Vendor",
        vendorId: vendorId,
        s3Key: s3Key,
        updatedAt: serverTimestamp()
      };

      if (!snap.empty) {
        // Update Existing
        const docId = snap.docs[0].id;
        await updateDoc(doc(db, "orders", docId), payload);
      } else {
        // Create New
        payload.createdAt = serverTimestamp();
        payload.binding = "Soft";
        await addDoc(collection(db, "orders"), payload);
      }

      const vendorName = vendors.find(v => v.vendorId === vendorId)?.name || "Unknown Vendor";
      onSuccess(vendorName);
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">

        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h3 className="font-bold text-lg text-slate-800">Move to Production</h3>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-400 hover:text-slate-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-red-50 text-red-600 text-sm border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                1. Final Printing PDF <span className="text-red-500">*</span>
              </label>
              <div className={clsx(
                "border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center transition-colors cursor-pointer",
                file ? "border-indigo-300 bg-indigo-50" : "border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
              )} onClick={() => document.getElementById('final-pdf-upload')?.click()}>
                <input
                  type="file"
                  id="final-pdf-upload"
                  accept=".pdf"
                  className="hidden"
                  onChange={e => setFile(e.target.files?.[0] || null)}
                />
                {file ? (
                  <>
                    <div className="bg-white p-2 rounded-full shadow-sm mb-2">
                      <UploadCloud className="text-indigo-600" size={24} />
                    </div>
                    <div className="text-sm font-bold text-indigo-700 break-all">{file.name}</div>
                    <div className="text-xs text-indigo-500 mt-1">Click to replace</div>
                  </>
                ) : (
                  <>
                    <UploadCloud className="text-slate-400 mb-2" size={32} />
                    <div className="text-sm font-medium text-slate-600">Click to upload PDF</div>
                    <div className="text-xs text-slate-400 mt-1">Supports High-res PDF</div>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">
                2. Assign Vendor <span className="text-red-500">*</span>
              </label>
              {loadingVendors ? (
                <div className="flex items-center gap-2 text-sm text-slate-500 p-3 bg-slate-50 rounded-xl">
                  <Loader2 className="animate-spin" size={16} /> Loading vendors...
                </div>
              ) : (
                <select
                  className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                  value={vendorId}
                  onChange={e => setVendorId(e.target.value)}
                >
                  <option value="">Select a vendor...</option>
                  {vendors.map(v => (
                    <option key={v.vendorId} value={v.vendorId}>{v.name}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </form>

        <div className="p-6 border-t border-slate-100 bg-slate-50 flex gap-3 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-white hover:border-slate-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !file || !vendorId}
            className="px-6 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center gap-2"
          >
            {submitting && <Loader2 className="animate-spin" size={16} />}
            {submitting ? "Submitting..." : "Submit & Assign"}
          </button>
        </div>

      </div>
    </div>
  );
}

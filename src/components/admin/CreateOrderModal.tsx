'use client';

import { useEffect, useMemo, useState } from 'react';
import { getUploadUrl, createOrder, getVendors } from '@/lib/api';
import type { Order } from '@/lib/types';
import type { Vendor } from '@/lib/api';

type Props = {
  onClose: () => void;
  onCreated: (o: Order) => void; // tell parent to refresh
};

export default function CreateOrderModal({ onClose, onCreated }: Props) {
  const [orderId, setOrderId] = useState('');
  const [bookTitle, setBookTitle] = useState('');
  const [binding, setBinding] = useState<'Soft' | 'Hard'>('Soft');
  const [deadline, setDeadline] = useState<string>(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorId, setVendorId] = useState('');
  const [loadingVendors, setLoadingVendors] = useState(false);
  const [vendorErr, setVendorErr] = useState<string | null>(null);

  const canSubmit = useMemo(
    () => orderId.trim() && bookTitle.trim() && deadline.trim(),
    [orderId, bookTitle, deadline]
  );

  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadVendors() {
      setLoadingVendors(true);
      setVendorErr(null);
      try {
        const list = await getVendors();
        if (!cancelled) {
          setVendors(list);
        }
      } catch (error) {
        if (!cancelled) {
          setVendorErr('Failed to load vendors');
          console.error('[CreateOrderModal] getVendors', error);
        }
      } finally {
        if (!cancelled) {
          setLoadingVendors(false);
        }
      }
    }

    loadVendors();
    return () => {
      cancelled = true;
    };
  }, []);

  function getErrorMessage(error: unknown) {
    if (error instanceof Error) return error.message;
    if (typeof error === "string") return error;
    return "Failed to create order";
  }

  // Upload selected file to S3 via presigned URL; return s3Key
  async function uploadIfAny(): Promise<string | null> {
    if (!file) return null;
    const { url, key } = await getUploadUrl(file.name, file.type || 'application/pdf');
    const put = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': file.type || 'application/pdf' },
      body: file,
    });
    if (!put.ok) throw new Error('PDF upload failed');
    return key;
  }

  async function onSubmit() {
    setErr(null);
    if (!canSubmit) return;
    setBusy(true);
    try {
      const s3Key = await uploadIfAny();

      const toCreate: Order = {
        orderId,
        bookTitle,
        binding,
        deadline,
        notes,
        s3Key: s3Key ?? null,
        vendorId: vendorId || null,
        stage: vendorId ? 'Assigned to Vendor' : 'Uploaded',
      };

      const saved = await createOrder(toCreate);
      onCreated(saved);
      onClose();
    } catch (error) {
      setErr(getErrorMessage(error));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30">
      <div className="w-[680px] rounded-xl bg-white shadow-lg">
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <h2 className="text-lg font-semibold">Create Order</h2>
          <button onClick={onClose} className="px-2 text-gray-500 hover:text-gray-700">✕</button>
        </div>

        {err && (
          <div className="mx-5 mt-4 rounded-md bg-red-50 px-4 py-2 text-sm text-red-700 border border-red-200">
            {err}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 p-5">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Order ID</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={orderId}
              onChange={e => setOrderId(e.target.value)}
              placeholder="e.g. 001"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Book Title</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              value={bookTitle}
              onChange={e => setBookTitle(e.target.value)}
              placeholder="Title"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Binding</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={binding}
              onChange={e => setBinding(e.target.value as 'Soft' | 'Hard')}
            >
              <option value="Soft">Soft</option>
              <option value="Hard">Hard</option>
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Deadline</label>
            <input
              className="w-full rounded-md border px-3 py-2"
              type="date"
              value={deadline}
              onChange={e => setDeadline(e.target.value)}
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Notes</label>
            <textarea
              className="w-full rounded-md border px-3 py-2"
              rows={4}
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="Optional notes"
            />
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">Assign Vendor</label>
            <select
              className="w-full rounded-md border px-3 py-2"
              value={vendorId}
              onChange={e => setVendorId(e.target.value)}
              disabled={loadingVendors}
            >
              <option value="">Unassigned</option>
              {vendors.map((vendor) => (
                <option key={vendor.vendorId} value={vendor.vendorId}>
                  {vendor.name} {vendor.contactEmail ? `(${vendor.contactEmail})` : ''}
                </option>
              ))}
            </select>
            {vendorErr && (
              <p className="mt-1 text-xs text-red-600">{vendorErr}</p>
            )}
          </div>

          <div className="col-span-2">
            <label className="block text-xs text-gray-500 mb-1">PDF (optional)</label>
            <input
              type="file"
              accept="application/pdf"
              onChange={e => setFile(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-5 pb-5">
          <button
            className="rounded-md border px-4 py-2"
            onClick={onClose}
            disabled={busy}
          >
            Cancel
          </button>
          <button
            className="rounded-md bg-purple-600 px-4 py-2 text-white disabled:opacity-60"
            onClick={onSubmit}
            disabled={busy || !canSubmit}
          >
            {busy ? 'Creating…' : 'Create Order'}
          </button>
        </div>
      </div>
    </div>
  );
}

'use client';

import { useState, type ChangeEvent, type FormEvent } from 'react';
import type { Order } from '@/lib/types';
import { getUploadUrl, previewHref, updateOrder } from '@/lib/api';
import AssignVendorModal from './AssignVendorModal';

type Binding = 'Soft' | 'Hard';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

export default function EditOrderModal({
  order,
  onClose,
  onUpdated,
}: {
  order: Order;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const [bookTitle, setBookTitle] = useState(order.bookTitle);
  const [binding, setBinding] = useState<Binding>(order.binding);
  const [deadline, setDeadline] = useState(order.deadline);
  const [notes, setNotes] = useState(order.notes ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [removeFile, setRemoveFile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [assignOpen, setAssignOpen] = useState(false);

  const existingFileName = order.s3Key ? order.s3Key.split('/').pop() ?? 'Current PDF' : null;

  function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    if (nextFile) setRemoveFile(false);
  }

  async function uploadIfRequired(): Promise<string | null> {
    if (removeFile && !file) return null;
    if (!file) return order.s3Key ?? null;

    const contentType = file.type || 'application/pdf';
    const { url, key } = await getUploadUrl(file.name, contentType);
    const res = await fetch(url, {
      method: 'PUT',
      headers: { 'Content-Type': contentType },
      body: file,
    });
    if (!res.ok) {
      throw new Error('Failed to upload PDF');
    }
    return key;
  }

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!order.id) return;
    setBusy(true);
    setErr(null);
    try {
      const nextKey = await uploadIfRequired();
      await updateOrder(order.id, {
        bookTitle,
        binding,
        deadline,
        notes,
        s3Key: nextKey,
      });
      onUpdated();
    } catch (error) {
      setErr(getErrorMessage(error, 'Failed to update order'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
      <form onSubmit={submit} className="card w-full max-w-2xl space-y-5 p-6">
        <div className="flex items-center justify-between">
          <div className="section-title">Edit Order</div>
          <button type="button" className="btn-ghost" onClick={onClose}>
            ✕
          </button>
        </div>

        <div className="rounded-lg border border-slate-200 p-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="subtle">Assigned Vendor</div>
              <div className="text-sm text-slate-700">{order.vendorId ?? 'Unassigned'}</div>
            </div>
            <div className="flex gap-2">
              {order.vendorId && (
                <button
                  type="button"
                  className="btn-ghost"
                  onClick={async () => {
                    if (!order.id) return;
                    setBusy(true);
                    try {
                      await updateOrder(order.id, { vendorId: null });
                      onUpdated();
                    } catch (e) {
                      setErr(getErrorMessage(e, 'Failed to unassign vendor'));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  Unassign
                </button>
              )}
              <button type="button" className="btn-primary" onClick={() => setAssignOpen(true)}>
                {order.vendorId ? 'Reassign' : 'Assign'}
              </button>
            </div>
          </div>
        </div>

        {err && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div>
            <div className="subtle mb-1">Order ID</div>
            <input className="input" value={order.orderId} disabled />
          </div>
          <div>
            <div className="subtle mb-1">Book Title</div>
            <input
              className="input"
              value={bookTitle}
              onChange={(event) => setBookTitle(event.target.value)}
            />
          </div>
          <div>
            <div className="subtle mb-1">Binding</div>
            <select
              className="select"
              value={binding}
              onChange={(event) => setBinding(event.target.value as Binding)}
            >
              <option value="Soft">Soft</option>
              <option value="Hard">Hard</option>
            </select>
          </div>
          <div>
            <div className="subtle mb-1">Deadline</div>
            <input
              type="date"
              className="input"
              value={deadline}
              onChange={(event) => setDeadline(event.target.value)}
            />
          </div>
          <div className="md:col-span-2">
            <div className="subtle mb-1">Notes</div>
            <textarea
              className="textarea"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <div className="subtle text-xs uppercase tracking-wide">Order PDF</div>
          {order.s3Key && !removeFile && (
            <div className="flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-600">
              <div className="flex flex-col">
                <span>{existingFileName}</span>
                <a
                  className="text-xs text-indigo-600 underline"
                  href={previewHref(order.s3Key)}
                  target="_blank"
                  rel="noreferrer"
                >
                  View current PDF
                </a>
              </div>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => {
                  setRemoveFile(true);
                  setFile(null);
                }}
              >
                Remove file
              </button>
            </div>
          )}

          {(removeFile || !order.s3Key) && (
            <p className="text-xs text-slate-500">
              Attach a PDF below (optional). Leave empty to keep no file.
            </p>
          )}

          <input type="file" accept="application/pdf" onChange={onFileChange} />
          {file && (
            <div className="text-xs text-slate-500">
              Selected file: <span className="font-medium text-slate-700">{file.name}</span>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" className="btn-ghost" onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button className="btn-primary" type="submit" disabled={busy}>
            {busy ? 'Saving…' : 'Save'}
          </button>
        </div>
      </form>
      <AssignVendorModal
        open={assignOpen}
        onClose={() => setAssignOpen(false)}
        onSelect={async (vendorId) => {
          if (!order.id) return;
          setBusy(true);
          try {
            await updateOrder(order.id, { vendorId });
            onUpdated();
          } catch (e) {
            setErr(getErrorMessage(e, 'Failed to assign vendor'));
          } finally {
            setBusy(false);
            setAssignOpen(false);
          }
        }}
      />
    </div>
  );
}

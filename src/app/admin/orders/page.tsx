"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { changeStage, deleteOrder, getOrders, getVendors, previewHref } from "@/lib/api";
import type { Vendor } from '@/lib/api';
import type { Order, Stage } from '@/lib/types';
import { STAGES } from '@/lib/types';
import { Search } from 'lucide-react';
import clsx from 'clsx';
import CreateOrderModal from '@/components/admin/CreateOrderModal';
import EditOrderModal from '@/components/admin/EditOrderModal';
import ConfirmDelete from '@/components/admin/ConfirmDelete';
import StageBadge from '@/components/StageBadge';
import { fmtDate } from '@/utils/date';

type BindingFilter = 'All' | 'Soft' | 'Hard';
type StageFilter = 'All' | Stage;
type VendorFilter = 'All' | 'Assigned' | 'Unassigned';
type StatusTab = 'all' | 'new' | 'inProgress' | 'completed';
type SortBy = 'recent' | 'oldest';

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === 'string') return error;
  return fallback;
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [bindingFilter, setBindingFilter] = useState<BindingFilter>('All');
  const [stageFilter, setStageFilter] = useState<StageFilter>('All');
  const [vendorFilter, setVendorFilter] = useState<VendorFilter>('All');
  const [statusTab, setStatusTab] = useState<StatusTab>('all');
  const [sortBy, setSortBy] = useState<SortBy>('recent');
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<Order | null>(null);
  const [deleting, setDeleting] = useState<Order | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [vendorsLoading, setVendorsLoading] = useState(false);
  const [vendorLoadError, setVendorLoadError] = useState<string | null>(null);
  const ordersSignatureRef = useRef<string>("");

  const computeSignature = useCallback((list: Order[]) => {
    return JSON.stringify(
      list
        .map((order) => ({
          id: order.id ?? "",
          updatedAt: order.updatedAt ?? 0,
          stage: order.stage ?? "",
          vendorId: order.vendorId ?? "",
          s3Key: order.s3Key ?? "",
        }))
        .sort((a, b) => a.id.localeCompare(b.id))
    );
  }, []);

  const setOrdersWithSignature = useCallback(
    (updater: (prev: Order[]) => Order[]) => {
      setOrders((prev) => {
        const next = updater(prev);
        const signature = computeSignature(next);
        if (ordersSignatureRef.current === signature) {
          return prev;
        }
        ordersSignatureRef.current = signature;
        return next;
      });
    },
    [computeSignature]
  );

  const refresh = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    if (!silent) {
      setLoading(true);
      setError(null);
    }
    try {
      const data = await getOrders();
      setOrdersWithSignature(() => data);
      setError(null);
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to load orders'));
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  }, [setOrdersWithSignature]);

  useEffect(() => {
    let cancelled = false;
    let inflight = false;

    const tick = async (opts?: { silent?: boolean }) => {
      if (cancelled || inflight) return;
      inflight = true;
      try {
        await refresh(opts);
      } finally {
        inflight = false;
      }
    };

    tick();

    const interval = setInterval(() => tick({ silent: true }), 8000);
    const handleVisibility = () => {
      if (!document.hidden) tick({ silent: true });
    };

    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [refresh]);

  const refreshVendors = useCallback(async () => {
    setVendorsLoading(true);
    setVendorLoadError(null);
    try {
      const list = await getVendors();
      setVendors(list);
    } catch (err) {
      setVendorLoadError(getErrorMessage(err, "Failed to load vendors"));
      console.error("[AdminOrdersPage] getVendors", err);
    } finally {
      setVendorsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshVendors();
  }, [refreshVendors]);

  const vendorLookup = useMemo(() => {
    const lookup = new Map<string, Vendor>();
    vendors.forEach((vendor) => {
      lookup.set(vendor.vendorId, vendor);
    });
    return lookup;
  }, [vendors]);

  const filteredOrders = useMemo(() => {
    const q = search.trim().toLowerCase();
    const filtered = orders.filter((order) => {
      const matchQuery =
        !q ||
        order.orderId.toLowerCase().includes(q) ||
        order.bookTitle.toLowerCase().includes(q) ||
        (order.notes ?? '').toLowerCase().includes(q);
      if (q !== '') {
        return matchQuery;
      }

      const matchBinding =
        bindingFilter === 'All' || order.binding === bindingFilter;
      const stage = (order.stage ?? 'Uploaded') as Stage;
      const matchStage = stageFilter === 'All' || stage === stageFilter;
      const matchVendor =
        vendorFilter === 'All' ||
        (vendorFilter === 'Assigned' && !!order.vendorId) ||
        (vendorFilter === 'Unassigned' && !order.vendorId);
      const stageValue = stage;
      const statusMatches = (() => {
        if (statusTab === 'all') return true;
        const newStages: Stage[] = ['Uploaded', 'Assigned to Vendor'];
        const progressStages: Stage[] = ['Printing', 'Quality Check', 'Packed', 'Shipped to Admin'];
        const completedStages: Stage[] = ['Received by Admin', 'Final Packed for Customer', 'Shipped to Customer', 'Delivered'];
        if (statusTab === 'new') return newStages.includes(stageValue);
        if (statusTab === 'inProgress') return progressStages.includes(stageValue);
        if (statusTab === 'completed') return completedStages.includes(stageValue);
        return true;
      })();

      return matchQuery && matchBinding && matchStage && matchVendor && statusMatches;
    });

    const sorted = [...filtered].sort((a, b) => {
      const aTime = a.updatedAt ?? 0;
      const bTime = b.updatedAt ?? 0;
      return sortBy === 'recent' ? bTime - aTime : aTime - bTime;
    });

    return sorted;
  }, [orders, search, bindingFilter, stageFilter, vendorFilter, statusTab, sortBy]);

  async function handleStageChange(order: Order, nextStage: Stage) {
    if (!order.id) return;
    try {
      setUpdatingId(order.id);
      await changeStage(order.id, nextStage);
      setOrdersWithSignature((prev) =>
        prev.map((existing) =>
          existing.id === order.id
            ? {
                ...existing,
                stage: nextStage,
                updatedAt: Date.now(),
              }
            : existing
        )
      );
      await refresh({ silent: true });
    } catch (err) {
      setError(getErrorMessage(err, 'Failed to update stage'));
    } finally {
      setUpdatingId(null);
    }
  }

  function clearFilters() {
    setSearch('');
    setBindingFilter('All');
    setStageFilter('All');
    setVendorFilter('All');
    setStatusTab('all');
    setSortBy('recent');
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">
            Monitor orders, assignments, and production progress.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button className="btn-ghost" onClick={() => refresh()}>
            Refresh
          </button>
          <button className="btn-primary" onClick={() => setShowCreate(true)}>
            New Order
          </button>
        </div>
      </div>

      <div className="rounded-[28px] border border-slate-200/60 bg-white/90 p-5 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-12 w-full rounded-full border border-slate-200 bg-white pl-12 pr-5 text-sm font-medium text-slate-600 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              placeholder="Search by Order ID, Title, Notes"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          <div className="inline-flex flex-shrink-0 items-center gap-2 rounded-full bg-slate-100 p-1">
            {(
              [
                { value: 'all', label: 'All' },
                { value: 'inProgress', label: 'In Progress' },
                { value: 'completed', label: 'Completed' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusTab(value)}
                className={clsx(
                  'rounded-full px-4 py-2 text-sm font-medium transition',
                  statusTab === value
                    ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-indigo-200'
                    : 'text-slate-600 hover:text-slate-900'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="relative flex-shrink-0 min-w-[200px]">
            <select
              className="h-12 w-full rounded-full border border-slate-200 bg-white px-5 text-sm font-medium text-slate-600 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as StageFilter)}
            >
              <option value="All">All stages</option>
              {STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
          </div>

          <button
            className="inline-flex h-12 items-center rounded-full border border-transparent px-5 text-sm font-medium text-indigo-600 transition hover:text-indigo-500"
            onClick={clearFilters}
          >
            Clear
          </button>
        </div>
      </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="border-b border-[var(--border)] bg-slate-50 px-6 py-3 text-sm font-medium text-slate-500">
          {loading
            ? 'Loading orders…'
            : `${filteredOrders.length} order${
                filteredOrders.length === 1 ? '' : 's'
              }`}
        </div>

        {error && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-slate-50 text-slate-500">
              <tr className="border-b border-slate-200 text-xs font-medium">
                <th className="px-6 py-3 text-left">Order ID</th>
                <th className="px-6 py-3 text-left">Book Title</th>
                <th className="px-6 py-3 text-left">Binding</th>
                <th className="px-6 py-3 text-left">Vendor</th>
                <th className="px-6 py-3 text-left">Stage</th>
                <th className="px-6 py-3 text-left">Updated</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrders.map((order) => {
                const stage = (order.stage ?? 'Uploaded') as Stage;
                const disabled = !order.id || updatingId === order.id;
                const vendor = order.vendorId ? vendorLookup.get(order.vendorId) : undefined;
                return (
                  <tr
                    key={order.id ?? order.orderId}
                    className="border-b border-slate-100 bg-white transition hover:bg-slate-50 last:border-0"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {order.orderId || '—'}
                    </td>
                    <td className="px-6 py-4 text-slate-700">
                      <div className="flex flex-col">
                        <span>{order.bookTitle}</span>
                        {order.notes && (
                          <span className="text-xs text-slate-400">
                            {order.notes}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {order.binding}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {order.vendorId ? (
                        <div className="flex flex-col text-sm text-slate-700">
                          <span>{vendor?.name ?? order.vendorId}</span>
                          {vendor?.contactEmail && (
                            <span className="text-xs text-slate-400">{vendor.contactEmail}</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-slate-400">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-col gap-2">
                        <StageBadge stage={stage} />
                        <select
                          className="select"
                          value={stage}
                          disabled={disabled}
                          onChange={(e) =>
                            handleStageChange(order, e.target.value as Stage)
                          }
                        >
                          {STAGES.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {fmtDate(order.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {order.s3Key ? (
                          <a
                            className="btn-ghost"
                            href={previewHref(order.s3Key)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            View / Download PDF
                          </a>
                        ) : (
                          <span className="text-sm text-slate-400">No PDF</span>
                        )}
                        <button
                          className="btn-ghost"
                          onClick={() => setEditing(order)}
                        >
                          Edit
                        </button>
                        <button
                          className="btn-ghost"
                          onClick={() => setDeleting(order)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredOrders.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-6 py-12 text-center text-sm text-slate-500"
                  >
                    No orders match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {vendorLoadError && (
        <div className="rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {vendorLoadError}
        </div>
      )}

      {showCreate && (
        <CreateOrderModal
          onClose={() => setShowCreate(false)}
          vendors={vendors}
          vendorsLoading={vendorsLoading}
          vendorError={vendorLoadError}
          onEnsureVendors={refreshVendors}
          onCreated={async (created) => {
            setShowCreate(false);
            setOrdersWithSignature((prev) => [created, ...prev]);
            await refresh({ silent: true });
          }}
        />
      )}

      {editing && (
        <EditOrderModal
          order={editing}
          onClose={() => setEditing(null)}
          vendors={vendors}
          vendorsLoading={vendorsLoading}
          vendorError={vendorLoadError}
          onEnsureVendors={refreshVendors}
          onUpdated={async (updated) => {
            setEditing(null);
            setOrdersWithSignature((prev) =>
              prev.map((existing) =>
                existing.id === updated.id ? { ...existing, ...updated } : existing
              )
            );
            await refresh({ silent: true });
          }}
        />
      )}

      {deleting && (
        <ConfirmDelete
          title="Delete order?"
          subtitle={`This will permanently delete order ${deleting.orderId}.`}
          onCancel={() => setDeleting(null)}
          onConfirm={async () => {
            if (!deleting.id) return;
            try {
              await deleteOrder(deleting.id);
              setDeleting(null);
              setOrdersWithSignature((prev) =>
                prev.filter((existing) => existing.id !== deleting.id)
              );
              await refresh({ silent: true });
            } catch (err) {
              setError(getErrorMessage(err, 'Failed to delete order'));
            }
          }}
        />
      )}
    </div>
  );
}

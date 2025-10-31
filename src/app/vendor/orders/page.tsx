"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { changeStage, getOrders, previewHref } from "@/lib/api";
import type { Order, Stage } from "@/lib/types";
import StageBadge from "@/components/StageBadge";
import { fmtDate } from "@/utils/date";
import { Search, XCircle, ChevronDown } from "lucide-react";
import clsx from "clsx";

type StageFilter = "All" | Stage;

const NEW_STAGE_STATES: Stage[] = ["Uploaded", "Assigned to Vendor"];
const VENDOR_UPDATE_STAGES: Stage[] = [
  "Printing",
  "Quality Check",
  "Packed",
  "Shipped to Admin",
];

const FILTERABLE_STAGES: (Stage | 'All')[] = ['All', ...VENDOR_UPDATE_STAGES];

function isNewStage(stage: Stage) {
  return NEW_STAGE_STATES.includes(stage);
}

function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  return fallback;
}

export default function VendorOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<StageFilter>("All");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const ordersSignatureRef = useRef<string>("");

  const computeSignature = useCallback((list: Order[]) => {
    return JSON.stringify(
      list
        .map((order) => ({
          id: order.id ?? "",
          updatedAt: order.updatedAt ?? 0,
          stage: order.stage ?? "",
          vendorId: order.vendorId ?? "",
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
      setErr(null);
    }
    try {
      const data = await getOrders();
      setOrdersWithSignature(() => data);
      setErr(null);
    } catch (error) {
      setErr(getErrorMessage(error, "Failed to load orders"));
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

  const [tab, setTab] = useState<'newOrders' | 'orders'>('newOrders');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();

    const base = orders.filter((o) => {
      const matchesQuery =
        q === "" ||
        o.orderId.toLowerCase().includes(q) ||
        o.bookTitle.toLowerCase().includes(q) ||
        (o.notes ?? "").toLowerCase().includes(q);

      if (q !== "") {
        return matchesQuery;
      }

      const stage = (o.stage ?? "Uploaded") as Stage;
      const matchStage = stageFilter === "All" || stage === stageFilter;
      return matchesQuery && matchStage;
    });

    return base.filter((o) => {
      if (q !== "") return true;
      const stage = (o.stage ?? "Uploaded") as Stage;
      return tab === 'newOrders' ? isNewStage(stage) : !isNewStage(stage);
    });
  }, [orders, search, stageFilter, tab]);

  async function handleStageChange(order: Order, nextStage: Stage) {
    if (!order.id) return;
    try {
      setUpdatingId(order.id);
      await changeStage(order.id, nextStage);
      setOrdersWithSignature((prev) =>
        prev.map((existing) =>
          existing.id === order.id
            ? { ...existing, stage: nextStage, updatedAt: Date.now() }
            : existing
        )
      );
      await refresh({ silent: true });
    } catch (error) {
      setErr(getErrorMessage(error, "Failed to update stage"));
    } finally {
      setUpdatingId(null);
    }
  }

  function clearFilters() {
    setSearch("");
    setStageFilter("All");
    setTab('newOrders');
  }

  const newCount = orders.filter((o) => isNewStage((o.stage ?? 'Uploaded') as Stage)).length;
  const activeCount = orders.length - newCount;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-xl font-semibold text-slate-900">My Orders</h1>
        <p className="text-sm text-slate-500">
          Download PDFs and update production stages.
        </p>
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
                { value: 'newOrders', label: 'New Orders' },
                { value: 'orders', label: 'Orders' },
              ] as const
            ).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setTab(value)}
                className={clsx(
                  'rounded-full px-4 py-2 text-sm font-medium transition',
                  tab === value
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
              className="h-12 w-full appearance-none rounded-full border border-slate-200 bg-white px-5 pr-12 text-sm font-medium text-slate-600 shadow-sm transition focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-100"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as StageFilter)}
            >
              {FILTERABLE_STAGES.map((stage) => (
                <option key={stage} value={stage}>
                  {stage}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
        <button
          className="inline-flex h-12 items-center rounded-full border border-transparent px-4 text-slate-400 transition hover:text-indigo-500"
          onClick={clearFilters}
          aria-label="Clear filters"
        >
          <XCircle className="h-5 w-5" />
        </button>
      </div>
    </div>

      <section className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
        <div className="flex items-center justify-between border-b border-[var(--border)] bg-slate-50 px-6 py-3 text-sm font-medium text-slate-500">
          <span>
            {tab === 'newOrders' ? `New orders: ${newCount}` : `Orders: ${activeCount}`}
          </span>
          <div>
            {loading
              ? "Loading orders…"
              : `${filtered.length} order${filtered.length === 1 ? "" : "s"}`}
          </div>
        </div>

        {err && (
          <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
            {err}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="table">
            <thead className="bg-white">
              <tr className="border-b border-[var(--border)] text-xs uppercase tracking-wide text-slate-500">
                <th className="px-6 py-3">Order ID</th>
                <th className="px-6 py-3">Book Title</th>
                <th className="px-6 py-3">Binding</th>
                <th className="px-6 py-3">Stage</th>
                <th className="px-6 py-3">Updated</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order) => {
                const stage = (order.stage ?? "Uploaded") as Stage;
                const disableStage = !order.id || updatingId === order.id;
                const selectValue = VENDOR_UPDATE_STAGES.includes(stage) ? stage : "";

                return (
                  <tr
                    key={order.id ?? order.orderId}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="px-6 py-4 font-medium text-slate-900">
                      {order.orderId || "—"}
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
                      <div className="flex items-center gap-3">
                        <StageBadge stage={stage} />
                        <select
                          className="select w-40 text-xs"
                          value={selectValue}
                          disabled={disableStage}
                          onChange={(e) => {
                            const next = e.target.value as Stage;
                            if (!next) return;
                            handleStageChange(order, next);
                          }}
                        >
                          <option value="" disabled>
                            {disableStage
                              ? "Updating…"
                              : VENDOR_UPDATE_STAGES.includes(stage)
                              ? "Select stage"
                              : "Update stage"}
                          </option>
                          {VENDOR_UPDATE_STAGES.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-slate-600">
                      {fmtDate(order.updatedAt)}
                    </td>
                    <td className="px-6 py-4 text-right">
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
                    </td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
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
    </div>
  );
}

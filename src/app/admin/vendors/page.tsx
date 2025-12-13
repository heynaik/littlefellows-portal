"use client";

import { useEffect, useState, useMemo } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, orderBy, doc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { getOrders } from "@/lib/api";
import type { Order } from "@/lib/types";
import {
  Phone,
  MapPin,
  Store,
  Trash2,
  Ban,
  CheckCircle,
  AlertTriangle,
  Users,
  Search,
  MoreVertical,
  Mail,
  Briefcase
} from "lucide-react";
import Modal from "@/components/Modal";
import clsx from "clsx";

interface Vendor {
  id: string; // Firestore ID (mapped to vendorId in orders sometimes)
  email: string;
  role: "vendor";
  name?: string;
  phoneNumber?: string;
  altPhone?: string;
  storeName?: string;
  storeAddress?: string;
  isDisabled?: boolean;
  createdAt: any;
}

type ActionType = { type: 'toggle' | 'delete'; vendor: Vendor } | null;

export default function VendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Confirmation State
  const [pendingAction, setPendingAction] = useState<ActionType>(null);
  const [busy, setBusy] = useState(false);

  // Trigger Confirmation
  const requestToggle = (vendor: Vendor) => setPendingAction({ type: 'toggle', vendor });
  const requestDelete = (vendor: Vendor) => setPendingAction({ type: 'delete', vendor });

  // Execute Logic (Keep existing logic)
  const executeAction = async () => {
    if (!pendingAction) return;
    setBusy(true);
    const { type, vendor } = pendingAction;

    try {
      if (type === 'toggle') {
        await updateDoc(doc(db, "users", vendor.id), {
          isDisabled: !vendor.isDisabled,
          updatedAt: serverTimestamp()
        });
      } else if (type === 'delete') {
        await deleteDoc(doc(db, "users", vendor.id));
      }
      setPendingAction(null);
    } catch (e: any) {
      console.error("Action error:", e);
      setError(`Failed to ${type === 'toggle' ? 'update status' : 'delete vendor'}: ` + e.message);
      setPendingAction(null);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    // Live Vendors
    // We fetch ALL vendors (filtered by role) and sort client-side to avoid needing a composite index on [role, createdAt]
    const q = query(collection(db, "users"), where("role", "==", "vendor"));

    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Vendor[];

      // Client-side sort
      data.sort((a, b) => {
        const tA = a.createdAt?.seconds ?? 0;
        const tB = b.createdAt?.seconds ?? 0;
        return tB - tA; // Descending
      });

      setVendors(data);
    }, (err) => {
      console.error("Vendor listener error:", err);
      // Don't show critical UI error for this, just log it, or show a toast?
      // actually if this fails, the list is empty. Better to show error.
      setError(err.message);
    });

    // Fetch Orders for stats
    getOrders().then(setOrders).catch(console.error).finally(() => setLoading(false));

    return () => unsub();
  }, []);

  // metrics
  const stats = useMemo(() => {
    const total = vendors.length;
    const active = vendors.filter(v => !v.isDisabled).length;

    // Performance map
    const perfText: Record<string, { active: number, completed: number }> = {};
    vendors.forEach(v => perfText[v.id] = { active: 0, completed: 0 });

    orders.forEach(o => {
      if (o.vendorId && perfText[o.vendorId]) {
        const s = (o.stage || "") as string;
        if (s === 'Delivered' || s === 'Completed') {
          perfText[o.vendorId].completed++;
        } else if (s !== 'Cancelled') {
          perfText[o.vendorId].active++;
        }
      }
    });

    return { total, active, perfText };
  }, [vendors, orders]);

  const filteredVendors = vendors.filter(v =>
    search === "" ||
    v.name?.toLowerCase().includes(search.toLowerCase()) ||
    v.storeName?.toLowerCase().includes(search.toLowerCase()) ||
    v.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Vendor Management</h1>
          <p className="mt-1 text-sm text-slate-500">Manage registered partners and monitor their performance.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        <div className="rounded-[20px] bg-white p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Total Vendors</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.total}</p>
          </div>
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl"><Users size={24} /></div>
        </div>
        <div className="rounded-[20px] bg-white p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Active Partners</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{stats.active}</p>
          </div>
          <div className="p-3 bg-green-50 text-green-600 rounded-xl"><CheckCircle size={24} /></div>
        </div>
        <div className="rounded-[20px] bg-white p-5 border border-slate-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-500">Pending Actions</p>
            <p className="mt-1 text-3xl font-bold text-slate-900">{vendors.filter(v => v.isDisabled).length}</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl"><Ban size={24} /></div>
        </div>
      </div>

      <div className="rounded-[24px] border border-slate-100 bg-white shadow-sm overflow-hidden">
        {/* Toolbar */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between gap-4">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Search vendors..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 h-10 rounded-full border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-400 transition"
            />
          </div>
          <div className="text-sm text-slate-500 font-medium">
            Showing {filteredVendors.length} vendors
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-100 text-xs uppercase text-slate-500 font-semibold tracking-wide">
              <tr>
                <th className="px-6 py-4">Vendor Details</th>
                <th className="px-6 py-4">Store Info</th>
                <th className="px-6 py-4">Performance</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400">Loading vendors...</td></tr>
              ) : filteredVendors.length === 0 ? (
                <tr><td colSpan={5} className="p-12 text-center text-slate-400">No vendors found matching your search.</td></tr>
              ) : (
                filteredVendors.map((vendor) => {
                  const metrics = stats.perfText[vendor.id] || { active: 0, completed: 0 };
                  return (
                    <tr key={vendor.id} className="group hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                            {vendor.name ? vendor.name.substring(0, 2).toUpperCase() : "??"}
                          </div>
                          <div>
                            <div className="font-semibold text-slate-900">{vendor.name || "Unnamed Vendor"}</div>
                            <div className="text-slate-400 flex items-center gap-1.5 text-xs mt-0.5">
                              <Mail size={12} /> {vendor.email}
                            </div>
                            {vendor.phoneNumber && (
                              <div className="text-slate-400 flex items-center gap-1.5 text-xs mt-0.5">
                                <Phone size={12} /> {vendor.phoneNumber}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2 font-medium text-slate-700">
                            <Store size={14} className="text-indigo-500" />
                            {vendor.storeName || "—"}
                          </div>
                          <div className="flex items-center gap-2 text-xs text-slate-500">
                            <MapPin size={14} className="text-slate-400" />
                            <span className="truncate max-w-[200px]">{vendor.storeAddress || "No address"}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-700 leading-none">{metrics.active}</div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Active</div>
                          </div>
                          <div className="h-8 w-px bg-slate-100"></div>
                          <div className="text-center">
                            <div className="text-lg font-bold text-slate-700 leading-none">{metrics.completed}</div>
                            <div className="text-[10px] uppercase font-bold text-slate-400 mt-1">Done</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={clsx(
                          "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold shadow-sm border",
                          vendor.isDisabled
                            ? "bg-red-50 text-red-700 border-red-100"
                            : "bg-emerald-50 text-emerald-700 border-emerald-100"
                        )}>
                          {vendor.isDisabled ? <Ban size={12} /> : <CheckCircle size={12} />}
                          {vendor.isDisabled ? "Disabled" : "Active"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => requestToggle(vendor)}
                            className="btn-ghost p-2 text-slate-500 hover:text-indigo-600 hover:bg-white"
                            title={vendor.isDisabled ? "Enable" : "Disable"}
                          >
                            <Ban size={16} />
                          </button>
                          <button
                            onClick={() => requestDelete(vendor)}
                            className="btn-ghost p-2 text-slate-500 hover:text-red-600 hover:bg-white"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Modal */}
      <Modal
        title={pendingAction?.type === 'delete' ? "Delete Vendor?" : "Confirm Action"}
        open={!!pendingAction}
        onClose={() => !busy && setPendingAction(null)}
        footer={
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setPendingAction(null)}
              disabled={busy}
              className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              onClick={executeAction}
              disabled={busy}
              className={clsx(
                "rounded-lg px-4 py-2 text-sm font-medium text-white shadow-sm transition",
                pendingAction?.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
              )}
            >
              {busy ? "Processing..." : pendingAction?.type === 'delete' ? "Delete Forever" : "Confirm"}
            </button>
          </div>
        }
      >
        <div className="flex gap-4">
          <div className={clsx(
            "mt-0.5 flex h-12 w-12 shrink-0 items-center justify-center rounded-full border-4",
            pendingAction?.type === 'delete' ? 'bg-red-50 border-red-50 text-red-600' : 'bg-amber-50 border-amber-50 text-amber-600'
          )}>
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <h4 className="text-base font-semibold text-slate-900">
              {pendingAction?.type === 'delete' ? "You are about to delete a vendor" : pendingAction?.vendor.isDisabled ? "Enable this vendor?" : "Disable this vendor?"}
            </h4>
            <p className="mt-2 text-sm text-slate-500 leading-relaxed">
              {pendingAction?.type === 'delete'
                ? "This action cannot be undone. This will permanently remove the vendor's account, store details, and all associated data."
                : pendingAction?.vendor.isDisabled
                  ? "This vendor will be able to access their account and receive orders again."
                  : "This will block the vendor from logging in and accessing the portal. Existing orders might be affected."}
            </p>
          </div>
        </div>
      </Modal>

    </div>
  );
}
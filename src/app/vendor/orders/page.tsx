"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import type { Order, Stage } from "@/lib/types";
import {
  FileText,
  Loader2,
  Package,
  PackageOpen,
  Truck,
  CheckCircle2,
  Printer,
  MoreHorizontal,
  RefreshCcw,
  Search
} from "lucide-react";
import clsx from "clsx";
import { format } from "date-fns";

// Stages the vendor is allowed to manage
const VENDOR_STAGES: Stage[] = [
  "Assigned to Vendor",
  "Printing",
  "Quality Check",
  "Packed",
  "Shipped to Admin"
];

export default function VendorDashboard() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    // Real-time listener secured by Vendor ID
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      if (!user) {
        setLoading(false);
        setOrders([]); // No user, no orders
        return;
      }

      setLoading(true);
      const q = query(collection(db, "orders"), where("vendorId", "==", user.uid));

      const unsubDocs = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
        // Sort safely by createdAt desc
        data.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        setOrders(data);
        setLoading(false);
      }, (err) => {
        console.error("Dashboard listener failed:", err);
        setLoading(false);
      });

      return () => unsubDocs();
    });

    return () => unsubAuth();
  }, []);

  const handleStageUpdate = async (orderId: string, newStage: Stage) => {
    if (!orderId) return;
    setUpdatingId(orderId);
    try {
      // Direct Firestore Update
      await updateDoc(doc(db, "orders", orderId), {
        stage: newStage,
        updatedAt: Date.now()
      });
      // No manual state update needed, onSnapshot will handle it
    } catch (err) {
      console.error("Failed to update status", err);
      alert("Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredOrders = orders.filter(o =>
    o.bookTitle.toLowerCase().includes(search.toLowerCase()) ||
    o.orderId.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Vendor Dashboard</h1>
            <p className="text-slate-500 mt-2">Manage your printing queue and updates.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative group">
              <input
                type="text"
                placeholder="Search orders..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all w-64 text-sm font-medium"
              />
              <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
            </div>
            {/* Auto-updating, no refresh needed */}
          </div>
        </div>

        {/* Content Area */}
        {loading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
            <p className="text-slate-500 font-medium animate-pulse">Loading your dashboard...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500">
            <div className="bg-slate-100 p-6 rounded-full mb-6">
              <PackageOpen className="text-slate-400" size={48} />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">No Orders Assigned</h3>
            <p className="text-slate-500 max-w-sm mx-auto">
              You currently have no new printing tasks assigned to you. When an admin assigns an order, it will appear here instantly.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                    <th className="p-5 pl-6">Order Details</th>
                    <th className="p-5">Book Info</th>
                    <th className="p-5">Current Stage</th>
                    <th className="p-5 text-right pr-6">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredOrders.length === 0 ? (
                    <tr><td colSpan={4} className="p-16 text-center text-slate-400">No orders match your search.</td></tr>
                  ) : (
                    filteredOrders.map(order => (
                      <tr key={order.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="p-5 pl-6">
                          <div className="flex flex-col">
                            <span className="font-bold text-slate-800 text-sm">#{order.orderId}</span>
                            <span className="text-xs text-slate-500 mt-1">{format(new Date(order.createdAt || Date.now()), 'MMM d, yyyy')}</span>
                            {order.notes && (
                              <span className="mt-1 inline-block px-2 py-0.5 rounded bg-yellow-50 text-yellow-700 text-[10px] font-bold border border-yellow-100 max-w-fit">
                                NOTE: {order.notes}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="font-semibold text-slate-800 text-sm">{order.bookTitle}</div>
                          <div className={clsx(
                            "mt-1.5 inline-flex items-center gap-1 px-2 py-1 rounded text-[10px] font-bold uppercase tracking-wide border",
                            order.binding === 'Hard' ? 'bg-indigo-50 text-indigo-700 border-indigo-100' : 'bg-slate-100 text-slate-600 border-slate-200'
                          )}>
                            {order.binding === 'Hard' ? 'Hardcover' : 'Softcover'}
                          </div>
                        </td>
                        <td className="p-5">
                          <div className="relative inline-block w-48">
                            <select
                              value={order.stage || "Assigned to Vendor"}
                              onChange={(e) => handleStageUpdate(order.id!, e.target.value as Stage)}
                              disabled={!!updatingId}
                              className={clsx(
                                "appearance-none w-full pl-9 pr-8 py-2 rounded-xl text-xs font-bold shadow-sm border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer",
                                order.stage === 'Shipped to Admin' ? 'bg-green-50 border-green-200 text-green-700' :
                                  order.stage === 'Printing' ? 'bg-blue-50 border-blue-200 text-blue-700' :
                                    'bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600'
                              )}
                            >
                              {VENDOR_STAGES.map(s => (
                                <option key={s} value={s}>{s}</option>
                              ))}
                            </select>

                            {/* Icon Overlay */}
                            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
                              {updatingId === order.id ? (
                                <Loader2 size={14} className="animate-spin text-slate-400" />
                              ) : order.stage === 'Printing' ? (
                                <Printer size={14} className="text-blue-500" />
                              ) : order.stage === 'Shipped to Admin' ? (
                                <Truck size={14} className="text-green-500" />
                              ) : (
                                <Package size={14} className="text-slate-400" />
                              )}
                            </div>
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                              <MoreHorizontal size={14} />
                            </div>
                          </div>
                        </td>
                        <td className="p-5 text-right pr-6">
                          {order.s3Key ? (
                            <a
                              href={`/api/view-url?key=${encodeURIComponent(order.s3Key)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-indigo-200 transition-all hover:-translate-y-0.5"
                            >
                              <FileText size={16} />
                              Download PDF
                            </a>
                          ) : (
                            <button disabled className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-400 rounded-xl text-sm font-bold cursor-not-allowed">
                              <FileText size={16} />
                              No PDF
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

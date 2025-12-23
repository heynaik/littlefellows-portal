"use client";

import { useEffect, useState } from "react";
import { db } from "@/lib/firebase";
import { collection, query, where, onSnapshot, getDocs } from "firebase/firestore";
import { Order, Vendor, STAGES } from "@/lib/types"; // Import STAGES
import {
    ClipboardCheck,
    Loader2,
    Package,
    FileText,
    Search,
    Filter,
    Edit,
    Trash2
} from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

export default function AssignedJobsPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [vendors, setVendors] = useState<{ [key: string]: string }>({});
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [vendorFilter, setVendorFilter] = useState("all");

    // Reassign Modal State
    const [reassignOrder, setReassignOrder] = useState<Order | null>(null);
    const [newVendorId, setNewVendorId] = useState("");
    const [processing, setProcessing] = useState(false);

    // Stage Update State
    const [updatingStageId, setUpdatingStageId] = useState<string | null>(null);

    useEffect(() => {
        // 1. Fetch Vendors Map
        const fetchVendors = async () => {
            const q = query(collection(db, "users"), where("role", "==", "vendor"));
            const vSnap = await getDocs(q);
            const vMap: { [key: string]: string } = {};
            vSnap.forEach(doc => {
                const data = doc.data() as Vendor;
                vMap[doc.id] = data.name || data.email || "Unknown";
            });
            setVendors(vMap);
        };

        fetchVendors();

        // 2. Real-time Orders Listener (Assigned only)
        const q = query(
            collection(db, "orders"),
            where("vendorId", "!=", null)
        );

        // Simpler to listen to all and filter client side for now to avoid index issues on dev
        const allOrdersQuery = collection(db, "orders");

        const unsub = onSnapshot(allOrdersQuery, (snapshot) => {
            const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
            const assigned = data.filter(o => o.vendorId);

            assigned.sort((a, b) => {
                const getMillis = (d: any) => d?.seconds ? d.seconds * 1000 : (typeof d === 'number' ? d : 0);
                return getMillis(b.createdAt) - getMillis(a.createdAt);
            });

            setOrders(assigned);
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleUnassign = async (orderId: string) => {
        if (!confirm("Are you sure you want to unassign this order? It will be removed from the vendor's dashboard.")) return;

        try {
            const { updateDoc, doc, deleteField } = await import("firebase/firestore");
            await updateDoc(doc(db, "orders", orderId), {
                vendorId: deleteField(),
                stage: "Uploaded",
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error("Unassign failed", err);
            alert("Failed to unassign order");
        }
    };

    const handleStageUpdate = async (orderId: string, newStage: string) => {
        if (!orderId) return;
        setUpdatingStageId(orderId);
        try {
            const { updateDoc, doc } = await import("firebase/firestore");
            await updateDoc(doc(db, "orders", orderId), {
                stage: newStage,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error("Failed to update stage", err);
            alert("Failed to update stage");
        } finally {
            setUpdatingStageId(null);
        }
    };

    const openReassignModal = (order: Order) => {
        setReassignOrder(order);
        setNewVendorId(order.vendorId || "");
    };

    const handleReassignSubmit = async () => {
        if (!reassignOrder || !newVendorId) return;
        if (newVendorId === reassignOrder.vendorId) {
            setReassignOrder(null);
            return;
        }

        setProcessing(true);
        try {
            const { updateDoc, doc } = await import("firebase/firestore");
            await updateDoc(doc(db, "orders", reassignOrder.id!), {
                vendorId: newVendorId,
                stage: "Assigned to Vendor",
                updatedAt: Date.now()
            });
            setReassignOrder(null);
        } catch (err) {
            console.error("Reassign failed", err);
            alert("Failed to reassign vendor");
        } finally {
            setProcessing(false);
        }
    };


    const filteredOrders = orders.filter(o => {
        const matchesSearch =
            o.bookTitle.toLowerCase().includes(search.toLowerCase()) ||
            o.orderId.toLowerCase().includes(search.toLowerCase());

        const matchesVendor = vendorFilter === "all" || o.vendorId === vendorFilter;

        return matchesSearch && matchesVendor;
    });

    return (
        <div className="min-h-screen bg-slate-50 p-8 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                {/* Header */}
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            <ClipboardCheck className="text-indigo-600" />
                            Assigned Jobs
                        </h1>
                        <p className="text-slate-500 mt-2">Monitor all products currently with vendors.</p>
                    </div>

                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <Filter className="absolute left-3 top-3 text-slate-400" size={16} />
                            <select
                                value={vendorFilter}
                                onChange={(e) => setVendorFilter(e.target.value)}
                                className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-sm font-medium appearance-none min-w-[180px]"
                            >
                                <option value="all">All Vendors</option>
                                {Object.entries(vendors).map(([id, name]) => (
                                    <option key={id} value={id}>{name}</option>
                                ))}
                            </select>
                        </div>

                        <div className="relative group">
                            <input
                                type="text"
                                placeholder="Search jobs..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all w-64 text-sm font-medium"
                            />
                            <Search className="absolute left-3.5 top-3 text-slate-400" size={16} />
                        </div>
                    </div>
                </div>

                {/* Content */}
                {loading ? (
                    <div className="flex flex-col items-center justify-center py-20">
                        <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                        <p className="text-slate-500 font-medium">Loading assigned jobs...</p>
                    </div>
                ) : filteredOrders.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
                        <div className="bg-slate-50 p-4 rounded-full inline-block mb-4">
                            <ClipboardCheck className="text-slate-400" size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-slate-900">No Jobs Found</h3>
                        <p className="text-slate-500">No orders match the current filters.</p>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                    <th className="p-5 pl-6">Job Details</th>
                                    <th className="p-5">Assigned Vendor</th>
                                    <th className="p-5">Current Stage</th>
                                    <th className="p-5 text-right pr-6">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {filteredOrders.map(order => (
                                    <tr key={order.orderId} className="group hover:bg-slate-50/50 transition-colors">
                                        <td className="p-5 pl-6">
                                            <div className="flex items-start gap-4">
                                                <div className="h-12 w-12 bg-slate-100 rounded-lg border border-slate-200 overflow-hidden flex-shrink-0 flex items-center justify-center text-xl">
                                                    {order.coverImage ? (
                                                        <img src={order.coverImage} className="w-full h-full object-cover" />
                                                    ) : (
                                                        "📖"
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900 text-sm">#{order.orderId}</div>
                                                    <div className="text-slate-600 text-sm">{order.bookTitle}</div>
                                                    <div className="text-xs text-slate-400 mt-1">
                                                        {(() => {
                                                            let date = new Date();
                                                            const created: any = order.createdAt;
                                                            if (typeof created === 'number') date = new Date(created);
                                                            else if (created?.seconds) date = new Date(created.seconds * 1000);
                                                            return format(date, 'MMM d, yyyy');
                                                        })()}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="p-5">
                                            <div className="font-medium text-slate-800 text-sm">
                                                {vendors[order.vendorId!] || "Unknown Vendor"}
                                            </div>
                                        </td>

                                        {/* Editable Stage */}
                                        <td className="p-5">
                                            <div className="relative inline-block w-48">
                                                <select
                                                    value={order.stage}
                                                    onChange={(e) => handleStageUpdate(order.id!, e.target.value)}
                                                    disabled={updatingStageId === order.id}
                                                    className={clsx(
                                                        "appearance-none w-full pl-3 pr-8 py-2 rounded-xl text-xs font-bold shadow-sm border transition-all focus:outline-none focus:ring-2 focus:ring-indigo-500/20 cursor-pointer",
                                                        order.stage === 'Shipped to Admin' ? "bg-green-50 border-green-200 text-green-700" :
                                                            order.stage === 'Printing' ? "bg-blue-50 border-blue-200 text-blue-700" :
                                                                "bg-white border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600"
                                                    )}
                                                >
                                                    {STAGES.map(s => (
                                                        <option key={s} value={s}>{s}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    {updatingStageId === order.id ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : (
                                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6" /></svg>
                                                    )}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="p-5 text-right pr-6">
                                            <div className="flex items-center justify-end gap-2">
                                                <button
                                                    onClick={() => openReassignModal(order)}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                                                    title="Edit Assignment"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleUnassign(order.id!)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                    title="Unassign / Delete"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {/* Reassign Modal */}
                {reassignOrder && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200">
                        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm overflow-hidden p-6 space-y-6">
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-900">Reassign Order</h3>
                                <p className="text-sm text-slate-500 mt-1">Select a new vendor for order #{reassignOrder.orderId}</p>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">New Vendor</label>
                                <select
                                    className="w-full h-11 rounded-xl border border-slate-200 px-3 text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 bg-white"
                                    value={newVendorId}
                                    onChange={e => setNewVendorId(e.target.value)}
                                >
                                    <option value="">Select Vendor...</option>
                                    {Object.entries(vendors).map(([id, name]) => (
                                        <option key={id} value={id}>{name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="flex gap-3">
                                <button
                                    onClick={() => setReassignOrder(null)}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-sm hover:bg-slate-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleReassignSubmit}
                                    disabled={processing || !newVendorId}
                                    className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-sm hover:bg-indigo-700 shadow-lg shadow-indigo-200 disabled:opacity-50 disabled:shadow-none transition-all flex items-center justify-center gap-2"
                                >
                                    {processing && <Loader2 className="animate-spin" size={14} />}
                                    Save
                                </button>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    );
}

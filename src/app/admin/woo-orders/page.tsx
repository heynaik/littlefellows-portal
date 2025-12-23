"use client";

import { useAuthUser } from "@/lib/auth";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { db } from "@/lib/firebase";
import { collection, onSnapshot, query, addDoc, serverTimestamp, getDocs, where, doc, updateDoc } from "firebase/firestore";
import { format } from "date-fns";
import {
    Eye, Search, Filter, Loader2, X, Download, MessageSquare,
    User, Mail, Phone, MapPin, Mic, UploadCloud, Play,
    ChevronLeft, ChevronRight, Music, CheckCircle2, AlertCircle, Trash2, ArrowRight,

    FileText
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { StatusBadge } from "@/components/StatusBadge";
import { VoiceControl } from "@/components/VoiceControl";
import { PageHeader } from "@/components/ui/PageHeader";
import { getUploadUrl } from "@/lib/api";
import { isPriorityOrder } from "@/lib/utils";
import { exportToCSV } from "@/lib/export-utils";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { WooCommerceOrder } from "@/lib/types";



/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */
export default function WooOrdersPage() {
    const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [statusFilter, setStatusFilter] = useState("any");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    const { user } = useAuthUser();
    const router = useRouter();

    // Fetch Logic
    async function fetchOrders() {
        setLoading(true);
        try {
            const p = new URLSearchParams({
                page: String(page),
                per_page: "20",
                search: search,
                status: statusFilter,
            });
            const token = user ? await user.getIdToken() : "";
            const res = await fetch(`/api/woo-orders?${p.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error("Failed to load orders");
            const data = await res.json();
            setOrders(data.orders || []);
            setTotalPages(data.totalPages || 1);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [page, search, statusFilter, user]);

    // REAL-TIME LISTENER: Merge Firestore updates (stage, assignments) into local state
    useEffect(() => {
        // Listen to all orders for simplicity in this context, or refine query if needed.
        // Since we are paginating via WooCommerce API, we can't easily query *only* displayed orders from Firestore 
        // without a complex "in" query which might exceed limits.
        // A simple approach for now: Listen to changed docs in the 'orders' collection.

        const q = query(collection(db, "orders"));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            // Create a map of changes for O(1) lookup
            // Key: WooCommerce ID (string), Value: Firestore Data
            const changes = new Map();
            snapshot.docChanges().forEach((change) => {
                const data = change.doc.data();
                const wcId = data.wcId || data.id; // Fallback if needed, though wcId is preferred

                if (wcId && (change.type === "added" || change.type === "modified")) {
                    changes.set(String(wcId), data);
                }
            });

            if (changes.size === 0) return;

            setOrders(prevOrders => {
                // Check if any visible order needs updating
                const needsUpdate = prevOrders.some(o => changes.has(String(o.id)));
                if (!needsUpdate) return prevOrders;

                return prevOrders.map(order => {
                    const fireData = changes.get(String(order.id));
                    if (fireData) {
                        return {
                            ...order,
                            status: fireData.stage !== undefined ? fireData.stage : order.status,
                            vendor_name: fireData.vendorName !== undefined ? fireData.vendorName : order.vendor_name,
                            s3Key: fireData.s3Key !== undefined ? fireData.s3Key : (fireData.vendor_upload?.url || order.s3Key)
                        };
                    }
                    return order;
                });
            });
        });

        return () => unsubscribe();
    }, []);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchOrders();
    };


    /* -------------------------------------------------------------------------- */
    /*                                   Render                                   */
    /* -------------------------------------------------------------------------- */
    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-6">

            {/* Header Area */}
            <PageHeader
                title="Incoming Orders"
                description="Manage and personalize your incoming orders."
            >
                <div className="flex gap-3 relative">
                    <div className="relative group">
                        <input
                            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all w-64 text-sm font-medium"
                            placeholder="Search by Order # or Name..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch(e)}
                        />
                        <Search className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    </div>

                    <select
                        className="pl-4 pr-8 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all text-sm font-medium text-slate-600 appearance-none cursor-pointer hover:bg-slate-50"
                        value={statusFilter}
                        onChange={(e) => {
                            setStatusFilter(e.target.value);
                            setPage(1);
                        }}
                    >
                        <option value="any">All Statuses</option>
                        <option value="processing">Processing</option>
                        <option value="pending">Pending</option>
                        <option value="on-hold">On Hold</option>
                        <option value="completed">Completed</option>
                        <option value="cancelled">Cancelled</option>
                        <option value="refunded">Refunded</option>
                        <option value="failed">Failed</option>
                        <option value="trash">Trash</option>
                    </select>

                    <button
                        onClick={() => {
                            exportToCSV(orders, `orders-export-${format(new Date(), 'yyyy-MM-dd')}`);
                            toast.success("Order export started.");
                        }}
                        className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-indigo-600 font-bold py-2.5 px-4 rounded-xl shadow-sm transition-all h-[42px]"
                        title="Export Orders to CSV"
                    >
                        <FileText size={18} />
                        <span className="hidden sm:inline">Export</span>
                    </button>
                </div>
            </PageHeader >

            {/* Main Content Table */}
            < div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden" >
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-[11px] uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-4 py-3 text-left w-[140px]">Order</th>
                                <th className="px-4 py-3 text-left w-[120px]">Date</th>
                                <th className="px-4 py-3 text-left">Product</th>
                                <th className="px-4 py-3 text-left">Customer</th>
                                <th className="px-4 py-3 text-left w-[140px]">Status</th>
                                <th className="px-4 py-3 text-right w-[100px]">Total</th>
                                <th className="px-4 py-3 text-right w-[120px]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <TableSkeleton columns={7} rows={5} />
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-16 text-center text-slate-400">
                                        No orders found.
                                    </td>
                                </tr>
                            ) : (
                                orders.map((order: any) => {
                                    const isPriority = isPriorityOrder(order.date_created, order.status);
                                    return (
                                        <tr
                                            key={order.id}
                                            className={`
                                                group transition-all hover:bg-slate-50/80 cursor-pointer border-b border-slate-50 last:border-none
                                                ${isPriority ? 'bg-red-50/30' : ''}
                                            `}
                                            onClick={() => router.push(`/admin/woo-orders/${order.id}`)}
                                        >
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shadow-sm ${isPriority ? 'bg-red-100 text-red-600' : 'bg-white border border-slate-200 text-slate-600'}`}>
                                                        {order.billing.first_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 text-sm">
                                                            #{order.number}
                                                        </div>
                                                        {isPriority && (
                                                            <div className="mt-0.5">
                                                                <span className="bg-red-100 text-red-700 text-[9px] px-1.5 py-0.5 rounded-full uppercase font-extrabold tracking-wide">
                                                                    Priority
                                                                </span>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="text-sm text-slate-700 font-medium">
                                                    {format(new Date(order.date_created), "MMM dd, yyyy")}
                                                </div>
                                                <div className="text-[11px] text-slate-400 font-medium">
                                                    {format(new Date(order.date_created), "hh:mm a")}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col gap-2.5">
                                                    {order.line_items?.map((item: any, idx: number) => {
                                                        const childNameMeta = item.meta_data.find((m: any) => m.key.includes("first name") || m.key.includes("Child’s name") || m.key === "Child Name");
                                                        const childAgeMeta = item.meta_data.find((m: any) => m.key.includes("age") || m.key === "Child Age");
                                                        const childName = childNameMeta?.display_value || childNameMeta?.value;
                                                        const childAge = childAgeMeta?.display_value || childAgeMeta?.value;

                                                        return (
                                                            <div key={idx} className="flex items-start gap-3">
                                                                <div className="w-10 h-10 rounded-lg bg-slate-50 border border-slate-200 overflow-hidden flex-shrink-0 shadow-sm group-hover:border-slate-300 transition-colors">
                                                                    {item.image?.src ? (
                                                                        <img src={item.image.src} alt="" className="w-full h-full object-cover" />
                                                                    ) : (
                                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-[10px]">📷</div>
                                                                    )}
                                                                </div>
                                                                <div className="min-w-0 max-w-[220px]">
                                                                    <div className="text-sm font-bold text-slate-800 leading-tight mb-1" title={item.name}>{item.name.split('-')[0]}</div>
                                                                    {(childName || childAge) && (
                                                                        <div className="flex flex-wrap gap-1.5">
                                                                            {childName && (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                                    👶 {childName}
                                                                                </span>
                                                                            )}
                                                                            {childAge && (
                                                                                <span className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                                                                                    🎂 {childAge}
                                                                                </span>
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex items-start gap-3">
                                                    <div className="min-w-0">
                                                        <div className="text-sm font-bold text-slate-800">{order.billing.first_name} {order.billing.last_name}</div>
                                                        <div className="text-xs text-slate-500 truncate max-w-[160px] font-medium">{order.billing.email}</div>
                                                        <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
                                                            <MapPin size={10} />
                                                            <span className="truncate max-w-[150px]">{order.billing.city}, {order.billing.state}</span>
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top">
                                                <div className="flex flex-col items-start gap-1">
                                                    <StatusBadge status={order.status} />
                                                    {order.vendor_name && (
                                                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[120px] flex items-center gap-1">
                                                            <User size={9} /> {order.vendor_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-4 py-3 align-top font-mono text-sm font-semibold text-slate-700 text-right">
                                                <span dangerouslySetInnerHTML={{ __html: getSymbol(order.currency) + order.total }} />
                                            </td>
                                            <td className="px-4 py-3 align-top text-right">
                                                <div className="flex items-center justify-end gap-2">
                                                    {order.s3Key && (
                                                        <a
                                                            href={`/api/view-url?key=${encodeURIComponent(order.s3Key)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="h-7 w-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 rounded-lg shadow-sm transition-all"
                                                            title="Download PDF"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <FileText size={14} />
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            router.push(`/admin/woo-orders/${order.id}`);
                                                        }}
                                                        className="h-7 w-7 flex items-center justify-center bg-white border border-slate-200 text-slate-600 hover:border-indigo-300 hover:text-indigo-600 rounded-lg shadow-sm transition-all"
                                                    >
                                                        <ChevronRight size={14} />
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
            </div >



        </div >
    );
}

/* -------------------------------------------------------------------------- */
/*                              Helpers & Sub-Components                      */
/* -------------------------------------------------------------------------- */






function getSymbol(currency: string) {
    if (currency === 'INR') return '₹';
    if (currency === 'USD') return '$';
    return currency + ' ';
}





/* -------------------------------------------------------------------------- */
/*                               Voice Component                              */
/* -------------------------------------------------------------------------- */


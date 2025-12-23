"use client";

import { useEffect, useState } from "react";
import { auth, db } from "@/lib/firebase";
import { onAuthStateChanged } from "firebase/auth";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import type { Order, Stage } from "@/lib/types";
import {
    Printer,
    Loader2,
    FileText,
    ArrowRight,
    PackageCheck,
    ClipboardList
} from "lucide-react";
import { format } from "date-fns";
import clsx from "clsx";

const PRINT_STAGES: Stage[] = ["Assigned to Vendor", "Printing"];
const NEXT_STAGES: { [key: string]: Stage } = {
    "Assigned to Vendor": "Printing",
    "Printing": "Quality Check"
};

export default function PrintingPage() {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    useEffect(() => {
        const unsubAuth = onAuthStateChanged(auth, (user) => {
            if (!user) {
                setLoading(false);
                setOrders([]);
                return;
            }

            // Query for orders assigned to this vendor
            const q = query(
                collection(db, "orders"),
                where("vendorId", "==", user.uid)
            );

            const unsubDocs = onSnapshot(q, (snapshot) => {
                const data = snapshot.docs.map(d => ({ id: d.id, ...d.data() })) as Order[];
                // Client-side filter for 'OR' logic on stages (simple & reliable)
                const activePrints = data.filter(o =>
                    o.stage === "Assigned to Vendor" || o.stage === "Printing"
                );

                // Sort: newest first
                activePrints.sort((a, b) => {
                    const getMillis = (d: any) => d?.seconds ? d.seconds * 1000 : (typeof d === 'number' ? d : 0);
                    return getMillis(b.createdAt) - getMillis(a.createdAt);
                });

                setOrders(activePrints);
                setLoading(false);
            });

            return () => unsubDocs();
        });

        return () => unsubAuth();
    }, []);

    const advanceStage = async (orderId: string, currentStage: Stage) => {
        const next = NEXT_STAGES[currentStage];
        if (!next) return;

        setUpdatingId(orderId);
        try {
            await updateDoc(doc(db, "orders", orderId), {
                stage: next,
                updatedAt: Date.now()
            });
        } catch (err) {
            console.error("Update failed", err);
            alert("Failed to update status");
        } finally {
            setUpdatingId(null);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh]">
                <Loader2 className="animate-spin text-indigo-500 mb-4" size={40} />
                <p className="text-slate-500 font-medium animate-pulse">Loading print queue...</p>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 p-6 md:p-12 font-sans">
            <div className="max-w-7xl mx-auto space-y-8">

                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
                            <Printer className="text-indigo-600" />
                            Print Queue
                        </h1>
                        <p className="text-slate-500 mt-2">Active print jobs requiring your attention.</p>
                    </div>
                    <div className="bg-white px-4 py-2 rounded-xl border border-slate-200 shadow-sm font-bold text-slate-600">
                        {orders.length} Pending
                    </div>
                </div>

                {orders.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-20 text-center animate-in fade-in duration-500 bg-white rounded-3xl border border-slate-100 shadow-sm">
                        <div className="bg-green-50 p-6 rounded-full mb-6">
                            <ClipboardList className="text-green-500" size={48} />
                        </div>
                        <h3 className="text-xl font-bold text-slate-900 mb-2">All Caught Up!</h3>
                        <p className="text-slate-500 max-w-sm mx-auto">
                            There are no orders currently waiting in the print queue.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {orders.map(order => (
                            <div key={order.orderId} className="bg-white rounded-2xl border border-slate-200 overflow-hidden hover:shadow-lg transition-all duration-300 group flex flex-col h-full">

                                {/* Card Header: Image & Status */}
                                <div className="relative h-48 bg-slate-100 flex items-center justify-center overflow-hidden">
                                    {order.coverImage ? (
                                        <img src={order.coverImage} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                    ) : (
                                        <span className="text-4xl">📖</span>
                                    )}
                                    <div className="absolute top-4 right-4">
                                        <span className={clsx(
                                            "px-3 py-1 rounded-full text-xs font-bold shadow-sm border",
                                            order.stage === 'Printing' ? "bg-blue-500 text-white border-blue-600" : "bg-white text-slate-700 border-slate-200"
                                        )}>
                                            {order.stage}
                                        </span>
                                    </div>
                                </div>

                                {/* Card Body */}
                                <div className="p-6 flex-1 flex flex-col">
                                    <div className="flex justify-between items-start mb-4">
                                        <div>
                                            <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{order.bookTitle}</h3>
                                            <p className="text-xs text-slate-500 font-medium">#{order.orderId}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-3 mb-6">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Binding</span>
                                            <span className="font-bold text-slate-800">{order.binding}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-slate-500">Date</span>
                                            <span className="font-bold text-slate-800">
                                                {(() => {
                                                    let date = new Date();
                                                    const created: any = order.createdAt;
                                                    if (typeof created === 'number') date = new Date(created);
                                                    else if (created?.seconds) date = new Date(created.seconds * 1000);
                                                    return format(date, 'MMM d, yyyy');
                                                })()}
                                            </span>
                                        </div>
                                        {order.notes && (
                                            <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded-lg border border-yellow-100">
                                                <strong>Note:</strong> {order.notes}
                                            </div>
                                        )}
                                    </div>

                                    <div className="mt-auto space-y-3">
                                        {/* Action: Download PDF */}
                                        {order.s3Key && (
                                            <a
                                                href={`/api/view-url?key=${encodeURIComponent(order.s3Key)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-sm font-bold transition-colors"
                                            >
                                                <FileText size={16} />
                                                Download / View PDF
                                            </a>
                                        )}

                                        {/* Action: Advance State */}
                                        <button
                                            onClick={() => advanceStage(order.id!, order.stage!)}
                                            disabled={!!updatingId}
                                            className={clsx(
                                                "flex items-center justify-center gap-2 w-full py-3 rounded-xl text-sm font-bold text-white shadow-md transition-all active:scale-95",
                                                order.stage === 'Assigned to Vendor' ? "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200" :
                                                    "bg-blue-600 hover:bg-blue-700 shadow-blue-200"
                                            )}
                                        >
                                            {updatingId === order.id ? (
                                                <Loader2 size={18} className="animate-spin" />
                                            ) : (
                                                <>
                                                    <span>
                                                        {order.stage === 'Assigned to Vendor' ? 'Start Printing' : 'Finish & Check'}
                                                    </span>
                                                    <ArrowRight size={18} />
                                                </>
                                            )}
                                        </button>
                                    </div>

                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

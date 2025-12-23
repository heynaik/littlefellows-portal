"use client";

import { useEffect, useState, use } from "react";
import { format } from "date-fns";
import {
    ArrowLeft,
    Download,
    Eye,
    FileText,
    Loader2,
    MessageSquare,
    Package,
    ShieldCheck,
    Truck,
    CheckCircle2,
    User,
    UploadCloud,
    Trash2,
    X,
    MapPin,
    Mail,
    Phone,
    StickyNote,
    ArrowRight,
    Mic
} from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { WooCommerceOrder } from "@/lib/types";
import { db } from "@/lib/firebase";
import { collection, query, where, getDocs, updateDoc, doc, serverTimestamp, setDoc, onSnapshot } from "firebase/firestore";

type OrderMeta = WooCommerceOrder['meta_data'][0];

// Helper to extract URLs
function renderMetaValue(meta: OrderMeta) {
    const rawVal = String(meta.value || '');
    const displayedVal = 'display_value' in meta ? meta.display_value : meta.value;
    const displayVal = String(displayedVal || '');
    const isUploadKey = /upload|photo|image|picture|file/i.test(meta.key || '');
    const urls: string[] = [];

    const hrefRegex = /href=["']([^"']+)["']/g;
    let match;
    while ((match = hrefRegex.exec(rawVal)) !== null) {
        if (match[1].startsWith('http')) urls.push(match[1]);
    }
    if (urls.length === 0 && rawVal.trim().startsWith('http')) {
        rawVal.split(',').forEach(u => {
            if (u.trim().startsWith('http')) urls.push(u.trim());
        });
    }

    if (urls.length > 0 && isUploadKey) {
        return (
            <div className="mt-2 flex flex-col gap-2">
                {urls.map((url, idx) => {
                    const filename = url.split('/').pop() || `Photo ${idx + 1}`;
                    return (
                        <a key={idx} href={url} download={filename} target="_blank" rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm">
                            <Download size={16} />
                            <span>Download {urls.length > 1 ? `#${idx + 1}` : 'Photo'}</span>
                        </a>
                    );
                })}
            </div>
        );
    }
    if (urls.length > 0) {
        return (
            <div className="flex flex-col gap-1 mt-1">
                {urls.map((url, idx) => {
                    const filename = url.split('/').pop() || 'File';
                    return (
                        <a key={idx} href={url} target="_blank" rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors border border-blue-100 w-fit">
                            <Eye size={12} />
                            <span className="truncate text-[10px] font-bold uppercase tracking-wide">{filename.substring(0, 20)}...</span>
                        </a>
                    );
                })}
            </div>
        );
    }
    return <span className="text-slate-700" dangerouslySetInnerHTML={{ __html: displayVal }} />;
}

function shouldShowMeta(meta: OrderMeta) {
    const key = (meta.key || '').toLowerCase();
    if (key.startsWith('_')) return false;
    if (key.includes('prad_selection') || key.includes('cart_item_prad')) return false;
    return true;
}

function formatMetaKey(key: string) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getSymbol(currency: string) {
    return currency === 'INR' ? '₹' : (currency === 'USD' ? '$' : currency + ' ');
}


export default function OrderDetailsPage({ params }: { params: Promise<{ id: string }> }) {
    // Unwrap params
    const { id } = use(params);
    const router = useRouter();

    const [order, setOrder] = useState<WooCommerceOrder | null>(null);
    const [loading, setLoading] = useState(true);
    const [downloadingZip, setDownloadingZip] = useState(false);

    // Assignment State
    const [showAssignment, setShowAssignment] = useState(false);
    const [assignmentVendors, setAssignmentVendors] = useState<any[]>([]);
    const [loadingVendors, setLoadingVendors] = useState(false);
    const [assignmentFile, setAssignmentFile] = useState<File | null>(null);
    const [assignmentVendorId, setAssignmentVendorId] = useState("");
    const [isAssigning, setIsAssigning] = useState(false);

    // WhatsApp State
    const [whatsappMsg, setWhatsappMsg] = useState("");
    const voiceRecordingMsg = `*LITTLEFELLOWS TEAM*
> Children’s Storybook Voice Recording

*VOICE RECORDING INSTRUCTIONS*
_(Please read carefully)_
	•	Read the text clearly, slowly, and naturally
	•	Use a warm, friendly storytelling voice for children
	•	Keep the same tone and pace throughout
	•	Do not rush or overact
	•	Smile gently while speaking
	•	Record in a quiet room using one microphone
	•	No background noise (fan, AC, TV, phone sounds)
	•	This recording will be used for children’s storybook narration

*TEXT TO READ*

Hello.
Welcome to story time.

Today is a calm and happy day.
The sky is bright and peaceful.

Once upon a time, a kind child began a small adventure.
The child looked around with curious eyes and a brave smile.

“Wow,” said the child softly.
“Look at that.”

The wind whispered gently.
The stars twinkled above.

Everything felt safe and warm.

Thank you for listening.
Sweet dreams, and good night.`;

    const whatsappTemplates = [
        { icon: <CheckCircle2 size={14} />, label: "Order Received", text: "Hi! We've received your order and are checking the details. We'll start processing shortly! 🎨" },
        { icon: <Truck size={14} />, label: "Order Shipped", text: "Great news! Your order has been shipped. It will arrive soon! 🚀" },
        { icon: <ShieldCheck size={14} />, label: "Proof Approved", text: "Thanks for approving the proof! We are moving to production now. ✨" },
        { icon: <MessageSquare size={14} />, label: "Clarification", text: "Hi! We noticed a small issue with the photo/details. Could you please check? 🤔", special: true },
        { icon: <Mic size={14} />, label: "Voice & Story", text: voiceRecordingMsg, special: true },
    ];

    useEffect(() => {
        fetchOrder();

        // Real-time listener: Sync stage/status from Firestore
        const orderIdNumber = parseInt(id);
        const q = query(collection(db, "orders"), where("wcId", "==", isNaN(orderIdNumber) ? id : orderIdNumber));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            if (!snapshot.empty) {
                const fireData = snapshot.docs[0].data();
                setOrder(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        status: fireData.stage || prev.status,
                        vendor_name: fireData.vendorName,
                        s3Key: fireData.s3Key || prev.s3Key
                    };
                });
            }
        });

        return () => unsubscribe();
    }, [id]);

    const fetchOrder = async () => {
        try {
            setLoading(true);
            const res = await fetch(`/api/woo-orders/${id}`);
            if (!res.ok) throw new Error("Failed to load order");
            const data = await res.json();
            setOrder(data);
        } catch (error) {
            toast.error("Could not load order details");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- Actions ---

    const loadVendors = async () => {
        if (assignmentVendors.length > 0) return;
        setLoadingVendors(true);
        try {
            // Fetch users with role 'vendor'
            // We use the same querying logic as in Admin Assigned page or just fetch all 'users' and filter?
            // Ideally we should have an API or just query firestore if we have access.
            // Client side firestore access is fine for admin if rules allow. 
            // Wait, standard practice here is likely an API or direct firestore if authorized.
            // Let's use direct firestore for simplicity as 'db' is initialized.
            // Assuming 'users' collection has role field.
            const q = query(collection(db, "users"), where("role", "==", "vendor"));
            const snapshot = await getDocs(q);
            const vendors = snapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    vendorId: doc.id,
                    name: data.name || data.fullName || data.storeName || data.email || "Vendor",
                    ...data
                };
            });
            setAssignmentVendors(vendors);
        } catch (e) {
            console.error(e);
            toast.error("Failed to load vendors");
        } finally {
            setLoadingVendors(false);
        }
    };

    const handleAssignmentSubmit = async () => {
        if (!assignmentFile || !assignmentVendorId || !order) return;

        setIsAssigning(true);
        try {
            // 1. Get S3 Upload URL
            const filename = `orders/${order.id}/${Date.now()}_${assignmentFile.name}`;
            const uploadRes = await fetch(`/api/upload-url?fileName=${encodeURIComponent(assignmentFile.name)}&contentType=${encodeURIComponent(assignmentFile.type)}&orderId=${order.id}`); // GET request

            if (!uploadRes.ok) throw new Error("Failed to get upload URL");

            const { url, key } = await uploadRes.json();

            // 2. Upload to S3
            await fetch(url, {
                method: "PUT",
                headers: { "Content-Type": assignmentFile.type },
                body: assignmentFile,
            });

            // 3. Create/Update in Firestore
            const vendor = assignmentVendors.find(v => v.vendorId === assignmentVendorId);
            const vendorName = vendor?.name || "Unknown Vendor";

            const q = query(collection(db, "orders"), where("wcId", "==", order.id));
            const snap = await getDocs(q);

            const orderData = {
                wcId: order.id,
                orderNumber: order.number,
                stage: "Assigned to Vendor",
                vendorId: assignmentVendorId,
                vendorName: vendorName,
                s3Key: key,
                updatedAt: serverTimestamp(),
                customerNote: order.customer_note || "",
                billing: order.billing,
                line_items: order.line_items,
                date_created: order.date_created
            };

            if (!snap.empty) {
                await updateDoc(doc(db, "orders", snap.docs[0].id), orderData);
            } else {
                // Use imported setDoc
                await setDoc(doc(collection(db, "orders")), orderData);
            }

            toast.success("Order assigned successfully!");
            setShowAssignment(false);

            // Refresh local order data
            setOrder(prev => prev ? ({ ...prev, status: "Assigned to Vendor", vendor_name: vendorName, s3Key: key }) : null);

        } catch (e) {
            console.error(e);
            toast.error("Assignment failed");
        } finally {
            setIsAssigning(false);
        }
    };

    const handleRemoveAssignment = async () => {
        if (!order) return;
        if (!confirm("Are you sure you want to remove this assignment?")) return;

        try {
            const q = query(collection(db, "orders"), where("wcId", "==", order.id));
            const snap = await getDocs(q);

            if (!snap.empty) {
                const docId = snap.docs[0].id;
                await updateDoc(doc(db, "orders", docId), {
                    stage: "Paid",
                    vendorId: null,
                    vendorName: null,
                    s3Key: null,
                    updatedAt: serverTimestamp()
                });

                toast.success("Assignment removed.");
                setOrder(prev => prev ? ({ ...prev, status: "Paid", vendor_name: undefined, s3Key: undefined }) : null);
            }
        } catch (e) {
            console.error(e);
            toast.error("Failed to remove assignment");
        }
    };

    const sendWhatsApp = () => {
        if (!order?.billing?.phone || !whatsappMsg) return;
        const phone = order.billing.phone.replace(/[^0-9]/g, "");
        const url = `https://wa.me/${phone}?text=${encodeURIComponent(whatsappMsg)}`;
        window.open(url, "_blank");
    };

    const handleDownloadZip = async () => {
        toast.info("Zip download logic placeholder");
        // Reuse logic from main page if needed, or implement simple download
    };

    const stageColors: Record<string, string> = {
        "processing": "bg-blue-50 text-blue-700 border-blue-200",
        "completed": "bg-green-50 text-green-700 border-green-200",
        "on-hold": "bg-amber-50 text-amber-700 border-amber-200",
        "pending": "bg-slate-50 text-slate-700 border-slate-200",
        "cancelled": "bg-red-50 text-red-700 border-red-200",
        "refunded": "bg-purple-50 text-purple-700 border-purple-200",
        "failed": "bg-red-50 text-red-700 border-red-200",

        // Internal Stages
        "Assigned to Vendor": "bg-indigo-100 text-indigo-700 border-indigo-200",
        "Printing": "bg-blue-100 text-blue-700 border-blue-200",
        "Quality Check": "bg-purple-100 text-purple-700 border-purple-200",
        "Packed": "bg-yellow-100 text-yellow-700 border-yellow-200",
        "Shipped to Admin": "bg-orange-100 text-orange-700 border-orange-200",
        "Received by Admin": "bg-teal-100 text-teal-700 border-teal-200",
        "Final Packed for Customer": "bg-pink-100 text-pink-700 border-pink-200",
        "Shipped to Customer": "bg-green-100 text-green-700 border-green-200",
        "Delivered": "bg-emerald-100 text-emerald-700 border-emerald-200",
        "Uploaded": "bg-slate-100 text-slate-600 border-slate-200",
    };

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F8FAFC]">
                <Loader2 className="animate-spin text-indigo-500" size={32} />
            </div>
        );
    }

    if (!order) {
        return (
            <div className="flex h-screen items-center justify-center bg-[#F8FAFC] flex-col gap-4">
                <p className="text-slate-500 font-medium">Order not found.</p>
                <Link href="/admin/woo-orders" className="text-indigo-600 font-bold hover:underline">Go Back</Link>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#F8FAFC] pb-20">
            {/* 1. Header Section */}
            <div className="bg-white border-b border-slate-200 sticky top-0 z-20 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)]">
                <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Link
                            href="/admin/woo-orders"
                            className="w-10 h-10 flex items-center justify-center rounded-xl hover:bg-slate-50 transition-colors text-slate-500 border border-transparent hover:border-slate-200 group"
                        >
                            <ArrowLeft size={20} className="group-hover:-translate-x-0.5 transition-transform" />
                        </Link>
                        <div>
                            <div className="flex items-center gap-3">
                                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                                    Order #{order.number}
                                </h1>
                                <span className={clsx(
                                    "px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wide border",
                                    stageColors[order.status] || "bg-slate-50 text-slate-700 border-slate-200"
                                )}>
                                    {order.status}
                                </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-400 mt-1">
                                <span>{format(new Date(order.date_created), "MMM dd, yyyy • hh:mm a")}</span>
                                <span>•</span>
                                <span>{order.billing.email}</span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!order.vendor_name && !order.s3Key && (
                            <button
                                onClick={() => {
                                    setShowAssignment(!showAssignment);
                                    if (!showAssignment) {
                                        loadVendors();
                                        setTimeout(() => document.getElementById('assignment-section')?.scrollIntoView({ behavior: 'smooth' }), 100);
                                    }
                                }}
                                className={clsx(
                                    "h-11 px-5 rounded-xl font-bold text-sm transition-all shadow-lg flex items-center gap-2",
                                    showAssignment
                                        ? "bg-slate-100 text-slate-600 hover:bg-slate-200 shadow-none border border-slate-200"
                                        : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 hover:shadow-indigo-300"
                                )}
                            >
                                {showAssignment ? <X size={18} /> : <UploadCloud size={18} />}
                                {showAssignment ? "Cancel Assignment" : "Assign Vendor"}
                            </button>
                        )}
                        <button
                            onClick={handleDownloadZip}
                            className="h-11 px-5 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all flex items-center gap-2"
                        >
                            <Download size={18} />
                            <span className="hidden sm:inline">Download Assets</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* 2. Main Layout (Grid) */}
            <div className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-8">

                {/* Left Column */}
                <div className="space-y-8">

                    {/* ASSIGNMENT BANNER (Conditional) */}
                    {showAssignment && (
                        <div id="assignment-section" className="bg-white border border-indigo-100 rounded-2xl shadow-[0_4px_20px_-4px_rgba(79,70,229,0.1)] overflow-hidden animate-in slide-in-from-top-4 fade-in duration-300">
                            <div className="bg-indigo-600/5 px-6 py-4 border-b border-indigo-100 flex items-center justify-between">
                                <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
                                    <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
                                        <UploadCloud size={18} />
                                    </div>
                                    Assign to Vendor
                                </h3>
                                <button onClick={() => setShowAssignment(false)} className="text-indigo-400 hover:text-indigo-600 transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-8">
                                {/* Step 1: Upload */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">1. Final PDF</label>
                                    <div
                                        className={clsx(
                                            "border-2 border-dashed rounded-xl h-40 flex flex-col items-center justify-center text-center cursor-pointer transition-all group",
                                            assignmentFile
                                                ? "border-indigo-500 bg-indigo-50"
                                                : "border-slate-200 bg-slate-50/50 hover:border-indigo-400 hover:bg-white"
                                        )}
                                        onClick={() => document.getElementById('full-pdf-upload')?.click()}
                                    >
                                        <input type="file" id="full-pdf-upload" accept=".pdf" className="hidden" onChange={e => setAssignmentFile(e.target.files?.[0] || null)} />
                                        {assignmentFile ? (
                                            <div className="flex flex-col items-center animate-in zoom-in-50 duration-200">
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-indigo-600 flex items-center justify-center mb-2">
                                                    <FileText size={24} />
                                                </div>
                                                <span className="text-sm font-bold text-indigo-900 max-w-[200px] truncate">{assignmentFile.name}</span>
                                                <span className="text-xs text-indigo-500 mt-1 font-medium bg-indigo-100 px-2 py-0.5 rounded-full">Ready to upload</span>
                                            </div>
                                        ) : (
                                            <div className="flex flex-col items-center group-hover:scale-105 transition-transform duration-200">
                                                <div className="w-12 h-12 bg-white rounded-xl shadow-sm text-slate-400 group-hover:text-indigo-500 flex items-center justify-center mb-2 transition-colors">
                                                    <UploadCloud size={24} />
                                                </div>
                                                <span className="text-sm font-bold text-slate-600 group-hover:text-indigo-700 transition-colors">Upload Print PDF</span>
                                                <span className="text-xs text-slate-400 mt-1">Click to browse files</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Step 2: Select Vendor */}
                                <div className="space-y-3">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">2. Select Vendor</label>
                                    {loadingVendors ? (
                                        <div className="h-12 bg-slate-50 border border-slate-200 rounded-xl flex items-center px-4 gap-3 text-sm text-slate-500">
                                            <Loader2 className="animate-spin" size={16} /> Fetching partners...
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <select
                                                className="w-full h-12 rounded-xl border border-slate-200 px-4 text-sm font-bold text-slate-700 bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 outline-none appearance-none cursor-pointer hover:border-indigo-300 transition-all"
                                                value={assignmentVendorId}
                                                onChange={e => setAssignmentVendorId(e.target.value)}
                                            >
                                                <option value="">Select a partner...</option>
                                                {assignmentVendors.map(v => <option key={v.vendorId} value={v.vendorId}>{v.name}</option>)}
                                            </select>
                                            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                <User size={16} />
                                            </div>
                                        </div>
                                    )}

                                    <div className="pt-2">
                                        <button
                                            onClick={handleAssignmentSubmit}
                                            disabled={isAssigning || !assignmentFile || !assignmentVendorId}
                                            className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold rounded-xl shadow-lg shadow-indigo-200 disabled:shadow-none transition-all flex items-center justify-center gap-2 group"
                                        >
                                            {isAssigning ? (
                                                <>
                                                    <Loader2 className="animate-spin" size={18} />
                                                    <span>Assigning...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <span>Confirm Assignment</span>
                                                    <ArrowRight size={18} className="group-hover:translate-x-0.5 transition-transform" />
                                                </>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Assigned Banner (Completed State) */}
                    {(order.vendor_name || order.s3Key) && (
                        <div className="bg-white border border-green-100 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4 relative overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-green-500"></div>
                            <div className="flex items-center gap-4 pl-2">
                                <div className="w-12 h-12 bg-green-50 text-green-600 rounded-full flex items-center justify-center border border-green-100 shadow-sm shrink-0">
                                    <CheckCircle2 size={24} />
                                </div>
                                <div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-slate-800 text-base">Allocated to Production</h3>
                                        {/* Status Tag for internal tracking if needed */}
                                    </div>
                                    <div className="flex items-center gap-2 text-sm text-slate-500 mt-0.5">
                                        <User size={14} />
                                        <span className="font-semibold text-slate-700">{order.vendor_name}</span>
                                    </div>
                                </div>
                            </div>
                            <div className="flex items-center gap-3 w-full sm:w-auto">
                                {order.s3Key && (
                                    <a
                                        href={`/api/view-url?key=${encodeURIComponent(order.s3Key)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-indigo-600 border border-slate-200 rounded-xl text-sm font-bold transition-all"
                                    >
                                        <FileText size={16} />
                                        Print PDF
                                    </a>
                                )}
                                <button
                                    onClick={handleRemoveAssignment}
                                    className="p-2.5 hover:bg-red-50 text-slate-400 hover:text-red-500 rounded-xl transition-colors border border-transparent hover:border-red-100"
                                    title="Revoke Assignment"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Order Items Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <h2 className="font-bold text-slate-800 text-lg flex items-center gap-2">
                                <Package className="text-slate-400" size={20} />
                                Order Items
                            </h2>
                            <span className="bg-white border border-slate-200 px-3 py-1 rounded-lg text-xs font-bold text-slate-600 shadow-sm">
                                {order.line_items.length} {order.line_items.length === 1 ? 'Item' : 'Items'}
                            </span>
                        </div>

                        <div className="divide-y divide-slate-50">
                            {order.line_items.map((item) => (
                                <div key={item.id} className="p-6 hover:bg-slate-50/50 transition-colors">
                                    <div className="flex flex-col sm:flex-row gap-6">
                                        {/* Image */}
                                        <div className="w-full sm:w-32 aspect-square bg-slate-100 rounded-xl border border-slate-200 overflow-hidden shrink-0 shadow-sm relative group">
                                            {item.image?.src ? (
                                                <img src={item.image.src} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center text-slate-300">
                                                    <Package size={32} />
                                                </div>
                                            )}
                                        </div>

                                        {/* Details */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-start justify-between gap-4 mb-3">
                                                <div>
                                                    <h3 className="font-bold text-slate-900 text-lg leading-tight mb-1">{item.name}</h3>
                                                    {item.sku && (
                                                        <div className="inline-flex items-center px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 text-[10px] font-mono border border-slate-200">
                                                            SKU: {item.sku}
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-slate-900 text-lg">{getSymbol(order.currency)}{item.total}</div>
                                                    <div className="text-xs text-slate-500 font-medium">Qty: {item.quantity}</div>
                                                </div>
                                            </div>

                                            {/* Attributes Grid */}
                                            <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3">
                                                {item.meta_data.filter(shouldShowMeta).map((meta, idx) => {
                                                    const isUpload = /upload|photo|image|picture|file/i.test(meta.key || '');
                                                    return (
                                                        <div key={idx} className={clsx("text-sm", isUpload ? "col-span-1 md:col-span-2 pt-2 border-t border-slate-200 mt-1" : "")}>
                                                            <div className="flex items-baseline justify-between md:justify-start md:gap-4">
                                                                <span className="text-slate-500 font-semibold text-xs uppercase tracking-wide min-w-[100px] shrink-0">
                                                                    {formatMetaKey(meta.key)}
                                                                </span>
                                                                <div className="text-slate-800 font-medium break-words flex-1">
                                                                    {renderMetaValue(meta)}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="p-6 bg-slate-50 border-t border-slate-100">
                            <div className="flex justify-end">
                                <div className="w-full max-w-xs space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">Subtotal</span>
                                        <span className="text-slate-900 font-bold">{getSymbol(order.currency)}{order.total}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 font-medium">Shipping</span>
                                        <span className="text-green-600 font-bold">Free</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-lg">
                                        <span className="text-slate-800 font-bold">Total</span>
                                        <span className="text-indigo-600 font-extrabold">{getSymbol(order.currency)}{order.total}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column (Sidebar) */}
                <div className="space-y-6">

                    {/* Customer Card */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <User className="text-slate-400" size={18} />
                                Customer
                            </h3>
                        </div>
                        <div className="p-5 space-y-5">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center font-bold text-lg border border-indigo-200">
                                    {order.billing.first_name[0]}
                                </div>
                                <div>
                                    <div className="font-bold text-slate-900 text-base">{order.billing.first_name} {order.billing.last_name}</div>
                                    <div className="text-xs text-indigo-500 font-bold uppercase tracking-wide">Little Fellow</div>
                                </div>
                            </div>

                            <div className="space-y-3">
                                <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                                    <MapPin size={16} className="text-slate-400 shrink-0 mt-0.5" />
                                    <div className="text-sm font-medium text-slate-600 leading-relaxed">
                                        {order.billing.address_1}<br />
                                        {order.billing.address_2 && <>{order.billing.address_2}<br /></>}
                                        {order.billing.city}, {order.billing.state} {order.billing.postcode}<br />
                                        {order.billing.country}
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <a href={`mailto:${order.billing.email}`} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg text-sm text-slate-600 font-medium transition-colors group">
                                        <Mail size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                        <span className="truncate">{order.billing.email}</span>
                                    </a>
                                    <a href={`tel:${order.billing.phone}`} className="flex items-center gap-3 p-2.5 hover:bg-slate-50 rounded-lg text-sm text-slate-600 font-medium transition-colors group">
                                        <Phone size={16} className="text-slate-400 group-hover:text-indigo-500 transition-colors" />
                                        <span>{order.billing.phone || "N/A"}</span>
                                    </a>
                                </div>
                            </div>

                            {order.customer_note && (
                                <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl relative">
                                    <div className="absolute top-3 right-3 text-amber-300">
                                        <StickyNote size={14} />
                                    </div>
                                    <p className="text-[10px] uppercase font-bold text-amber-600 mb-1">Customer Note</p>
                                    <p className="text-amber-900 text-sm italic leading-relaxed">"{order.customer_note}"</p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* WhatsApp Module */}
                    <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <MessageSquare className="text-green-500" size={18} />
                                WhatsApp Chat
                            </h3>
                        </div>
                        <div className="p-5 space-y-4">
                            <div className="grid grid-cols-2 gap-2">
                                {whatsappTemplates.map((t, i) => (
                                    <button
                                        key={i}
                                        onClick={() => setWhatsappMsg(t.text)}
                                        className={clsx(
                                            "px-2 py-2.5 rounded-xl border text-[10px] font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md",
                                            t.special
                                                ? "col-span-2 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                                : "bg-white border-slate-200 text-slate-600 hover:bg-green-50 hover:border-green-200 hover:text-green-700"
                                        )}
                                    >
                                        {t.icon} {t.label}
                                    </button>
                                ))}
                            </div>
                            <div className="relative">
                                <textarea
                                    className="w-full h-28 p-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none transition-all placeholder:text-slate-400"
                                    placeholder="Type your message here..."
                                    value={whatsappMsg}
                                    onChange={e => setWhatsappMsg(e.target.value)}
                                />
                                <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 font-medium">
                                    {whatsappMsg.length} chars
                                </div>
                            </div>
                            <button
                                onClick={sendWhatsApp}
                                disabled={!order.billing.phone || !whatsappMsg}
                                className="w-full h-11 bg-[#25D366] hover:bg-[#1db954] text-white font-bold rounded-xl shadow-lg shadow-green-200 transition-all text-sm disabled:opacity-50 disabled:shadow-none flex items-center justify-center gap-2"
                            >
                                <MessageSquare size={18} fill="currentColor" />
                                Open WhatsApp
                            </button>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
}

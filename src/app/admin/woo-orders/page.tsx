"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    Eye, Search, Filter, Loader2, X, Download, MessageSquare,
    User, Mail, Phone, MapPin, Mic, UploadCloud, Play,
    ChevronLeft, ChevronRight, Music, CheckCircle2, AlertCircle, Trash2, ArrowRight,
    FileText
} from "lucide-react";
import clsx from "clsx";
import { StatusBadge } from "@/components/StatusBadge";
import { VoiceControl } from "@/components/VoiceControl";
import { PageHeader } from "@/components/ui/PageHeader";
import AssignVendorModal from "@/components/admin/AssignVendorModal";
import { isPriorityOrder } from "@/lib/utils";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
type WooCommerceOrder = {
    id: number;
    number: string;
    status: string;
    currency: string;
    date_created: string;
    total: string;
    billing: {
        first_name: string;
        last_name: string;
        email: string;
        phone: string;
        address_1: string;
        address_2: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
    line_items: Array<{
        id: number;
        name: string;
        quantity: number;
        total: string;
        meta_data: Array<{
            id: number;
            key: string;
            value: any;
            display_key: string;
            display_value: string;
        }>;
        image: {
            src: string;
        };
    }>;
    meta_data: Array<{
        id: number;
        key: string;
        value: any;
    }>;
    vendor_name?: string;
    s3Key?: string;
};

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */
export default function WooOrdersPage() {
    const [orders, setOrders] = useState<WooCommerceOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [selectedOrder, setSelectedOrder] = useState<WooCommerceOrder | null>(null);
    const [assigningOrder, setAssigningOrder] = useState<WooCommerceOrder | null>(null);
    const [whatsappMsg, setWhatsappMsg] = useState("");
    const [downloadingZip, setDownloadingZip] = useState(false);



    // Fetch Logic
    async function fetchOrders() {
        setLoading(true);
        try {
            const p = new URLSearchParams({
                page: String(page),
                per_page: "20",
                search: search,
            });
            const res = await fetch(`/api/woo-orders?${p.toString()}`);
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
        fetchOrders();
    }, [page, search]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchOrders();
    };

    // Initialize default message when order opens
    useEffect(() => {
        if (selectedOrder) {
            setWhatsappMsg(`Hi ${selectedOrder.billing.first_name}, regarding your order #${selectedOrder.number} from Little Fellows...`);
        }
    }, [selectedOrder]);

    const sendWhatsApp = () => {
        if (!selectedOrder?.billing.phone) return;

        let phone = selectedOrder.billing.phone.replace(/[^0-9]/g, '');
        if (phone.length === 10) phone = '91' + phone;

        const text = encodeURIComponent(whatsappMsg);
        window.open(`https://api.whatsapp.com/send?phone=${phone}&text=${text}`, '_blank');
    };

    const handleDownloadAll = async () => {
        if (!selectedOrder) return;
        setDownloadingZip(true);

        try {
            const itemsToZip: { url: string; name: string }[] = [];
            let fileCount = 0;

            // Helper to add unique URLs
            const addUrl = (url: string, itemName: string) => {
                if (!url || typeof url !== 'string' || !url.startsWith('http')) return;

                // Avoid duplicates
                if (itemsToZip.some(item => item.url === url)) return;

                const ext = url.split('.').pop()?.split('?')[0] || 'jpg';
                const safeName = itemName.replace(/[^a-z0-9]/gi, '-').substring(0, 20);
                const filename = `${safeName}-${fileCount + 1}.${ext}`;

                itemsToZip.push({ url, name: filename });
                fileCount++;
            };

            // 1. Gather all URLs
            selectedOrder.line_items?.forEach((item) => {
                item.meta_data?.forEach((meta) => {
                    const key = String(meta.key || '').toLowerCase();
                    const value = meta.value;

                    // CASE A: _prad_option_uploads_path (Array of URLs)
                    if (key === '_prad_option_uploads_path' && Array.isArray(value)) {
                        value.forEach(v => addUrl(String(v), item.name));
                        return;
                    }

                    // CASE B: Standard Upload keys
                    const specificMetaKeys = ['photo', 'image', 'picture', 'file', 'upload'];
                    const isKeyMatch = specificMetaKeys.some(k => key.includes(k));

                    if (isKeyMatch || key === 'cart_item_prad_selection') {
                        // Handle Arrays (rare but possible)
                        if (Array.isArray(value)) {
                            value.forEach(v => {
                                if (typeof v === 'string') {
                                    // Extract from string (could be URL or HTML)
                                    extractUrls(v).forEach(u => addUrl(u, item.name));
                                } else if (typeof v === 'object' && v?.path) {
                                    // Deep nested objects sometimes found in debug data
                                    addUrl(v.path, item.name);
                                }
                            });
                        } else {
                            // Handle String (HTML or CSV)
                            extractUrls(String(value)).forEach(u => addUrl(u, item.name));
                        }
                    }
                });
            });

            if (itemsToZip.length === 0) {
                alert("No photos found to download.");
                setDownloadingZip(false);
                return;
            }

            // 2. Native Form Submit
            const form = document.createElement("form");
            form.method = "POST";
            form.action = "/api/download-zip";

            const input = document.createElement("input");
            input.type = "hidden";
            input.name = "data";
            input.value = JSON.stringify({
                urls: itemsToZip,
                filename: `Order-${selectedOrder.number}-Photos`
            });

            form.appendChild(input);
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);

            setDownloadingZip(false);

        } catch (error) {
            console.error("Download error:", error);
            alert("Failed to initiate download.");
            setDownloadingZip(false);
        }
    };

    // Helper to extract URLs from text (HTML or plain)
    function extractUrls(text: string): string[] {
        const found: string[] = [];

        // 1. Check for href="..."
        const hrefRegex = /href=["']([^"']+)["']/g;
        let match;
        while ((match = hrefRegex.exec(text)) !== null) {
            if (match[1].startsWith('http')) found.push(match[1]);
        }

        // 2. If no hrefs, check for raw http links
        if (found.length === 0) {
            const rawRegex = /(https?:\/\/[^\s"',]+)/g;
            while ((match = rawRegex.exec(text)) !== null) {
                found.push(match[1]);
            }
        }

        return found;
    }

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
                <div className="flex gap-3 relative group">
                    <input
                        className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all w-64 text-sm font-medium"
                        placeholder="Search by Order # or Name..."
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSearch(e)}
                    />
                    <Search className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                </div>
            </PageHeader>

            {/* Main Content Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="px-6 py-4 text-left font-semibold text-slate-500">Order</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-500">Date</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-500">Customer</th>
                                <th className="px-6 py-4 text-left font-semibold text-slate-500">Status</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-500">Total</th>
                                <th className="px-6 py-4 text-right font-semibold text-slate-500">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-slate-400">
                                        <Loader2 className="animate-spin mx-auto mb-2" />
                                        Loading orders...
                                    </td>
                                </tr>
                            ) : orders.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-16 text-center text-slate-400">
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
                                                group transition-all hover:bg-slate-50 cursor-pointer border-b border-slate-50 last:border-none
                                                ${isPriority ? 'bg-red-50/30' : ''}
                                            `}
                                            onClick={() => setSelectedOrder(order)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ${isPriority ? 'bg-red-100 text-red-600' : 'bg-slate-100 text-slate-600'}`}>
                                                        {order.billing.first_name?.[0]}
                                                    </div>
                                                    <div>
                                                        <div className="font-bold text-slate-900 flex items-center gap-2">
                                                            #{order.number}
                                                            {isPriority && (
                                                                <span className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0.5 rounded uppercase font-extrabold tracking-wide">
                                                                    Priority
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="text-sm text-slate-600 font-medium">
                                                    {format(new Date(order.date_created), "MMM dd, yyyy")}
                                                </div>
                                                <div className="text-xs text-slate-400">
                                                    {format(new Date(order.date_created), "hh:mm a")}
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 text-xs font-bold">
                                                        {order.billing.first_name?.[0]}
                                                    </div>
                                                    <div className="text-sm">
                                                        <div className="font-bold text-slate-800">{order.billing.first_name} {order.billing.last_name}</div>
                                                        <div className="text-xs text-slate-400">{order.billing.phone}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex flex-col items-start gap-1">
                                                    <StatusBadge status={order.status} />
                                                    {order.vendor_name && (
                                                        <span className="text-[10px] font-medium text-slate-500 uppercase tracking-wide">
                                                            {order.vendor_name}
                                                        </span>
                                                    )}
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-sm text-slate-700">
                                                <span dangerouslySetInnerHTML={{ __html: getSymbol(order.currency) + order.total }} />
                                            </td>
                                            <td className="p-4 text-right pr-6">
                                                <div className="flex items-center justify-end gap-2">
                                                    {order.s3Key && (
                                                        <a
                                                            href={`/api/view-url?key=${encodeURIComponent(order.s3Key)}`}
                                                            target="_blank"
                                                            rel="noopener noreferrer"
                                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 hover:border-indigo-200 rounded-lg text-xs font-bold shadow-sm transition-all"
                                                            title="Download PDF"
                                                            onClick={e => e.stopPropagation()}
                                                        >
                                                            <FileText size={14} /> PDF
                                                        </a>
                                                    )}
                                                    <button
                                                        onClick={() => setSelectedOrder(order)}
                                                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:border-indigo-300 hover:text-indigo-600 rounded-lg text-xs font-bold shadow-sm transition-all"
                                                    >
                                                        View <ChevronRight size={14} />
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

            {/* -------------------------------------------------------------------------- */
            /*                                 MODAL REDESIGN                               */
            /* -------------------------------------------------------------------------- */}
            {selectedOrder && (() => {
                const voiceScript = `Hello, little friend! I’m so happy you’re here.
Let’s step into a world full of magic and adventure.
Imagine a tiny bird learning to fly, a smiling moon lighting the night sky, and a forest filled with laughter.
Every story has a little spark of wonder waiting just for you.
So sit back, take a deep breath, and let the story begin!`;

                const whatsappTemplates = [
                    {
                        icon: <CheckCircle2 size={14} />,
                        label: "Order Confirmed",
                        text: `Hi ${selectedOrder.billing?.first_name}, Thanks for ordering from Little Fellows! 🎉 We've received order #${selectedOrder.number} and will start crafting it soon! 🎨`
                    },
                    {
                        icon: <MapPin size={14} />,
                        label: "Check Address",
                        text: `Hi ${selectedOrder.billing?.first_name}, Little Fellows here! 🌟 could you please confirm your shipping address for order #${selectedOrder.number}?`
                    },
                    {
                        icon: <Play size={14} />,
                        label: "Order Delayed",
                        text: `Hi ${selectedOrder.billing?.first_name}, Little Fellows here. 🐢 Apologies, but there is a slight delay with your magical story order #${selectedOrder.number}. We will ship it by...`
                    },
                    {
                        icon: <UploadCloud size={14} />,
                        label: "Photo Request",
                        text: `Hi ${selectedOrder.billing?.first_name}, Little Fellows Team here! 📸 For the best print quality on order #${selectedOrder.number}, could you please share a clearer photo?`
                    },
                    {
                        icon: <Download size={14} />,
                        label: "Shipping Update",
                        text: `Hi ${selectedOrder.billing?.first_name}, Great news! 🚀 Your order #${selectedOrder.number} is being shipped today. Get ready for the magic! ✨`
                    },
                    {
                        icon: <ArrowRight size={14} />,
                        label: "Out for Delivery",
                        text: `Hi ${selectedOrder.billing?.first_name}, Knock knock! 📦 Your Little Fellows package is out for delivery today. Hope you love it! ❤️`
                    },
                    {
                        icon: <Eye size={14} />,
                        label: "Review Request",
                        text: `Hi ${selectedOrder.billing?.first_name}, How was the book? 📚 We'd love to see photos of your little one enjoying it! Tag us @LittleFellows ✨`
                    },
                    {
                        icon: <Mic size={14} />,
                        label: "Request Voice",
                        special: true,
                        text: `Hi ${selectedOrder.billing?.first_name}! 🎙 This is Little Fellows.\n\nWe’re ready to personalize your story!\nPlease record this script:\n\n"${voiceScript}"\n\nCan't wait to hear it! ✨`
                    },
                ];



                return (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelectedOrder(null)}>
                        {/* Backdrop with Blur */}
                        <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />

                        {/* Modal Container */}
                        <div className="relative w-full max-w-6xl h-[90vh] bg-[#F8FAFC] rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-200 border border-white/20" onClick={e => e.stopPropagation()}>

                            {/* Header */}
                            <div className="flex items-center justify-between px-8 py-5 bg-white border-b border-slate-200/60 sticky top-0 z-10">
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-xl font-bold text-slate-800">Order #{selectedOrder.number}</h2>
                                        <StatusBadge status={selectedOrder.status} />
                                    </div>
                                    <p className="text-sm text-slate-500 mt-0.5">{format(new Date(selectedOrder.date_created), "MMMM dd, yyyy")} • via Direct Checkout</p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => setAssigningOrder(selectedOrder)}
                                        className="hidden md:flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-bold shadow-md shadow-indigo-200 transition-all"
                                    >
                                        Move to Next Stage <ArrowRight size={16} />
                                    </button>

                                    <div className="text-right border-l border-slate-100 pl-4 ml-2">
                                        <p className="text-[10px] uppercase font-bold text-slate-400">Total Amount</p>
                                        <p className="text-xl font-bold text-slate-900 leading-none">
                                            <span dangerouslySetInnerHTML={{ __html: getSymbol(selectedOrder.currency) + selectedOrder.total }} />
                                        </p>
                                    </div>
                                    <button onClick={() => setSelectedOrder(null)} className="p-2 bg-slate-100 hover:bg-slate-200 rounded-full text-slate-500 hover:text-red-500 transition-colors">
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Content Grid */}
                            <div className="flex-1 overflow-hidden flex flex-col lg:flex-row">

                                {/* LEFT COLUMN: Content (Items) */}
                                <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-bold text-slate-800">Order Items</h3>
                                        <button
                                            onClick={handleDownloadAll}
                                            disabled={downloadingZip}
                                            className="flex items-center gap-2 bg-white border border-slate-200 hover:border-indigo-300 text-slate-700 hover:text-indigo-600 px-4 py-2 rounded-xl text-sm font-bold shadow-sm transition-all disabled:opacity-50"
                                        >
                                            {downloadingZip ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                                            {downloadingZip ? "Zipping Photos..." : "Download Photos"}
                                        </button>
                                    </div>

                                    <div className="space-y-4">
                                        {selectedOrder.line_items?.map((item, idx) => (
                                            <div key={idx} className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row gap-6">
                                                {/* Image */}
                                                <div className="w-full md:w-32 md:h-32 bg-slate-50 rounded-lg flex-shrink-0 border border-slate-100 overflow-hidden relative group">
                                                    {item.image?.src ? (
                                                        <>
                                                            <img src={item.image.src} alt={item.name} className="w-full h-full object-cover" />
                                                            <a href={item.image.src} target="_blank" className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                                <Eye className="text-white drop-shadow-md" />
                                                            </a>
                                                        </>
                                                    ) : (
                                                        <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs font-bold uppercase">No Image</div>
                                                    )}
                                                </div>

                                                {/* Item Details */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex flex-col md:flex-row justify-between mb-4">
                                                        <div>
                                                            <h4 className="text-lg font-bold text-slate-900 leading-tight mb-1">{item.name}</h4>
                                                            <span className="inline-block bg-slate-100 text-slate-600 text-xs font-semibold px-2 py-0.5 rounded">Qty: {item.quantity}</span>
                                                        </div>
                                                        <div className="font-bold text-lg text-slate-700 mt-2 md:mt-0">
                                                            <span dangerouslySetInnerHTML={{ __html: getSymbol(selectedOrder.currency) + item.total }} />
                                                        </div>
                                                    </div>

                                                    {/* Attributes & Metadata */}
                                                    {item.meta_data && (
                                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 mb-4">
                                                            {item.meta_data.filter(shouldShowMeta).map((meta, mIdx) => (
                                                                <div key={mIdx} className="flex flex-col bg-slate-50 rounded-lg p-2 border border-slate-100">
                                                                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-0.5">
                                                                        {formatMetaKey(meta.display_key || meta.key)}
                                                                    </span>
                                                                    <div className="text-sm font-medium text-slate-700 break-all">
                                                                        {renderMetaValue(meta)}
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* VOICE INTEGRATION IN ITEM CARD */}
                                                    <VoiceControl
                                                        orderId={selectedOrder.id}
                                                        parentEmail={selectedOrder.billing.email}
                                                        item={item}
                                                    />

                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* RIGHT COLUMN: Actions Sidebar */}
                                <div className="w-full lg:w-[400px] border-l border-slate-200 bg-white overflow-y-auto">
                                    <div className="p-6 space-y-6">

                                        {/* Customer Profile Card */}
                                        <div className="p-4 rounded-xl bg-gradient-to-br from-indigo-50 to-white border border-indigo-100">
                                            <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-400 mb-4 flex items-center gap-2">
                                                <User size={14} /> Customer Profile
                                            </h4>

                                            <div className="flex items-center gap-3 mb-4">
                                                <div className="w-12 h-12 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shadow-lg shadow-indigo-200">
                                                    {selectedOrder.billing.first_name[0]}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-slate-900">{selectedOrder.billing.first_name} {selectedOrder.billing.last_name}</div>
                                                    <div className="text-xs text-indigo-600 font-medium">Little Fellow</div>
                                                </div>
                                            </div>

                                            <div className="space-y-3">
                                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors">
                                                    <Mail size={16} className="text-slate-400" />
                                                    <div className="text-sm font-medium text-slate-700 truncate">{selectedOrder.billing.email}</div>
                                                </div>
                                                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white transition-colors">
                                                    <Phone size={16} className="text-slate-400" />
                                                    <div className="text-sm font-medium text-slate-700">{selectedOrder.billing.phone || "N/A"}</div>
                                                </div>
                                                <div className="flex items-start gap-3 p-2 rounded-lg hover:bg-white transition-colors">
                                                    <MapPin size={16} className="text-slate-400 mt-0.5" />
                                                    <div className="text-sm font-medium text-slate-700">
                                                        <div className="line-clamp-3">
                                                            {[
                                                                selectedOrder.billing.address_1,
                                                                selectedOrder.billing.address_2,
                                                                selectedOrder.billing.city,
                                                                selectedOrder.billing.state,
                                                                selectedOrder.billing.postcode,
                                                                selectedOrder.billing.country
                                                            ].filter(Boolean).join(", ")}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* WHATSAPP MODULE */}
                                        <div className="space-y-4">
                                            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
                                                <div className="p-1.5 bg-green-100 text-green-600 rounded-lg">
                                                    <MessageSquare size={16} />
                                                </div>
                                                <h4 className="font-bold text-slate-800 text-sm">
                                                    Send WhatsApp Message
                                                </h4>
                                            </div>

                                            <div className="grid grid-cols-2 gap-2">
                                                {whatsappTemplates.map((t, i) => (
                                                    <button
                                                        key={i}
                                                        onClick={() => setWhatsappMsg(t.text)}
                                                        className={clsx(
                                                            "px-3 py-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-2",
                                                            t.special
                                                                ? "col-span-2 bg-indigo-50 border-indigo-200 text-indigo-700 hover:bg-indigo-100"
                                                                : "bg-white border-slate-200 text-slate-600 hover:bg-green-50 hover:text-green-700 hover:border-green-200"
                                                        )}
                                                    >
                                                        {t.icon}
                                                        <span>{t.label}</span>
                                                    </button>
                                                ))}
                                            </div>

                                            <div className="space-y-2">
                                                <div className="relative group">
                                                    <textarea
                                                        className="w-full h-32 p-3 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:bg-white focus:ring-2 focus:ring-green-500/20 focus:border-green-500 outline-none resize-none transition-all placeholder:text-slate-400"
                                                        value={whatsappMsg}
                                                        onChange={e => setWhatsappMsg(e.target.value)}
                                                        placeholder="Select a template above or type your message here..."
                                                    />
                                                </div>
                                                <button
                                                    onClick={sendWhatsApp}
                                                    disabled={!selectedOrder.billing.phone || !whatsappMsg}
                                                    className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-green-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:shadow-none"
                                                >
                                                    <MessageSquare size={18} fill="currentColor" />
                                                    Open in WhatsApp
                                                </button>
                                            </div>
                                        </div>

                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                );
            })()}

            {/* Assign Vendor Modal */}
            {assigningOrder && (
                <AssignVendorModal
                    order={assigningOrder}
                    onClose={() => setAssigningOrder(null)}
                    onSuccess={(vendorName) => {
                        // Optimistic Update
                        setOrders(prev => prev.map(o =>
                            o.id === assigningOrder.id ? { ...o, status: "Assigned to Vendor", vendor_name: vendorName } : o
                        ));

                        if (selectedOrder?.id === assigningOrder.id) {
                            setSelectedOrder(prev => prev ? { ...prev, status: "Assigned to Vendor", vendor_name: vendorName } : null);
                        }

                        setAssigningOrder(null);
                        // Optional: Keep detail modal open to show the new status, or close it.
                        // User flow suggests seeing the update is good.
                        alert(`Order assigned to ${vendorName}!`);
                    }}
                />
            )}

        </div>
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

function formatMetaKey(key: string) {
    if (!key) return '';
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function shouldShowMeta(meta: any) {
    const key = (meta.key || '').toLowerCase();
    if (key.startsWith('_')) return false;
    if (key.includes('prad_selection') || key.includes('cart_item_prad')) return false;
    return true;
}

function renderMetaValue(meta: any) {
    // rawVal might be "https://..." OR "<span><a href='...'>...</a>...</span>"
    // OR it could be a simple string
    const rawVal = String(meta.value || '');
    const displayVal = String(meta.display_value || meta.value || '');

    // Logic to detect if this is an "Upload" related key to give it special treatment
    const isUploadKey = /upload|photo|image|picture|file/i.test(meta.key || '');

    // Attempt to extract all URLs
    const urls: string[] = [];

    // 1. Try regex on rawVal
    const hrefRegex = /href=["']([^"']+)["']/g;
    let match;
    while ((match = hrefRegex.exec(rawVal)) !== null) {
        if (match[1].startsWith('http')) urls.push(match[1]);
    }

    // 2. If valid URL starts with http (and no HTML tags usually), push it
    if (urls.length === 0 && rawVal.trim().startsWith('http')) {
        // It could be comma separated
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
                        <a
                            key={idx}
                            href={url}
                            download={filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center justify-center gap-2 w-full sm:w-auto px-4 py-2 bg-white border border-slate-200 text-slate-700 font-bold text-sm rounded-xl hover:bg-slate-50 hover:text-indigo-600 hover:border-indigo-300 transition-all shadow-sm"
                            title="Download Photo"
                        >
                            <Download size={16} />
                            <span>Download {urls.length > 1 ? `#${idx + 1}` : 'Photo'}</span>
                        </a>
                    );
                })}
            </div>
        );
    }

    if (urls.length > 0) {
        // Just generic links
        return (
            <div className="flex flex-col gap-1 mt-1">
                {urls.map((url, idx) => {
                    const filename = url.split('/').pop() || 'File';
                    const displayLabel = filename.length > 20 ? filename.substring(0, 8) + '...' + filename.substring(filename.length - 7) : filename;
                    return (
                        <a
                            key={idx}
                            href={url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-blue-50 text-blue-700 hover:bg-blue-100 hover:text-blue-800 transition-colors border border-blue-100 w-fit"
                            title={filename}
                            onClick={e => e.stopPropagation()}
                        >
                            <Eye size={12} />
                            <span className="truncate text-[10px] font-bold uppercase tracking-wide">{displayLabel}</span>
                        </a>
                    );
                })}
            </div>
        );
    }

    // Default: render string or HTML
    return <span className="text-slate-700" dangerouslySetInnerHTML={{ __html: displayVal }} />;
}

/* -------------------------------------------------------------------------- */
/*                               Voice Component                              */
/* -------------------------------------------------------------------------- */


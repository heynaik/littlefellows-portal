"use client";

import { useEffect, useState } from "react";
import { format } from "date-fns";
import {
    Search, Filter, Loader2, ChevronLeft, ChevronRight,
    User, Mail, Phone, MapPin, ShoppingBag
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";

/* -------------------------------------------------------------------------- */
/*                                    Types                                   */
/* -------------------------------------------------------------------------- */
type WooCommerceCustomer = {
    id: number;
    email: string;
    first_name: string;
    last_name: string;
    username: string;
    date_created: string;
    total_spent: string;
    orders_count: number;
    billing: {
        phone: string;
        city: string;
        state: string;
        postcode: string;
        country: string;
    };
    avatar_url: string;
};

/* -------------------------------------------------------------------------- */
/*                                  Component                                 */
/* -------------------------------------------------------------------------- */
export default function CustomersPage() {
    const [customers, setCustomers] = useState<WooCommerceCustomer[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [totalCustomers, setTotalCustomers] = useState(0);

    // History Logic
    const [selectedCustomer, setSelectedCustomer] = useState<WooCommerceCustomer | null>(null);
    const [historyOrders, setHistoryOrders] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [filterOpen, setFilterOpen] = useState(false);
    const [filterType, setFilterType] = useState<"all" | "registered" | "guest">("all");
    const [sortType, setSortType] = useState<"date_desc" | "spend_desc" | "orders_desc">("date_desc");
    const [minOrders, setMinOrders] = useState("0");

    // Fetch History when customer selected
    useEffect(() => {
        if (!selectedCustomer) {
            setHistoryOrders([]);
            return;
        }

        async function fetchHistory() {
            setHistoryLoading(true);
            try {
                // Search orders by email
                const res = await fetch(`/api/woo-orders?search=${encodeURIComponent(selectedCustomer!.email)}&per_page=10`);
                const data = await res.json();
                setHistoryOrders(data.orders || []);
            } catch (error) {
                console.error("Failed to fetch history", error);
            } finally {
                setHistoryLoading(false);
            }
        }
        fetchHistory();
    }, [selectedCustomer]);

    // Update fetchCustomers to use filterType
    async function fetchCustomersInternal() {
        setLoading(true);
        try {
            const p = new URLSearchParams({
                page: String(page),
                per_page: "20",
                search: search,
                type: filterType, // Pass filter type
                sort: sortType,
                min_orders: minOrders
            });
            const res = await fetch(`/api/customers?${p.toString()}`);
            if (!res.ok) throw new Error("Failed to load customers");
            const data = await res.json();
            setCustomers(data.customers || []);
            setTotalPages(data.totalPages ? Number(data.totalPages) : 1);
            setTotalCustomers(data.total ? Number(data.total) : 0);
        } catch (err: any) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    }

    // Effect to refetch when filter changes
    useEffect(() => {
        setPage(1); // Reset page on filter change
        fetchCustomersInternal();
    }, [filterType, sortType, minOrders]);

    // Override original effect for page/search only (or merge them)
    // Actually, let's just use one effect that depends on page, search, filterType
    useEffect(() => {
        fetchCustomersInternal();
    }, [page, search, filterType, sortType, minOrders]);


    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1);
        fetchCustomersInternal(); // Call our internal func
    };

    return (
        <div className="min-h-screen bg-[#F8FAFC] p-6 space-y-6 relative">

            {/* Header Area */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Customers</h1>
                    <p className="text-slate-500 text-sm mt-1">
                        View and manage your store's customer base.
                        {!loading && <span className="ml-2 bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">{totalCustomers} Total</span>}
                    </p>
                </div>

                <div className="flex gap-3 relative z-20">
                    <form onSubmit={handleSearch} className="relative group">
                        <input
                            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all w-64 text-sm font-medium"
                            placeholder="Search customers..."
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                        <Search className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    </form>

                    <div className="relative">
                        <button
                            onClick={() => setFilterOpen(!filterOpen)}
                            className="flex items-center gap-2 bg-white border border-slate-200 text-slate-700 px-4 py-2.5 rounded-xl font-bold shadow-sm hover:bg-slate-50 hover:border-slate-300 transition-all"
                        >
                            <Filter size={18} />
                            <span>Filters</span>
                        </button>

                        {filterOpen && (
                            <div className="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl border border-slate-100 py-2 animate-in fade-in zoom-in-95 duration-200">
                                <div className="px-4 py-2 text-xs font-bold uppercase text-slate-400 tracking-wider">Type</div>
                                <button onClick={() => { setFilterType("all"); setFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-indigo-50 transition-colors ${filterType === 'all' ? 'text-indigo-600' : 'text-slate-700'}`}>All Customers</button>
                                <button onClick={() => { setFilterType("registered"); setFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-indigo-50 transition-colors ${filterType === 'registered' ? 'text-indigo-600' : 'text-slate-700'}`}>Registered Users</button>
                                <button onClick={() => { setFilterType("guest"); setFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-indigo-50 transition-colors ${filterType === 'guest' ? 'text-indigo-600' : 'text-slate-700'}`}>Guest Users</button>

                                <div className="border-t border-slate-100 my-1"></div>
                                <div className="px-4 py-2 text-xs font-bold uppercase text-slate-400 tracking-wider">Activity</div>
                                <button onClick={() => { setMinOrders(minOrders === "0" ? "2" : "0"); setFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-indigo-50 transition-colors ${minOrders !== "0" ? 'text-indigo-600' : 'text-slate-700'}`}>
                                    {minOrders === "0" ? "Show Repeat Customers" : "Showing Repeat Customers Only"}
                                </button>

                                <div className="border-t border-slate-100 my-1"></div>
                                <div className="px-4 py-2 text-xs font-bold uppercase text-slate-400 tracking-wider">Sort By</div>
                                <button onClick={() => { setSortType("date_desc"); setFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-indigo-50 transition-colors ${sortType === 'date_desc' ? 'text-indigo-600' : 'text-slate-700'}`}>Newest First</button>
                                <button onClick={() => { setSortType("spend_desc"); setFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-indigo-50 transition-colors ${sortType === 'spend_desc' ? 'text-indigo-600' : 'text-slate-700'}`}>Highest Spent</button>
                                <button onClick={() => { setSortType("orders_desc"); setFilterOpen(false); }} className={`w-full text-left px-4 py-2 text-sm font-medium hover:bg-indigo-50 transition-colors ${sortType === 'orders_desc' ? 'text-indigo-600' : 'text-slate-700'}`}>Most Orders</button>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Customers Table */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-100 text-xs uppercase tracking-wider text-slate-500 font-bold">
                                <th className="p-4 pl-6">Customer</th>
                                <th className="p-4">Contact</th>
                                <th className="p-4">Location</th>
                                <th className="p-4">Stats</th>
                                <th className="p-4">Registered</th>
                                <th className="p-4 text-center">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                <tr><td colSpan={6} className="p-16 text-center text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" />Loading customers...</td></tr>
                            ) : customers.length === 0 ? (
                                <tr><td colSpan={6} className="p-16 text-center text-slate-400">No customers found.</td></tr>
                            ) : customers.map(customer => (
                                <tr
                                    key={customer.id}
                                    className="group hover:bg-slate-50 transition-colors cursor-pointer"
                                    onClick={() => setSelectedCustomer(customer)}
                                >
                                    <td className="p-4 pl-6">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-lg">
                                                {customer.avatar_url ? (
                                                    <img src={customer.avatar_url} alt="" className="w-full h-full rounded-full object-cover" onError={(e) => { e.currentTarget.style.display = 'none'; }} />
                                                ) : (
                                                    customer.first_name?.[0] || customer.email[0]
                                                )}
                                                {/* Fallback Initial if img fails or is hidden */}
                                                {!customer.avatar_url && (customer.first_name?.[0] || customer.email[0])}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-900">
                                                    {customer.first_name || customer.last_name ? `${customer.first_name} ${customer.last_name}` : customer.username}
                                                </div>
                                                <div className="text-xs text-slate-400">ID: #{customer.id} {customer.username === "Guest" && <span className="bg-slate-200 text-slate-600 px-1.5 rounded ml-1">GUEST</span>}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex flex-col gap-1">
                                            <div className="flex items-center gap-2 text-sm text-slate-600">
                                                <Mail size={14} className="text-slate-400" /> {customer.email}
                                            </div>
                                            {customer.billing.phone && (
                                                <div className="flex items-center gap-2 text-sm text-slate-600">
                                                    <Phone size={14} className="text-slate-400" /> {customer.billing.phone}
                                                </div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex items-start gap-2 text-sm text-slate-600">
                                            <MapPin size={14} className="text-slate-400 mt-0.5 flex-shrink-0" />
                                            <span className="truncate max-w-[150px]">
                                                {[customer.billing.city, customer.billing.state, customer.billing.country].filter(Boolean).join(", ")}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="flex gap-4">
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-slate-400 uppercase">Orders</div>
                                                <div className="font-bold text-slate-800">{customer.orders_count}</div>
                                            </div>
                                            <div className="text-center">
                                                <div className="text-xs font-bold text-slate-400 uppercase">Spent</div>
                                                <div className="font-bold text-green-600">₹{customer.total_spent}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="p-4 text-sm text-slate-500 font-medium">
                                        {format(new Date(customer.date_created), "MMM dd, yyyy")}
                                    </td>
                                    <td className="p-4 text-center">
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setSelectedCustomer(customer); }}
                                            className="text-indigo-600 text-xs font-bold hover:underline"
                                        >
                                            View History
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between p-4 border-t border-slate-100 bg-slate-50/30">
                    <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="text-sm font-medium text-slate-600">Page {page} of {totalPages}</span>
                    <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            </div>

            {/* SIDE DRAWER FOR HISTORY */}
            {selectedCustomer && (
                <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSelectedCustomer(null)}>
                    <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm transition-opacity" />
                    <div
                        className="relative w-full max-w-md h-full bg-white shadow-2xl animate-in slide-in-from-right duration-300 flex flex-col"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Customer History</h2>
                                <p className="text-sm text-slate-500">{selectedCustomer.first_name} {selectedCustomer.last_name}</p>
                            </div>
                            <button onClick={() => setSelectedCustomer(null)} className="p-2 hover:bg-slate-200 rounded-full transition-colors text-slate-500">
                                <ChevronRight size={20} />
                            </button>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 space-y-4">
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Recent Orders</h3>

                            {historyLoading ? (
                                <div className="text-center py-10 text-slate-400"><Loader2 className="animate-spin mx-auto mb-2" /> Loading orders...</div>
                            ) : historyOrders.length === 0 ? (
                                <div className="text-center py-10 text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">No orders found.</div>
                            ) : (
                                historyOrders.map((order) => (
                                    <div key={order.id} className="p-4 rounded-xl border border-slate-100 bg-white shadow-sm hover:shadow-md transition-shadow">
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="font-bold text-indigo-600">#{order.number}</span>
                                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                                                order.status === 'processing' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
                                                }`}>
                                                {order.status}
                                            </span>
                                        </div>
                                        <div className="flex justify-between items-end">
                                            <div className="text-sm text-slate-500">
                                                {format(new Date(order.date_created), "MMM dd, yyyy")}
                                            </div>
                                            <div className="font-bold text-slate-900">
                                                {order.currency_symbol}{order.total}
                                            </div>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="p-4 border-t border-slate-100 bg-slate-50">
                            <div className="flex items-center gap-3">
                                <div className="flex-1">
                                    <div className="text-xs text-slate-500 uppercase font-bold">Total Spent</div>
                                    <div className="text-lg font-bold text-green-600">₹{selectedCustomer.total_spent}</div>
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs text-slate-500 uppercase font-bold">Orders</div>
                                    <div className="text-lg font-bold text-slate-800">{selectedCustomer.orders_count}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

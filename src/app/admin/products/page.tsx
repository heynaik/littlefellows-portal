"use client";

import { useAuthUser } from "@/lib/auth";

import { useEffect, useState } from "react";
import type { Product } from "@/lib/types";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Button } from "@/components/ui/button";

export default function AdminProductsPage() {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [search, setSearch] = useState("");
    const [page, setPage] = useState(1);

    const [totalPages, setTotalPages] = useState(1);
    const { user } = useAuthUser();

    const fetchProducts = async (pageToFetch = 1, searchQuery = "") => {
        setLoading(true);
        setError(null);
        try {
            const p = new URLSearchParams({
                page: pageToFetch.toString(),
                per_page: "20",
                search: searchQuery,
            });
            const token = user ? await user.getIdToken() : "";
            const res = await fetch(`/api/products?${p.toString()}`, {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            });
            if (!res.ok) throw new Error("Failed to load products");
            const data = await res.json();
            setProducts(data.products);
            setTotalPages(parseInt(data.totalPages || "1", 10));
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (user) {
            fetchProducts(page, search);
        }
    }, [page, user]); // Search needs manual trigger or debounce

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        setPage(1); // Reset to page 1
        fetchProducts(1, search);
    };

    return (
        <div className="space-y-6 bg-[#F8FAFC] min-h-screen p-6">
            <PageHeader
                title="Products"
                description="View and manage your WooCommerce product catalog."
            >
                <div className="flex gap-3">
                    <form onSubmit={handleSearch} className="relative group">
                        <input
                            className="pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 bg-white shadow-sm focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 focus:outline-none transition-all w-64 text-sm font-medium"
                            placeholder="Search products..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                        <Search className="absolute left-3.5 top-3 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                    </form>
                    <a
                        href={process.env.NEXT_PUBLIC_WOOCOMMERCE_ADMIN_URL || "#"}
                        target="_blank"
                        rel="noreferrer"
                    >
                        <Button variant="outline" className="h-full">
                            WooCommerce Admin
                        </Button>
                    </a>
                </div>
            </PageHeader>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-black/5">
                <div className="border-b border-slate-200 bg-slate-50 px-6 py-3 text-sm font-medium text-slate-500">
                    {loading ? 'Loading...' : `Showing ${products.length} products`}
                </div>

                {error && (
                    <div className="border-b border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700">
                        {error}
                    </div>
                )}

                <div className="overflow-x-auto">
                    <table className="table w-full">
                        <thead className="bg-slate-50 text-slate-500">
                            <tr className="border-b border-slate-200 text-xs font-medium">
                                <th className="px-6 py-3 text-left w-20">Image</th>
                                <th className="px-6 py-3 text-left">Name / SKU</th>
                                <th className="px-6 py-3 text-left">Stock</th>
                                <th className="px-6 py-3 text-left">Price</th>
                                <th className="px-6 py-3 text-left">Status</th>
                                <th className="px-6 py-3 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {products.map((product) => (
                                <tr key={product.id} className="hover:bg-slate-50">
                                    <td className="px-6 py-4">
                                        <div className="h-12 w-12 overflow-hidden rounded-lg bg-slate-100">
                                            {product.images?.[0] ? (
                                                <img
                                                    src={product.images[0].src}
                                                    alt={product.images[0].alt}
                                                    className="h-full w-full object-cover"
                                                />
                                            ) : (
                                                <div className="flex h-full w-full items-center justify-center text-xs text-slate-400">No Img</div>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex flex-col">
                                            <span className="font-medium text-slate-900">{product.name}</span>
                                            <span className="text-xs text-slate-400">SKU: {product.sku || 'N/A'}</span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-slate-600">
                                        {product.stock_quantity ?? '∞'} <span className="text-xs text-slate-400">({product.stock_status})</span>
                                    </td>
                                    <td className="px-6 py-4 text-sm font-medium text-slate-900">
                                        <div dangerouslySetInnerHTML={{ __html: product.price_html || `${product.price} ` }} />
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${product.status === 'publish' ? 'bg-green-100 text-green-800' :
                                            product.status === 'private' ? 'bg-amber-100 text-amber-800' :
                                                'bg-slate-100 text-slate-800'
                                            }`}>
                                            {product.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <a
                                            href={product.permalink}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn-ghost text-xs"
                                        >
                                            View
                                        </a>
                                    </td>
                                </tr>
                            ))}
                            {!loading && products.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-sm text-slate-500">
                                        No products found.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-6 py-3">
                    <button
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        disabled={page === 1 || loading}
                        className="btn-ghost disabled:opacity-50"
                    >
                        Previous
                    </button>
                    <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
                    <button
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        disabled={page === totalPages || loading}
                        className="btn-ghost disabled:opacity-50"
                    >
                        Next
                    </button>
                </div>
            </div>
        </div>
    );
}

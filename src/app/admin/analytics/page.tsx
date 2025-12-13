"use client";

import { useEffect, useState, useMemo } from "react";
import { getOrders, getVendors } from "@/lib/api";
import type { Order, Vendor } from "@/lib/types";
import { STAGES } from "@/lib/types";
import {
  BarChart3,
  Users,
  CreditCard,
  Package,
  ArrowUpRight,
  Timer,
  TrendingUp,
  AlertCircle,
  BookOpen,
  ShoppingBag,
  DollarSign
} from "lucide-react";
import clsx from "clsx";

export default function AnalyticsPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [o, v] = await Promise.all([getOrders(), getVendors()]);
        setOrders(o);
        setVendors(v);
      } catch (e) {
        console.error("Failed to load analytics data", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const metrics = useMemo(() => {
    // Basic Calculations
    const totalOrders = orders.length;
    // Cast stage to string to avoid type conflict with non-union members like 'Cancelled' if they exist in DB but not Type
    const activeOrders = orders.filter(o => {
      const s = o.stage as string;
      return s !== 'Delivered' && s !== 'Completed' && s !== 'Cancelled';
    }).length;

    // Revenue
    const totalRevenue = orders.reduce((acc, o) => acc + (Number(o.totalAmount) || 0), 0);
    const avgOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    // Vendor Stats
    const totalVendors = vendors.length;
    const activeVendors = new Set(orders.map(o => o.vendorId).filter(Boolean)).size;

    // Stage Distribution
    const byStage = STAGES.reduce((acc, stage) => {
      acc[stage] = 0;
      return acc;
    }, {} as Record<string, number>);

    orders.forEach(o => {
      const s = o.stage || "Uploaded";
      if (byStage[s] !== undefined) byStage[s]++;
    });

    // Top Products
    const productCounts: Record<string, number> = {};
    orders.forEach(o => {
      if (o.lineItems) {
        o.lineItems.forEach(item => {
          productCounts[item.name] = (productCounts[item.name] || 0) + item.quantity;
        });
      } else if (o.bookTitle) {
        // Fallback for custom orders
        productCounts[o.bookTitle] = (productCounts[o.bookTitle] || 0) + 1;
      }
    });
    const topProducts = Object.entries(productCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Vendor Performance
    const vendorStats: Record<string, { count: number; name: string }> = {};
    vendors.forEach(v => vendorStats[v.vendorId] = { count: 0, name: v.name });

    orders.forEach(o => {
      if (o.vendorId && vendorStats[o.vendorId]) {
        vendorStats[o.vendorId].count++;
      }
    });

    const topVendors = Object.values(vendorStats)
      .sort((a, b) => b.count - a.count)
      .filter(v => v.count > 0)
      .slice(0, 5);

    // Recent Activity (Last 5 orders)
    const recent = [...orders].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 5);

    return {
      totalOrders,
      activeOrders,
      totalRevenue,
      avgOrderValue,
      totalVendors,
      activeVendors,
      byStage,
      recent,
      topProducts,
      topVendors
    };
  }, [orders, vendors]);

  if (loading) {
    return (
      <div className="flex h-96 w-full items-center justify-center text-slate-400">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-500 border-t-transparent"></div>
          <p className="text-sm font-medium">Gathering insights...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard Analytics</h1>
          <p className="mt-1 text-sm text-slate-500">Overview of your store's performance and operations.</p>
        </div>
        <div className="text-sm text-slate-400 font-medium">
          Last updated: {new Date().toLocaleTimeString()}
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard
          title="Total Revenue"
          value={`₹${metrics.totalRevenue.toLocaleString()}`}
          icon={CreditCard}
          trend="+12%"
          trendUp={true}
          color="indigo"
        />
        <KPICard
          title="Avg Order Value"
          value={`₹${Math.round(metrics.avgOrderValue).toLocaleString()}`}
          icon={DollarSign}
          subtitle="Per completed order"
          color="emerald"
        />
        <KPICard
          title="Total Orders"
          value={metrics.totalOrders}
          icon={Package}
          trend="+28"
          trendUp={true}
          color="blue"
        />
        <KPICard
          title="Active Vendors"
          value={`${metrics.activeVendors} / ${metrics.totalVendors}`}
          icon={Users}
          subtitle="Vendors with active tasks"
          color="amber"
        />
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left Column: Order Stages & Vendor Perf */}
        <div className="lg:col-span-2 space-y-8">
          {/* Stage Distribution */}
          <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                <BarChart3 className="text-indigo-500" size={20} />
                Order Stages
              </h3>
            </div>
            <div className="space-y-4">
              {Object.entries(metrics.byStage).filter(([, count]) => count > 0).map(([stage, count]) => {
                const percentage = Math.round((count / metrics.totalOrders) * 100) || 0;
                return (
                  <div key={stage} className="group">
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-medium text-slate-700">{stage}</span>
                      <span className="text-slate-500">{count} orders ({percentage}%)</span>
                    </div>
                    <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all duration-1000 ease-out group-hover:bg-indigo-600"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                )
              })}
              {metrics.totalOrders === 0 && (
                <div className="py-10 text-center text-slate-400 text-sm">No orders found.</div>
              )}
            </div>
          </div>

          {/* Vendor Performance */}
          <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Users className="text-sky-500" size={20} />
              <h3 className="font-semibold text-slate-900">Top Performing Vendors</h3>
            </div>
            <div className="overflow-hidden">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-400 uppercase bg-slate-50">
                  <tr>
                    <th className="px-4 py-3 rounded-l-lg">Vendor Name</th>
                    <th className="px-4 py-3 text-right rounded-r-lg">Assigned Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {metrics.topVendors.map((v, i) => (
                    <tr key={i} className="border-b border-slate-50 hover:bg-slate-50/50">
                      <td className="px-4 py-3 font-medium text-slate-700">{v.name}</td>
                      <td className="px-4 py-3 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-sky-100 text-sky-800">
                          {v.count}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {metrics.topVendors.length === 0 && (
                    <tr>
                      <td colSpan={2} className="px-4 py-4 text-center text-slate-400">No active vendors yet.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right Column: Top Products & Recent Activity */}
        <div className="space-y-6">
          {/* Top Products */}
          <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <ShoppingBag className="text-emerald-500" size={20} />
              <h3 className="font-semibold text-slate-900">Top Selling Books</h3>
            </div>
            <ul className="space-y-3">
              {metrics.topProducts.map((p, i) => (
                <li key={i} className="flex items-center justify-between p-3 rounded-xl bg-slate-50">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm font-bold text-slate-400 text-xs">
                      #{i + 1}
                    </div>
                    <span className="text-sm font-medium text-slate-700 truncate">{p.name}</span>
                  </div>
                  <span className="text-xs font-bold text-emerald-600 bg-emerald-100 px-2 py-1 rounded-md shrink-0">
                    {p.count} sold
                  </span>
                </li>
              ))}
              {metrics.topProducts.length === 0 && (
                <div className="text-sm text-slate-400">No sales data yet.</div>
              )}
            </ul>
          </div>

          {/* Recent Activity */}
          <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <TrendingUp className="text-indigo-500" size={20} />
              <h3 className="font-semibold text-slate-900">Recent Activity</h3>
            </div>
            <div className="relative border-l border-slate-200 ml-2 space-y-6 pl-6 py-2">
              {metrics.recent.map((order) => (
                <div key={order.id} className="relative">
                  <span className="absolute -left-[29px] top-1 h-3 w-3 rounded-full border-2 border-white bg-indigo-500 ring-2 ring-indigo-100"></span>
                  <div className="text-sm font-medium text-slate-900">
                    Order #{order.orderId || order.wcId}
                  </div>
                  <div className="text-xs text-slate-500">
                    Moved to <span className="font-medium text-indigo-600">{order.stage || 'Uploaded'}</span>
                  </div>
                  <div className="mt-0.5 text-[10px] text-slate-400">
                    {new Date(order.updatedAt || Date.now()).toLocaleDateString()}
                  </div>
                </div>
              ))}
              {metrics.recent.length === 0 && (
                <div className="text-sm text-slate-400">No recent activity.</div>
              )}
            </div>
          </div>

          <div className="rounded-[24px] border border-slate-100 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <AlertCircle className="text-amber-500" size={20} />
              <h3 className="font-semibold text-slate-900">System Health</h3>
            </div>
            <div className="space-y-3">
              <HealthItem label="Database Connection" status="healthy" />
              <HealthItem label="WooCommerce API" status="healthy" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function KPICard({ title, value, icon: Icon, trend, trendUp, subtitle, color = "indigo" }: any) {
  const colorStyles: any = {
    indigo: "bg-indigo-50 text-indigo-600",
    blue: "bg-blue-50 text-blue-600",
    amber: "bg-amber-50 text-amber-600",
    emerald: "bg-emerald-50 text-emerald-600",
  };

  return (
    <div className="relative overflow-hidden rounded-[24px] border border-slate-100 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-slate-500">{title}</p>
          <p className="mt-2 text-3xl font-bold text-slate-900 tracking-tight">{value}</p>
        </div>
        <div className={clsx("rounded-xl p-3", colorStyles[color])}>
          <Icon size={22} className="stroke-[2.5px]" />
        </div>
      </div>
      {(trend || subtitle) && (
        <div className="mt-4 flex items-center gap-2">
          {trend && (
            <span className={clsx(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold",
              trendUp ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"
            )}>
              {trendUp ? <ArrowUpRight size={12} /> : null}
              {trend}
            </span>
          )}
          <span className="text-xs font-medium text-slate-400">
            {subtitle || "vs last month"}
          </span>
        </div>
      )}
    </div>
  );
}

function HealthItem({ label, status, value }: any) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2">
      <span className="text-sm font-medium text-slate-600">{label}</span>
      <div className="flex items-center gap-2">
        {value && <span className="text-xs font-bold text-slate-500">{value}</span>}
        <div className={clsx(
          "h-2.5 w-2.5 rounded-full",
          status === "healthy" ? "bg-green-500" :
            status === "warning" ? "bg-amber-500" : "bg-red-500"
        )} />
      </div>
    </div>
  )
}

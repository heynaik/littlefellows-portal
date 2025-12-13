"use client";

import { useEffect, useState } from "react";
import {
  ShoppingBag, Users, Calendar, TrendingUp,
  ArrowRight, Package, CreditCard, ChevronRight,
  Loader2, AlertCircle
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { isPriorityOrder } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    orders: 0,
    customers: 0,
    priority: 0,
    sales: "0.00"
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        // Fetch in parallel for speed
        const [ordersRes, customersRes, statsRes] = await Promise.all([
          fetch('/api/woo-orders?per_page=5'),
          fetch('/api/customers?per_page=1'),
          fetch('/api/dashboard-stats')
        ]);

        const ordersData = await ordersRes.json();
        const customersData = await customersRes.json();
        const statsData = await statsRes.json();

        // Calculate gross sales from recent batch (approx) or just use header if we had it. 
        // For now, let's just show Total Orders and Customers which we know are accurate from headers/data.

        // Note: Real "Total Sales" usually requires a specific report endpoint or iterating all orders.
        // We will stick to accurate counts for now.

        setStats({
          orders: ordersData.total || 0,
          customers: customersData.total || 0,
          priority: statsData.priority_count || 0,
          sales: statsData.revenue ? `₹${statsData.revenue.toLocaleString()}` : "₹0"
        });

        setRecentOrders(ordersData.orders || []);

      } catch (error) {
        console.error("Dashboard load failed", error);
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  const QuickAction = ({ icon: Icon, title, desc, href, color }: any) => {
    const bgColors: Record<string, string> = {
      blue: "bg-blue-500",
      indigo: "bg-indigo-500",
      orange: "bg-orange-500",
      green: "bg-green-500",
      red: "bg-red-500"
    };

    return (
      <Link
        href={href}
        className="group p-4 bg-white rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-all flex items-start gap-4"
      >
        <div className={`p-3 rounded-lg ${bgColors[color] || 'bg-slate-500'} text-white group-hover:scale-110 transition-transform`}>
          <Icon size={24} />
        </div>
        <div>
          <h3 className="font-bold text-slate-900">{title}</h3>
          <p className="text-sm text-slate-500 mt-1">{desc}</p>
        </div>
      </Link>
    );
  };

  const StatCard = ({ title, value, icon: Icon, trend, color, loading }: any) => {
    // Map base color name to specific utility classes
    const colorStyles: Record<string, { bg: string, text: string, ring: string }> = {
      blue: { bg: "bg-blue-50", text: "text-blue-600", ring: "ring-blue-100" },
      indigo: { bg: "bg-indigo-50", text: "text-indigo-600", ring: "ring-indigo-100" },
      orange: { bg: "bg-orange-50", text: "text-orange-600", ring: "ring-orange-100" },
      green: { bg: "bg-green-50", text: "text-green-600", ring: "ring-green-100" },
      red: { bg: "bg-red-50", text: "text-red-600", ring: "ring-red-100" },
    };
    const style = colorStyles[color] || colorStyles.blue;

    return (
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)]">
        <div className="flex items-center justify-between mb-4">
          <div className={`p-3 rounded-xl ${style.bg} ${style.text}`}>
            <Icon size={24} className="stroke-[2.5px]" />
          </div>
          {trend && !loading && (
            <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded-full flex items-center gap-1">
              <TrendingUp size={12} /> {trend}
            </span>
          )}
        </div>
        <div className="text-3xl font-extrabold text-slate-900">
          {loading ? <Skeleton className="h-9 w-24" /> : value}
        </div>
        <div className="text-sm text-slate-500 font-medium mt-1">{title}</div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-8 space-y-8">
      {/* Upgrade Banner (Simulated "Premium" feel) */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-3xl p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10">
          <h1 className="text-3xl font-extrabold mb-2">Welcome back, Admin! 👋</h1>
          <p className="text-indigo-100 max-w-xl">
            Here's what's happening in your store today. You have <span className="font-bold text-white">{loading ? '...' : stats.orders} total orders</span> processing.
          </p>
        </div>
        <div className="absolute right-0 top-0 h-full w-1/3 bg-white/5 skew-x-12 transform translate-x-12" />
        <div className="absolute right-20 bottom-0 h-48 w-48 bg-white/10 rounded-full blur-3xl" />
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Orders"
          value={stats.orders}
          icon={ShoppingBag}
          color="blue"
          trend="+12% this week"
          loading={loading}
        />
        <StatCard
          title="Active Customers"
          value={stats.customers}
          icon={Users}
          color="indigo"
          trend="+5 new today"
          loading={loading}
        />
        <StatCard
          title="Needs Attention"
          value={stats.priority}
          icon={AlertCircle}
          color="red"
          trend={stats.priority > 0 ? "Delayed > 4 days" : "All good"}
          loading={loading}
        />
        <StatCard
          title="Revenue"
          value={stats.sales}
          icon={CreditCard}
          color="green"
          trend="+8% vs last year"
          loading={loading}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Recent Orders - Takes up 2 columns */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">Recent Orders</h2>
            <Link href="/admin/woo-orders" className="text-indigo-600 font-bold text-sm hover:underline flex items-center gap-1">
              View All <ArrowRight size={16} />
            </Link>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            {loading ? (
              <div className="divide-y divide-slate-50">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-full" />
                      <div className="space-y-2">
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-3 w-24" />
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-4 w-16" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {recentOrders.map((order: any) => {
                  const isPriority = isPriorityOrder(order.date_created, order.status);
                  return (
                    <div key={order.id} className={`p-4 flex items-center justify-between hover:bg-slate-50 transition-colors group ${isPriority ? 'bg-red-50/50 hover:bg-red-50' : ''}`}>
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${isPriority ? 'bg-red-100 text-red-600' : 'bg-blue-50 text-blue-600'}`}>
                          {order.billing.first_name[0]}
                        </div>
                        <div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            #{order.number} - {order.billing.first_name} {order.billing.last_name}
                            {isPriority && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-100 text-red-600 font-extrabold uppercase tracking-wide">
                                Overdue
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{format(new Date(order.date_created), "MMM dd, HH:mm")} • {order.line_items?.length || 0} items</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className={`px-2.5 py-1 rounded-full text-xs font-bold capitalize ${order.status === 'completed' ? 'bg-green-100 text-green-700' :
                          order.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                            'bg-slate-100 text-slate-600'
                          }`}>
                          {order.status}
                        </span>
                        <div className="font-bold text-slate-900 w-20 text-right">
                          {order.currency_symbol}{order.total}
                        </div>
                        <ChevronRight size={18} className="text-slate-300 group-hover:text-indigo-500 transition-colors" />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions - Takes up 1 column */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-slate-900">Quick Actions</h2>
          <div className="grid gap-4">
            <QuickAction
              title="Process Orders"
              desc="View and manage new incoming orders."
              icon={ShoppingBag}
              href="/admin/woo-orders"
              color="blue"
            />
            <QuickAction
              title="Manage Customers"
              desc="View customer details and history."
              icon={Users}
              href="/admin/customers"
              color="indigo"
            />
            <QuickAction
              title="Add Product"
              desc="Create a new product listing."
              icon={Package}
              href="/admin/products"
              color="orange"
            />
            <QuickAction
              title="View Reports"
              desc="Analyze sales and performance."
              icon={TrendingUp}
              href="#"
              color="green"
            />
          </div>

          {/* Mini Calendar or Tip */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white text-center mt-6">
            <Calendar className="mx-auto mb-3 text-indigo-400" size={32} />
            <h3 className="font-bold text-lg">Daily Tip</h3>
            <p className="text-slate-400 text-sm mt-1">
              Check pending orders before 2 PM to ensure same-day shipping.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
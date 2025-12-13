"use client";

import { useMemo } from 'react';
import {
    AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
    BarChart, Bar
} from 'recharts';
import { format, parseISO } from 'date-fns';
import clsx from 'clsx';
import { TrendingUp, TrendingDown } from 'lucide-react';

type ChartData = {
    date: string;
    total: number;
    orders: number;
};

interface RevenueChartProps {
    data: ChartData[];
    className?: string;
}

export function RevenueChart({ data, className }: RevenueChartProps) {
    // Memoize stats to avoid recalculating on render
    const stats = useMemo(() => {
        if (!data.length) return { growth: 0, total: 0 };
        const total = data.reduce((acc, curr) => acc + curr.total, 0);
        // Simple growth calc: compare first half vs second half for trend
        const mid = Math.floor(data.length / 2);
        const firstHalf = data.slice(0, mid).reduce((acc, curr) => acc + curr.total, 0);
        const secondHalf = data.slice(mid).reduce((acc, curr) => acc + curr.total, 0);
        const growth = firstHalf ? ((secondHalf - firstHalf) / firstHalf) * 100 : 0;
        return { growth, total };
    }, [data]);

    if (!data || data.length === 0) {
        return (
            <div className={clsx("bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center min-h-[300px]", className)}>
                <p className="text-slate-400 font-medium">No sales data available for charts.</p>
            </div>
        );
    }

    return (
        <div className={clsx("bg-white p-6 rounded-2xl border border-slate-200 shadow-sm", className)}>
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h3 className="text-lg font-bold text-slate-900">Revenue Trends</h3>
                    <p className="text-sm text-slate-500">Last 30 days performance</p>
                </div>
                <div className="text-right">
                    <p className="text-2xl font-extrabold text-slate-900">₹{stats.total.toLocaleString()}</p>
                    <div className={clsx("flex items-center justify-end gap-1 text-xs font-bold", stats.growth >= 0 ? "text-green-600" : "text-red-500")}>
                        {stats.growth >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                        <span>{Math.abs(stats.growth).toFixed(1)}% vs previous</span>
                    </div>
                </div>
            </div>

            <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#4F46E5" stopOpacity={0.2} />
                                <stop offset="95%" stopColor="#4F46E5" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis
                            dataKey="date"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            dy={10}
                        />
                        <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fill: '#94a3b8', fontSize: 12 }}
                            tickFormatter={(value) => `₹${value}`}
                        />
                        <Tooltip
                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                            cursor={{ stroke: '#4F46E5', strokeWidth: 1, strokeDasharray: '4 4' }}
                            formatter={(value: number) => [`₹${value.toLocaleString()}`, 'Revenue']}
                        />
                        <Area
                            type="monotone"
                            dataKey="total"
                            stroke="#4F46E5"
                            strokeWidth={3}
                            fillOpacity={1}
                            fill="url(#colorTotal)"
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

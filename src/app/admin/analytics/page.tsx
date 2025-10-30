"use client";
import { useEffect, useState } from "react";
import { getAdminStats, type AdminStats } from "@/lib/api";

export default function AnalyticsPage(){
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const s = await getAdminStats();
        setStats(s);
      } catch (err) {
        if (err instanceof Error) {
          setErr(err.message);
        } else {
          setErr("Failed to load stats");
        }
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin Dashboard</h1>
      {err && <div className="text-red-600">{err}</div>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="New Today" value={loading ? "…" : stats?.newToday ?? 0} />
        <StatCard title="Due Soon" value={loading ? "…" : stats?.dueSoon ?? 0} />
        <StatCard title="Missing PDFs" value={loading ? "…" : stats?.missingPdfs ?? 0} />
        <StatCard title="Total Orders" value={loading ? "…" : stats?.total ?? 0} />
      </div>

      <div className="card p-4">
        <h2 className="mb-3 text-lg font-medium">By Stage</h2>
        {loading ? (
          <div>Loading…</div>
        ) : (
          <ul className="space-y-1 text-sm">
            {Object.entries(stats?.byStage || {}).map(([stage, count]) => (
              <li key={stage} className="flex justify-between">
                <span>{stage}</span>
                <span className="font-semibold">{count}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatCard({ title, value }: { title: string; value: string | number }) {
  return (
    <div className="card p-4">
      <div className="text-slate-500 text-sm">{title}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
    </div>
  );
}

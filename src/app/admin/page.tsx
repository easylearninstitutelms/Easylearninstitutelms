"use client";

import { useState, useEffect } from "react";
import { formatCurrency } from "@/lib/utils";

interface AdminStats {
  totalInstitutes: number;
  statusCounts: Array<{ status: string; count: number }>;
  revenue: number;
  pendingPayments: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/stats").then(r => r.json()).then(d => {
      setStats(d);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>;

  const statusMap: Record<string, number> = {};
  stats?.statusCounts.forEach(s => { statusMap[s.status] = Number(s.count); });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">Platform Dashboard</h1>
        <p className="text-sm text-slate-500">Overview of all institutes on the platform</p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {[
          { label: "Total Institutes", value: stats?.totalInstitutes || 0, icon: "🏛️", color: "bg-blue-50" },
          { label: "Active", value: statusMap["ACTIVE"] || 0, icon: "✅", color: "bg-green-50" },
          { label: "Trial", value: statusMap["TRIAL"] || 0, icon: "⏳", color: "bg-yellow-50" },
          { label: "Suspended", value: statusMap["SUSPENDED"] || 0, icon: "🚫", color: "bg-red-50" },
        ].map(card => (
          <div key={card.label} className="stat-card">
            <div className={`w-10 h-10 ${card.color} rounded-xl flex items-center justify-center text-xl`}>
              {card.icon}
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-800">{card.value}</p>
              <p className="text-sm text-slate-500">{card.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="stat-card border-2 border-green-200">
          <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl">💵</div>
          <div>
            <p className="text-2xl font-bold text-green-700">{formatCurrency(stats?.revenue || 0)}</p>
            <p className="text-sm text-slate-500">Total Platform Revenue</p>
          </div>
        </div>
        <div className="stat-card border-2 border-orange-200">
          <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-xl">⏰</div>
          <div>
            <p className="text-2xl font-bold text-orange-700">{stats?.pendingPayments || 0}</p>
            <p className="text-sm text-slate-500">Pending Payment Reviews</p>
          </div>
        </div>
      </div>
    </div>
  );
}

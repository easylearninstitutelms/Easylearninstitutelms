"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { formatCurrency, formatDateTime, getInitials } from "@/lib/utils";

interface DashboardData {
  studentCount: number;
  staffCount: number;
  batchCount: number;
  attendance: { present: number; absent: number; late: number };
  todayCollection: number;
  monthlyCollection: number;
  totalDue: number;
  monthlyExpenses: number;
  profitLoss: number;
  recentPayments: Array<{
    id: string;
    amount: string;
    method: string;
    receiptNumber: string;
    paidAt: string;
    studentName: string;
    studentId: string;
  }>;
  recentAdmissions: Array<{
    id: string;
    name: string;
    studentId: string;
    admissionDate: string;
    phone: string;
  }>;
  subscription: {
    status: string;
    trialEnd: string;
  } | null;
}

function StatCard({
  label,
  value,
  icon,
  color,
  sub,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  sub?: string;
}) {
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
          {icon}
        </div>
        {sub && <span className="text-xs text-slate-400">{sub}</span>}
      </div>
      <div>
        <p className="text-2xl font-bold text-slate-800">{value}</p>
        <p className="text-sm text-slate-500">{label}</p>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then(setData)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-500">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-4">
        <p className="text-slate-500">Failed to load dashboard data.</p>
        <button onClick={() => window.location.reload()} className="btn btn-primary btn-sm">Retry</button>
      </div>
    );
  }

  const totalAttendance = data.attendance.present + data.attendance.absent + data.attendance.late;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-800">Dashboard</h1>
          <p className="text-sm text-slate-500">Welcome back! Here&apos;s your institute overview.</p>
        </div>
        {data.subscription && (
          <div className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${
            data.subscription.status === "ACTIVE" ? "bg-green-100 text-green-700" :
            data.subscription.status === "TRIAL" ? "bg-blue-100 text-blue-700" :
            "bg-red-100 text-red-700"
          }`}>
            {data.subscription.status}
            {data.subscription.status === "TRIAL" && data.subscription.trialEnd && (
              <span className="ml-1 opacity-75">
                (ends {new Date(data.subscription.trialEnd).toLocaleDateString()})
              </span>
            )}
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: "Add Student", href: "/dashboard/students", icon: "👨‍🎓", color: "bg-blue-50 text-blue-700 hover:bg-blue-100" },
          { label: "Take Attendance", href: "/dashboard/attendance", icon: "✅", color: "bg-green-50 text-green-700 hover:bg-green-100" },
          { label: "Collect Payment", href: "/dashboard/fees", icon: "💰", color: "bg-orange-50 text-orange-700 hover:bg-orange-100" },
          { label: "Add Enquiry", href: "/dashboard/enquiries", icon: "📋", color: "bg-purple-50 text-purple-700 hover:bg-purple-100" },
        ].map((action) => (
          <Link
            key={action.href}
            href={action.href}
            className={`flex flex-col items-center gap-2 p-4 rounded-2xl font-semibold text-sm transition-all ${action.color} border border-transparent hover:border-current/10`}
          >
            <span className="text-2xl">{action.icon}</span>
            <span>{action.label}</span>
          </Link>
        ))}
      </div>

      {/* Stats Row 1 - People */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <StatCard
          label="Active Students"
          value={data.studentCount}
          color="bg-blue-50"
          icon={<svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>}
        />
        <StatCard
          label="Active Staff"
          value={data.staffCount}
          color="bg-purple-50"
          icon={<svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>}
        />
        <StatCard
          label="Active Batches"
          value={data.batchCount}
          color="bg-indigo-50"
          icon={<svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>}
        />
        <StatCard
          label="Today Collection"
          value={formatCurrency(data.todayCollection)}
          color="bg-green-50"
          icon={<svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>}
        />
        <StatCard
          label="Total Due"
          value={formatCurrency(data.totalDue)}
          color="bg-red-50"
          icon={<svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>}
        />
        <StatCard
          label="Monthly P/L"
          value={formatCurrency(data.profitLoss)}
          color={data.profitLoss >= 0 ? "bg-emerald-50" : "bg-red-50"}
          icon={<svg className="w-5 h-5 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" /></svg>}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Attendance */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">Today&apos;s Attendance</h2>
            <Link href="/dashboard/attendance" className="text-xs text-blue-600 hover:underline">View All</Link>
          </div>
          {totalAttendance === 0 ? (
            <div className="text-center py-6 text-slate-400">
              <p className="text-sm">No attendance recorded today</p>
              <Link href="/dashboard/attendance" className="btn btn-primary btn-sm mt-3">Take Attendance</Link>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm text-slate-600">Present</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{data.attendance.present}</span>
                  <div className="w-24 bg-slate-100 rounded-full h-2">
                    <div className="bg-green-500 h-2 rounded-full" style={{ width: `${totalAttendance ? (data.attendance.present / totalAttendance) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-red-500" />
                  <span className="text-sm text-slate-600">Absent</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{data.attendance.absent}</span>
                  <div className="w-24 bg-slate-100 rounded-full h-2">
                    <div className="bg-red-500 h-2 rounded-full" style={{ width: `${totalAttendance ? (data.attendance.absent / totalAttendance) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-3 h-3 rounded-full bg-yellow-500" />
                  <span className="text-sm text-slate-600">Late</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-700">{data.attendance.late}</span>
                  <div className="w-24 bg-slate-100 rounded-full h-2">
                    <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${totalAttendance ? (data.attendance.late / totalAttendance) * 100 : 0}%` }} />
                  </div>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-slate-50">
                <div className="flex justify-between text-xs text-slate-500">
                  <span>Attendance Rate</span>
                  <span className="font-semibold text-green-600">
                    {totalAttendance ? Math.round((data.attendance.present / totalAttendance) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Financial Summary */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">This Month</h2>
            <Link href="/dashboard/reports" className="text-xs text-blue-600 hover:underline">Reports</Link>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-green-50 rounded-xl">
              <span className="text-sm text-green-700 font-medium">💰 Income</span>
              <span className="text-sm font-bold text-green-700">{formatCurrency(data.monthlyCollection)}</span>
            </div>
            <div className="flex justify-between items-center p-3 bg-red-50 rounded-xl">
              <span className="text-sm text-red-700 font-medium">📤 Expenses</span>
              <span className="text-sm font-bold text-red-700">{formatCurrency(data.monthlyExpenses)}</span>
            </div>
            <div className={`flex justify-between items-center p-3 rounded-xl ${data.profitLoss >= 0 ? "bg-emerald-50" : "bg-red-50"}`}>
              <span className={`text-sm font-bold ${data.profitLoss >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {data.profitLoss >= 0 ? "📈 Profit" : "📉 Loss"}
              </span>
              <span className={`text-sm font-bold ${data.profitLoss >= 0 ? "text-emerald-700" : "text-red-700"}`}>
                {formatCurrency(Math.abs(data.profitLoss))}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-orange-50 rounded-xl">
              <span className="text-sm text-orange-700 font-medium">⚠️ Total Due</span>
              <span className="text-sm font-bold text-orange-700">{formatCurrency(data.totalDue)}</span>
            </div>
          </div>
        </div>

        {/* Recent Payments */}
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-700">Recent Payments</h2>
            <Link href="/dashboard/fees" className="text-xs text-blue-600 hover:underline">View All</Link>
          </div>
          {data.recentPayments.length === 0 ? (
            <div className="text-center py-6 text-slate-400 text-sm">No payments yet</div>
          ) : (
            <div className="space-y-2">
              {data.recentPayments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center text-xs font-bold text-green-700">
                      {getInitials(p.studentName || "?")}
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-slate-700">{p.studentName}</p>
                      <p className="text-xs text-slate-400">{p.method} • {p.receiptNumber}</p>
                    </div>
                  </div>
                  <span className="text-sm font-bold text-green-600">{formatCurrency(p.amount)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent Admissions */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">Recent Admissions</h2>
          <Link href="/dashboard/students" className="text-xs text-blue-600 hover:underline">View All</Link>
        </div>
        {data.recentAdmissions.length === 0 ? (
          <div className="text-center py-6 text-slate-400">
            <p className="text-sm">No students yet</p>
            <Link href="/dashboard/students" className="btn btn-primary btn-sm mt-3">Add Student</Link>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Phone</th>
                  <th>Admission Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recentAdmissions.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                          {getInitials(s.name)}
                        </div>
                        <span className="font-medium text-slate-700">{s.name}</span>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{s.studentId}</span></td>
                    <td className="text-slate-500">{s.phone || "—"}</td>
                    <td className="text-slate-500">{s.admissionDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency } from "@/lib/utils";

interface ProfitLossData {
  month: string;
  income: number;
  expenses: number;
  salaries: number;
  otherExpenses: number;
  profitLoss: number;
  expenseBreakdown: Array<{ category: string; total: string }>;
}

export default function ReportsPage() {
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));

  const fetchData = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/reports/profit-loss?month=${selectedMonth}`);
    const d = await res.json();
    setData(d);
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-slate-500">Financial overview & analytics</p>
        </div>
        <input type="month" className="form-input w-auto" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : data && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <span className="text-xl">💰</span>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(data.income)}</p>
                <p className="text-sm text-slate-500">Total Income</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <span className="text-xl">📤</span>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(data.expenses)}</p>
                <p className="text-sm text-slate-500">Total Expenses</p>
              </div>
            </div>
            <div className="stat-card">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <span className="text-xl">👥</span>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{formatCurrency(data.salaries)}</p>
                <p className="text-sm text-slate-500">Salary Paid</p>
              </div>
            </div>
            <div className={`stat-card border-2 ${data.profitLoss >= 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}`}>
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <span className="text-xl">{data.profitLoss >= 0 ? "📈" : "📉"}</span>
              </div>
              <div>
                <p className={`text-xl font-bold ${data.profitLoss >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {formatCurrency(Math.abs(data.profitLoss))}
                </p>
                <p className="text-sm text-slate-500">{data.profitLoss >= 0 ? "Profit" : "Loss"}</p>
              </div>
            </div>
          </div>

          {/* P&L Statement */}
          <div className="card">
            <h2 className="font-bold text-slate-800 mb-4">Profit & Loss Statement — {selectedMonth}</h2>
            <div className="space-y-2">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="font-semibold text-slate-700">Income</span>
                <span className="font-bold text-green-600">{formatCurrency(data.income)}</span>
              </div>
              <div className="pl-4 space-y-1">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-600">Student Fees Collected</span>
                  <span className="text-sm font-medium text-slate-700">{formatCurrency(data.income)}</span>
                </div>
              </div>
              <div className="flex justify-between items-center py-3 border-b border-slate-100 mt-2">
                <span className="font-semibold text-slate-700">Expenses</span>
                <span className="font-bold text-red-600">{formatCurrency(data.expenses)}</span>
              </div>
              <div className="pl-4 space-y-1">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-600">Salaries</span>
                  <span className="text-sm font-medium text-slate-700">{formatCurrency(data.salaries)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-600">Other Expenses</span>
                  <span className="text-sm font-medium text-slate-700">{formatCurrency(data.otherExpenses)}</span>
                </div>
              </div>
              <div className={`flex justify-between items-center py-4 rounded-xl px-3 mt-2 ${data.profitLoss >= 0 ? "bg-green-50" : "bg-red-50"}`}>
                <span className="font-bold text-lg text-slate-700">{data.profitLoss >= 0 ? "Net Profit" : "Net Loss"}</span>
                <span className={`font-bold text-xl ${data.profitLoss >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {data.profitLoss >= 0 ? "+" : "-"}{formatCurrency(Math.abs(data.profitLoss))}
                </span>
              </div>
            </div>
          </div>

          {/* Expense Breakdown */}
          {data.expenseBreakdown.length > 0 && (
            <div className="card">
              <h2 className="font-bold text-slate-800 mb-4">Expense Breakdown</h2>
              <div className="space-y-3">
                {data.expenseBreakdown.map((exp) => {
                  const pct = data.otherExpenses > 0 ? (parseFloat(exp.total) / data.otherExpenses) * 100 : 0;
                  return (
                    <div key={exp.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-slate-600">{exp.category}</span>
                        <span className="font-semibold text-slate-700">{formatCurrency(exp.total)}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2">
                        <div className="bg-red-500 h-2 rounded-full transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Margin Ratio */}
          {data.income > 0 && (
            <div className="card">
              <h2 className="font-bold text-slate-800 mb-4">Financial Ratios</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {Math.round((data.income > 0 ? data.profitLoss / data.income : 0) * 100)}%
                  </p>
                  <p className="text-sm text-blue-600">Profit Margin</p>
                </div>
                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {Math.round((data.income > 0 ? data.expenses / data.income : 0) * 100)}%
                  </p>
                  <p className="text-sm text-red-600">Expense Ratio</p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {Math.round((data.income > 0 ? data.salaries / data.income : 0) * 100)}%
                  </p>
                  <p className="text-sm text-purple-600">Salary Ratio</p>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

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
  expenseBreakdown: Array<{
    category: string;
    total: string;
  }>;

  feeSummary?: {
    grossBilled: number;
    discount: number;
    netBilled: number;
    dueAmount: number;
    feeCount: number;
  };
}

function getLocalDateString(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalMonthString(date = new Date()) {
  return getLocalDateString(date).slice(0, 7);
}

function safeNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export default function ReportsPage() {
  const [data, setData] = useState<ProfitLossData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] =
    useState(getLocalMonthString());

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const res = await fetch(
        `/api/reports/profit-loss?month=${selectedMonth}`,
        {
          cache: "no-store",
        }
      );

      let result: ProfitLossData & { error?: string };

      try {
        result = await res.json();
      } catch {
        throw new Error("Invalid response from reports server.");
      }

      if (!res.ok) {
        throw new Error(result.error || "Failed to load financial report.");
      }

      setData(result);
    } catch (err) {
      setData(null);
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load financial report."
      );
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const income = safeNumber(data?.income);
  const expenses = safeNumber(data?.expenses);
  const salaries = safeNumber(data?.salaries);
  const otherExpenses = safeNumber(data?.otherExpenses);
  const profitLoss = safeNumber(data?.profitLoss);

  const feeSummary = data?.feeSummary;

  const grossBilled = safeNumber(feeSummary?.grossBilled);
  const discount = safeNumber(feeSummary?.discount);
  const netBilled = safeNumber(feeSummary?.netBilled);
  const dueAmount = safeNumber(feeSummary?.dueAmount);
  const feeCount = safeNumber(feeSummary?.feeCount);

  const profitMargin =
    income > 0 ? (profitLoss / income) * 100 : 0;

  const expenseRatio =
    income > 0 ? (expenses / income) * 100 : 0;

  const salaryRatio =
    income > 0 ? (salaries / income) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Reports</h1>
          <p className="text-sm text-slate-500">
            Financial overview and analytics
          </p>
        </div>

        <input
          type="month"
          className="form-input w-auto"
          value={selectedMonth}
          onChange={(e) => setSelectedMonth(e.target.value)}
        />
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 rounded-xl text-sm">
          <p className="font-semibold mb-1">
            Unable to load report
          </p>
          <p>{error}</p>

          <button
            type="button"
            onClick={fetchData}
            className="btn btn-outline btn-sm mt-3"
          >
            Try Again
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : data ? (
        <>
          {/* Fee Summary */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="font-bold text-slate-800">
                  Fee Summary
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Fees billed and outstanding for {selectedMonth}
                </p>
              </div>

              <span className="badge badge-blue">
                {feeCount} Fee Records
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                <p className="text-xs text-blue-600 mb-1">
                  Gross Billed
                </p>
                <p className="text-lg font-bold text-blue-800">
                  {formatCurrency(grossBilled)}
                </p>
              </div>

              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 mb-1">
                  Discount
                </p>
                <p className="text-lg font-bold text-amber-800">
                  {formatCurrency(discount)}
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-xs text-green-600 mb-1">
                  Net Billed
                </p>
                <p className="text-lg font-bold text-green-800">
                  {formatCurrency(netBilled)}
                </p>
              </div>

              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-xs text-red-600 mb-1">
                  Due Amount
                </p>
                <p className="text-lg font-bold text-red-800">
                  {formatCurrency(dueAmount)}
                </p>
              </div>
            </div>
          </div>

          {/* Main Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="stat-card">
              <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-green-600">
                  +
                </span>
              </div>

              <div>
                <p className="text-xl font-bold text-slate-800">
                  {formatCurrency(income)}
                </p>

                <p className="text-sm text-slate-500">
                  Income Collected
                </p>
              </div>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-red-600">
                  -
                </span>
              </div>

              <div>
                <p className="text-xl font-bold text-slate-800">
                  {formatCurrency(expenses)}
                </p>

                <p className="text-sm text-slate-500">
                  Total Expenses
                </p>
              </div>
            </div>

            <div className="stat-card">
              <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center">
                <span className="text-xl font-bold text-purple-600">
                  S
                </span>
              </div>

              <div>
                <p className="text-xl font-bold text-slate-800">
                  {formatCurrency(salaries)}
                </p>

                <p className="text-sm text-slate-500">
                  Salary Paid
                </p>
              </div>
            </div>

            <div
              className={`stat-card border-2 ${
                profitLoss >= 0
                  ? "border-green-200 bg-green-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center">
                <span
                  className={`text-xl font-bold ${
                    profitLoss >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {profitLoss >= 0 ? "+" : "-"}
                </span>
              </div>

              <div>
                <p
                  className={`text-xl font-bold ${
                    profitLoss >= 0
                      ? "text-green-700"
                      : "text-red-700"
                  }`}
                >
                  {formatCurrency(Math.abs(profitLoss))}
                </p>

                <p className="text-sm text-slate-500">
                  {profitLoss >= 0 ? "Profit" : "Loss"}
                </p>
              </div>
            </div>
          </div>

          {/* Profit & Loss Statement */}
          <div className="card">
            <h2 className="font-bold text-slate-800 mb-4">
              Profit &amp; Loss Statement — {selectedMonth}
            </h2>

            <div className="space-y-2">
              <div className="flex justify-between items-center py-3 border-b border-slate-100">
                <span className="font-semibold text-slate-700">
                  Income
                </span>

                <span className="font-bold text-green-600">
                  {formatCurrency(income)}
                </span>
              </div>

              <div className="pl-4 space-y-1">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-600">
                    Student Fees Collected
                  </span>

                  <span className="text-sm font-medium text-slate-700">
                    {formatCurrency(income)}
                  </span>
                </div>
              </div>

              <div className="flex justify-between items-center py-3 border-b border-slate-100 mt-2">
                <span className="font-semibold text-slate-700">
                  Expenses
                </span>

                <span className="font-bold text-red-600">
                  {formatCurrency(expenses)}
                </span>
              </div>

              <div className="pl-4 space-y-1">
                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-600">
                    Salaries
                  </span>

                  <span className="text-sm font-medium text-slate-700">
                    {formatCurrency(salaries)}
                  </span>
                </div>

                <div className="flex justify-between items-center py-1">
                  <span className="text-sm text-slate-600">
                    Other Expenses
                  </span>

                  <span className="text-sm font-medium text-slate-700">
                    {formatCurrency(otherExpenses)}
                  </span>
                </div>
              </div>

              <div
                className={`flex justify-between items-center py-4 rounded-xl px-3 mt-2 ${
                  profitLoss >= 0
                    ? "bg-green-50"
                    : "bg-red-50"
                }`}
              >
                <span className="font-bold text-lg text-slate-700">
                  {profitLoss >= 0 ? "Net Profit" : "Net Loss"}
                </span>

                <span
                  className={`font-bold text-xl ${
                    profitLoss >= 0
                      ? "text-green-600"
                      : "text-red-600"
                  }`}
                >
                  {profitLoss >= 0 ? "+" : "-"}
                  {formatCurrency(Math.abs(profitLoss))}
                </span>
              </div>
            </div>
          </div>

          {/* Billing vs Collection */}
          <div className="card">
            <h2 className="font-bold text-slate-800 mb-4">
              Billing &amp; Collection
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-sm text-slate-500">
                  Net Fees Billed
                </p>

                <p className="text-xl font-bold text-slate-800 mt-1">
                  {formatCurrency(netBilled)}
                </p>
              </div>

              <div className="p-4 bg-green-50 rounded-xl">
                <p className="text-sm text-green-600">
                  Collected
                </p>

                <p className="text-xl font-bold text-green-700 mt-1">
                  {formatCurrency(income)}
                </p>
              </div>

              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-sm text-red-600">
                  Outstanding Due
                </p>

                <p className="text-xl font-bold text-red-700 mt-1">
                  {formatCurrency(dueAmount)}
                </p>
              </div>
            </div>

            {netBilled > 0 && (
              <div className="mt-5">
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-500">
                    Collection against billed fees
                  </span>

                  <span className="font-semibold text-slate-700">
                    {Math.round(
                      Math.min(
                        100,
                        Math.max(0, (income / netBilled) * 100)
                      )
                    )}
                    %
                  </span>
                </div>

                <div className="w-full bg-slate-100 rounded-full h-2">
                  <div
                    className="bg-green-500 h-2 rounded-full transition-all"
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(0, (income / netBilled) * 100)
                      )}%`,
                    }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Expense Breakdown */}
          {data.expenseBreakdown &&
            data.expenseBreakdown.length > 0 && (
              <div className="card">
                <h2 className="font-bold text-slate-800 mb-4">
                  Other Expense Breakdown
                </h2>

                <div className="space-y-3">
                  {data.expenseBreakdown.map((expense) => {
                    const amount = safeNumber(expense.total);

                    const percentage =
                      otherExpenses > 0
                        ? (amount / otherExpenses) * 100
                        : 0;

                    return (
                      <div key={expense.category}>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-slate-600">
                            {expense.category}
                          </span>

                          <span className="font-semibold text-slate-700">
                            {formatCurrency(amount)}
                          </span>
                        </div>

                        <div className="w-full bg-slate-100 rounded-full h-2">
                          <div
                            className="bg-red-500 h-2 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                Math.max(0, percentage)
                              )}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

          {/* Financial Ratios */}
          {income > 0 && (
            <div className="card">
              <h2 className="font-bold text-slate-800 mb-4">
                Financial Ratios
              </h2>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {Math.round(profitMargin)}%
                  </p>

                  <p className="text-sm text-blue-600">
                    Profit Margin
                  </p>
                </div>

                <div className="p-4 bg-red-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-red-700">
                    {Math.round(expenseRatio)}%
                  </p>

                  <p className="text-sm text-red-600">
                    Expense Ratio
                  </p>
                </div>

                <div className="p-4 bg-purple-50 rounded-xl text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {Math.round(salaryRatio)}%
                  </p>

                  <p className="text-sm text-purple-600">
                    Salary Ratio
                  </p>
                </div>
              </div>
            </div>
          )}
        </>
      ) : !error ? (
        <div className="card text-center py-12">
          <p className="text-slate-500">
            No financial report available for {selectedMonth}.
          </p>
        </div>
      ) : null}
    </div>
  );
}
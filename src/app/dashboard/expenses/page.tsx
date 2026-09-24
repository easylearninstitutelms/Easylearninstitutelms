"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Expense {
  id: string;
  category: string;
  amount: string;
  method: string;
  description: string;
  expenseDate: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  RENT: "🏠", ELECTRICITY: "⚡", INTERNET: "🌐", SALARY: "👥",
  MARKETING: "📢", STATIONERY: "📝", EQUIPMENT: "🔧", OTHER: "💼",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    category: "RENT", amount: "", method: "CASH", description: "",
    expenseDate: new Date().toISOString().split("T")[0],
  });

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/expenses?month=${selectedMonth}`);
    const data = await res.json();
    setExpenses(data.expenses || []);
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchExpenses(); }, [fetchExpenses]);

  function openAddModal() {
    setEditingExpense(null);
    setError("");
    setForm({
      category: "RENT",
      amount: "",
      method: "CASH",
      description: "",
      expenseDate: new Date().toISOString().split("T")[0],
    });
    setShowModal(true);
  }

  function openEditModal(expense: Expense) {
    setEditingExpense(expense);
    setError("");
    setForm({
      category: expense.category,
      amount: expense.amount,
      method: expense.method,
      description: expense.description || "",
      expenseDate: expense.expenseDate,
    });
    setShowModal(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/expenses", {
        method: editingExpense ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to add expense.");
        return;
      }

      setShowModal(false);
      setEditingExpense(null);
      setForm({
        category: "RENT",
        amount: "",
        method: "CASH",
        description: "",
        expenseDate: new Date().toISOString().split("T")[0],
      });
      await fetchExpenses();
    } catch {
      setError("Unable to add expense right now. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(expense: Expense) {
    const confirmed = window.confirm(
      `Delete this ${expense.category} expense of ${formatCurrency(expense.amount)}? This action cannot be undone.`,
    );

    if (!confirmed) return;

    setDeletingId(expense.id);
    setError("");

    try {
      const res = await fetch("/api/expenses", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: expense.id }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setError(data.error || "Failed to delete expense.");
        return;
      }

      await fetchExpenses();
    } catch {
      setError("Unable to delete expense right now. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || "0"), 0);

  const byCategory: Record<string, number> = {};
  expenses.forEach(e => {
    byCategory[e.category] = (byCategory[e.category] || 0) + parseFloat(e.amount || "0");
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Expenses</h1>
          <p className="text-sm text-slate-500">Total: <span className="font-semibold text-red-600">{formatCurrency(totalExpenses)}</span></p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="month" className="form-input w-auto" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          <button onClick={openAddModal} className="btn btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Add Expense
          </button>
        </div>
      </div>

      {/* Category Summary */}
      {Object.keys(byCategory).length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {Object.entries(byCategory).map(([cat, amt]) => (
            <div key={cat} className="card p-4">
              <span className="text-2xl">{CATEGORY_ICONS[cat] || "💼"}</span>
              <p className="text-xs text-slate-500 mt-1">{cat}</p>
              <p className="font-bold text-slate-800">{formatCurrency(amt)}</p>
            </div>
          ))}
        </div>
      )}

      <div className="card p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💸</div>
            <p className="text-slate-500">No expenses for {selectedMonth}</p>
            <button onClick={openAddModal} className="btn btn-primary btn-sm mt-4">Add Expense</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Description</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map(e => (
                  <tr key={e.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <span>{CATEGORY_ICONS[e.category] || "💼"}</span>
                        <span className="font-medium text-slate-700">{e.category}</span>
                      </div>
                    </td>
                    <td className="text-slate-500">{e.description || "—"}</td>
                    <td className="font-bold text-red-600">{formatCurrency(e.amount)}</td>
                    <td><span className="badge badge-blue">{e.method}</span></td>
                    <td className="text-slate-500">{formatDate(e.expenseDate)}</td>
                    <td>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(e)}
                          disabled={deletingId === e.id}
                          className="btn btn-outline btn-sm"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(e)}
                          disabled={deletingId === e.id}
                          className="btn btn-outline btn-sm text-red-600"
                        >
                          {deletingId === e.id ? "Deleting..." : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={2} className="font-bold text-slate-700 px-4 py-3">Total</td>
                  <td className="font-bold text-red-600 px-4 py-3">{formatCurrency(totalExpenses)}</td>
                  <td colSpan={3} />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">{editingExpense ? "Edit Expense" : "Add Expense"}</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Category *</label>
                    <select className="form-select" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      {["RENT","ELECTRICITY","INTERNET","SALARY","MARKETING","STATIONERY","EQUIPMENT","OTHER"].map(c => (
                        <option key={c} value={c}>{CATEGORY_ICONS[c]} {c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Amount (৳) *</label>
                    <input type="number" className="form-input" placeholder="0" value={form.amount} onChange={e => setForm({...form, amount: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label">Payment Method</label>
                    <select className="form-select" value={form.method} onChange={e => setForm({...form, method: e.target.value})}>
                      <option value="CASH">Cash</option>
                      <option value="BKASH">bKash</option>
                      <option value="NAGAD">Nagad</option>
                      <option value="ROCKET">Rocket</option>
                      <option value="BANK">Bank</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Date *</label>
                    <input type="date" className="form-input" value={form.expenseDate} onChange={e => setForm({...form, expenseDate: e.target.value})} required />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Description</label>
                    <input className="form-input" placeholder="Details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => { setShowModal(false); setEditingExpense(null); setError(""); }} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? (editingExpense ? "Saving..." : "Adding...") : (editingExpense ? "Save Changes" : "Add Expense")}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

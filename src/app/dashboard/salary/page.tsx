"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface SalaryRow {
  salary: { id: string; month: string; basic: string; bonus: string; deduction: string; payable: string; paid: string; due: string; paymentDate: string; method: string };
  staffName: string;
  designation: string;
}

interface StaffMember { id: string; name: string; designation: string; salary: string }

export default function SalaryPage() {
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [form, setForm] = useState({
    staffId: "", month: new Date().toISOString().slice(0, 7),
    basic: "", bonus: "0", deduction: "0",
    paymentDate: new Date().toISOString().split("T")[0], method: "CASH",
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [salRes, staffRes] = await Promise.all([
      fetch(`/api/salaries?month=${selectedMonth}`),
      fetch("/api/staff?status=ACTIVE"),
    ]);
    const salData = await salRes.json();
    const staffData = await staffRes.json();
    setSalaries(salData.salaries || []);
    setStaffList(staffData.staff || []);
    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function handleStaffSelect(staffId: string) {
    const s = staffList.find(s => s.id === staffId);
    setForm({ ...form, staffId, basic: s?.salary || "" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/salaries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowModal(false);
    fetchData();
  }

  const totalPayable = salaries.reduce((sum, r) => sum + parseFloat(r.salary.payable || "0"), 0);
  const totalPaid = salaries.reduce((sum, r) => sum + parseFloat(r.salary.paid || "0"), 0);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary</h1>
          <p className="text-sm text-slate-500">Total Payable: {formatCurrency(totalPayable)} · Paid: {formatCurrency(totalPaid)}</p>
        </div>
        <div className="flex gap-2 items-center">
          <input type="month" className="form-input w-auto" value={selectedMonth} onChange={e => setSelectedMonth(e.target.value)} />
          <button onClick={() => setShowModal(true)} className="btn btn-primary">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            Pay Salary
          </button>
        </div>
      </div>

      <div className="card p-0">
        {loading ? (
          <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
        ) : salaries.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">💼</div>
            <p className="text-slate-500">No salary records for {selectedMonth}</p>
            <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm mt-4">Pay Salary</button>
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Month</th>
                  <th>Basic</th>
                  <th>Bonus</th>
                  <th>Deduction</th>
                  <th>Payable</th>
                  <th>Paid</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {salaries.map(row => (
                  <tr key={row.salary.id}>
                    <td>
                      <div>
                        <p className="font-medium text-slate-700">{row.staffName}</p>
                        <p className="text-xs text-slate-400">{row.designation}</p>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{row.salary.month}</span></td>
                    <td>{formatCurrency(row.salary.basic)}</td>
                    <td className="text-green-600">{formatCurrency(row.salary.bonus)}</td>
                    <td className="text-red-600">{formatCurrency(row.salary.deduction)}</td>
                    <td className="font-bold text-slate-700">{formatCurrency(row.salary.payable)}</td>
                    <td className="font-bold text-green-600">{formatCurrency(row.salary.paid)}</td>
                    <td><span className="badge badge-gray">{row.salary.method || "—"}</span></td>
                    <td className="text-slate-500">{formatDate(row.salary.paymentDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Pay Salary</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="form-label">Staff Member *</label>
                    <select className="form-select" value={form.staffId} onChange={e => handleStaffSelect(e.target.value)} required>
                      <option value="">Select staff</option>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.name} ({s.designation})</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Month *</label>
                    <input type="month" className="form-input" value={form.month} onChange={e => setForm({...form, month: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label">Basic Salary (৳) *</label>
                    <input type="number" className="form-input" placeholder="0" value={form.basic} onChange={e => setForm({...form, basic: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label">Bonus (৳)</label>
                    <input type="number" className="form-input" placeholder="0" value={form.bonus} onChange={e => setForm({...form, bonus: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Deduction (৳)</label>
                    <input type="number" className="form-input" placeholder="0" value={form.deduction} onChange={e => setForm({...form, deduction: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Payment Date</label>
                    <input type="date" className="form-input" value={form.paymentDate} onChange={e => setForm({...form, paymentDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Method</label>
                    <select className="form-select" value={form.method} onChange={e => setForm({...form, method: e.target.value})}>
                      <option value="CASH">Cash</option>
                      <option value="BKASH">bKash</option>
                      <option value="NAGAD">Nagad</option>
                      <option value="BANK">Bank</option>
                    </select>
                  </div>
                </div>
                {form.basic && (
                  <div className="p-3 bg-blue-50 rounded-xl text-sm text-blue-700 mt-2">
                    <strong>Payable:</strong> {formatCurrency(
                      (parseFloat(form.basic || "0") + parseFloat(form.bonus || "0") - parseFloat(form.deduction || "0")).toString()
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Processing..." : "Process Salary"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

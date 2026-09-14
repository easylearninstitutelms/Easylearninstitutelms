"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDate, getStatusColor, getInitials } from "@/lib/utils";

interface FeeRow {
  fee: { id: string; feeType: string; amount: string; discount: string; dueAmount: string; dueDate: string; status: string; createdAt: string };
  studentName: string;
  studentCode: string;
}

interface PaymentRow {
  payment: { id: string; amount: string; method: string; receiptNumber: string; paidAt: string; transactionReference: string };
  studentName: string;
  studentCode: string;
}

interface Student { id: string; name: string; studentId: string }

export default function FeesPage() {
  const [activeTab, setActiveTab] = useState<"fees" | "payments" | "collect">("fees");
  const [fees, setFees] = useState<FeeRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentFees, setStudentFees] = useState<FeeRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showFeeModal, setShowFeeModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [receipt, setReceipt] = useState<{ receiptNumber: string; amount: string; method: string; studentName: string } | null>(null);

  const [feeForm, setFeeForm] = useState({ studentId: "", feeType: "MONTHLY", amount: "", discount: "", dueDate: "" });
  const [payForm, setPayForm] = useState({ studentId: "", feeId: "", amount: "", method: "CASH", transactionReference: "" });

  const fetchData = useCallback(async () => {
    setLoading(true);
    const [feesRes, paymentsRes, studentsRes] = await Promise.all([
      fetch("/api/fees"),
      fetch("/api/payments"),
      fetch("/api/students?status=ACTIVE&limit=100"),
    ]);
    const feesData = await feesRes.json();
    const paymentsData = await paymentsRes.json();
    const studentsData = await studentsRes.json();
    setFees(feesData.fees || []);
    setPayments(paymentsData.payments || []);
    setStudents(studentsData.students || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  async function loadStudentFees(studentId: string) {
    if (!studentId) { setStudentFees([]); return; }
    const res = await fetch(`/api/fees?studentId=${studentId}`);
    const data = await res.json();
    setStudentFees(data.fees || []);
    const due = data.fees?.find((f: FeeRow) => f.fee.status === "DUE" || f.fee.status === "PARTIAL");
    if (due) setPayForm(prev => ({ ...prev, feeId: due.fee.id, amount: due.fee.dueAmount }));
  }

  async function handleAddFee(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/fees", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(feeForm),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowFeeModal(false);
    setFeeForm({ studentId: "", feeType: "MONTHLY", amount: "", discount: "", dueDate: "" });
    fetchData();
  }

  async function handleCollect(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/payments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payForm),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    const studentName = students.find(s => s.id === payForm.studentId)?.name || "Student";
    setReceipt({ receiptNumber: data.receiptNumber, amount: payForm.amount, method: payForm.method, studentName });
    setPayForm({ studentId: "", feeId: "", amount: "", method: "CASH", transactionReference: "" });
    setStudentFees([]);
    fetchData();
  }

  const totalDue = fees.filter(f => f.fee.status === "DUE" || f.fee.status === "PARTIAL").reduce((sum, f) => sum + parseFloat(f.fee.dueAmount || "0"), 0);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Fees & Payments</h1>
          <p className="text-sm text-slate-500">Total due: <span className="font-semibold text-red-600">{formatCurrency(totalDue)}</span></p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowFeeModal(true)} className="btn btn-outline">Add Fee</button>
          <button onClick={() => setActiveTab("collect")} className="btn btn-accent">Collect Payment</button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-1">
        {([
          { key: "fees", label: "Fee Records" },
          { key: "payments", label: "Payment History" },
          { key: "collect", label: "Collect Payment" },
        ] as const).map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2.5 text-sm font-semibold transition-all ${activeTab === tab.key ? "text-blue-600 border-b-2 border-blue-600" : "text-slate-500 hover:text-slate-700"}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Receipt Banner */}
      {receipt && (
        <div className="card border-2 border-green-300 bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-700 font-bold text-lg">✅ Payment Received!</p>
              <p className="text-green-600 text-sm">Receipt: <strong>{receipt.receiptNumber}</strong> · {receipt.studentName} · {formatCurrency(receipt.amount)} via {receipt.method}</p>
            </div>
            <button onClick={() => setReceipt(null)} className="text-green-600 hover:text-green-800">✕</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : activeTab === "fees" ? (
        <div className="card p-0">
          <div className="table-wrapper">
            {fees.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No fee records yet</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Discount</th>
                    <th>Due</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {fees.map(row => (
                    <tr key={row.fee.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                            {getInitials(row.studentName || "?")}
                          </div>
                          <div>
                            <p className="font-medium text-slate-700">{row.studentName}</p>
                            <p className="text-xs text-slate-400">{row.studentCode}</p>
                          </div>
                        </div>
                      </td>
                      <td><span className="badge badge-blue">{row.fee.feeType}</span></td>
                      <td className="font-medium">{formatCurrency(row.fee.amount)}</td>
                      <td className="text-slate-500">{formatCurrency(row.fee.discount)}</td>
                      <td className={`font-semibold ${parseFloat(row.fee.dueAmount) > 0 ? "text-red-600" : "text-green-600"}`}>
                        {formatCurrency(row.fee.dueAmount)}
                      </td>
                      <td className="text-slate-500">{formatDate(row.fee.dueDate)}</td>
                      <td><span className={`badge ${getStatusColor(row.fee.status)}`}>{row.fee.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : activeTab === "payments" ? (
        <div className="card p-0">
          <div className="table-wrapper">
            {payments.length === 0 ? (
              <div className="text-center py-12 text-slate-400">No payments yet</div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Student</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {payments.map(row => (
                    <tr key={row.payment.id}>
                      <td><span className="badge badge-green font-mono">{row.payment.receiptNumber}</span></td>
                      <td>
                        <div>
                          <p className="font-medium text-slate-700">{row.studentName}</p>
                          <p className="text-xs text-slate-400">{row.studentCode}</p>
                        </div>
                      </td>
                      <td className="font-bold text-green-600">{formatCurrency(row.payment.amount)}</td>
                      <td><span className="badge badge-blue">{row.payment.method}</span></td>
                      <td className="text-slate-500 font-mono text-xs">{row.payment.transactionReference || "—"}</td>
                      <td className="text-slate-500">{formatDate(row.payment.paidAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        /* Collect Payment Form */
        <div className="max-w-lg">
          <div className="card">
            <h2 className="font-bold text-slate-800 mb-4">Collect Payment</h2>
            {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm mb-4">{error}</div>}
            <form onSubmit={handleCollect} className="space-y-4">
              <div>
                <label className="form-label">Select Student *</label>
                <select className="form-select" value={payForm.studentId}
                  onChange={e => { setPayForm({...payForm, studentId: e.target.value, feeId: "", amount: ""}); loadStudentFees(e.target.value); }}
                  required>
                  <option value="">Search student...</option>
                  {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>)}
                </select>
              </div>

              {studentFees.length > 0 && (
                <div>
                  <label className="form-label">Fee Record (optional)</label>
                  <select className="form-select" value={payForm.feeId}
                    onChange={e => {
                      const fee = studentFees.find(f => f.fee.id === e.target.value);
                      setPayForm({...payForm, feeId: e.target.value, amount: fee?.fee.dueAmount || ""});
                    }}>
                    <option value="">General payment</option>
                    {studentFees.map(f => (
                      <option key={f.fee.id} value={f.fee.id}>
                        {f.fee.feeType} — Due: {formatCurrency(f.fee.dueAmount)} ({f.fee.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="form-label">Amount (৳) *</label>
                <input type="number" className="form-input" placeholder="0.00" value={payForm.amount} onChange={e => setPayForm({...payForm, amount: e.target.value})} required />
              </div>
              <div>
                <label className="form-label">Payment Method *</label>
                <select className="form-select" value={payForm.method} onChange={e => setPayForm({...payForm, method: e.target.value})}>
                  <option value="CASH">Cash</option>
                  <option value="BKASH">bKash</option>
                  <option value="NAGAD">Nagad</option>
                  <option value="ROCKET">Rocket</option>
                  <option value="BANK">Bank</option>
                </select>
              </div>
              {payForm.method !== "CASH" && (
                <div>
                  <label className="form-label">Transaction Reference</label>
                  <input className="form-input" placeholder="Transaction ID / Number" value={payForm.transactionReference} onChange={e => setPayForm({...payForm, transactionReference: e.target.value})} />
                </div>
              )}
              <button type="submit" disabled={submitting} className="btn btn-accent w-full justify-center py-3">
                {submitting ? "Processing..." : "Collect Payment & Generate Receipt"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Add Fee Modal */}
      {showFeeModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowFeeModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Add Fee Record</h2>
              <button onClick={() => setShowFeeModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleAddFee}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div>
                  <label className="form-label">Student *</label>
                  <select className="form-select" value={feeForm.studentId} onChange={e => setFeeForm({...feeForm, studentId: e.target.value})} required>
                    <option value="">Select student</option>
                    {students.map(s => <option key={s.id} value={s.id}>{s.name} ({s.studentId})</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Fee Type *</label>
                    <select className="form-select" value={feeForm.feeType} onChange={e => setFeeForm({...feeForm, feeType: e.target.value})}>
                      <option value="MONTHLY">Monthly</option>
                      <option value="ADMISSION">Admission</option>
                      <option value="COURSE">Course</option>
                      <option value="EXAM">Exam</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Amount (৳) *</label>
                    <input type="number" className="form-input" placeholder="0" value={feeForm.amount} onChange={e => setFeeForm({...feeForm, amount: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label">Discount (৳)</label>
                    <input type="number" className="form-input" placeholder="0" value={feeForm.discount} onChange={e => setFeeForm({...feeForm, discount: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Due Date</label>
                    <input type="date" className="form-input" value={feeForm.dueDate} onChange={e => setFeeForm({...feeForm, dueDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowFeeModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Adding..." : "Add Fee"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

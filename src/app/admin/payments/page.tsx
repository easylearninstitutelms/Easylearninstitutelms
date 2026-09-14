"use client";

import { useState, useEffect, useCallback } from "react";
import { formatCurrency, formatDateTime } from "@/lib/utils";

interface PaymentRow {
  payment: {
    id: string; amount: string; method: string; transactionReference: string;
    status: string; createdAt: string; rejectionReason: string;
  };
  instituteName: string;
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [filter, setFilter] = useState("PENDING");
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejectingId, setRejectingId] = useState<string | null>(null);

  const fetchPayments = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/subscription-payments");
    const data = await res.json();
    setPayments(data.payments || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchPayments(); }, [fetchPayments]);

  async function handleAction(id: string, action: string, reason?: string) {
    setProcessing(id);
    await fetch(`/api/admin/subscription-payments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, rejectionReason: reason }),
    });
    setProcessing(null);
    setRejectingId(null);
    setRejectionReason("");
    fetchPayments();
  }

  const STATUS_COLORS: Record<string, string> = {
    PENDING: "badge-yellow", APPROVED: "badge-green", REJECTED: "badge-red",
  };

  const filtered = filter === "ALL" ? payments : payments.filter(p => p.payment.status === filter);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Subscription Payments</h1>
          <p className="text-sm text-slate-500">Review and approve institute payments</p>
        </div>
      </div>

      <div className="flex gap-2">
        {["ALL", "PENDING", "APPROVED", "REJECTED"].map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              filter === s ? "bg-orange-500 text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : filtered.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">💳</div>
          <p className="text-slate-500">No {filter.toLowerCase()} payments</p>
        </div>
      ) : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Institute</th>
                  <th>Amount</th>
                  <th>Method</th>
                  <th>Reference</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(row => (
                  <tr key={row.payment.id}>
                    <td className="font-medium text-slate-700">{row.instituteName}</td>
                    <td className="font-bold text-slate-700">{formatCurrency(row.payment.amount)}</td>
                    <td><span className="badge badge-blue">{row.payment.method}</span></td>
                    <td className="font-mono text-xs text-slate-500">{row.payment.transactionReference || "—"}</td>
                    <td><span className={`badge ${STATUS_COLORS[row.payment.status] || "badge-gray"}`}>{row.payment.status}</span></td>
                    <td className="text-slate-500 text-xs">{formatDateTime(row.payment.createdAt)}</td>
                    <td>
                      {row.payment.status === "PENDING" && (
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleAction(row.payment.id, "APPROVE")}
                            disabled={processing === row.payment.id}
                            className="btn btn-sm bg-green-100 text-green-700 hover:bg-green-200"
                          >
                            ✓ Approve
                          </button>
                          <button
                            onClick={() => setRejectingId(row.payment.id)}
                            className="btn btn-sm bg-red-100 text-red-700 hover:bg-red-200"
                          >
                            ✕ Reject
                          </button>
                        </div>
                      )}
                      {row.payment.status === "REJECTED" && row.payment.rejectionReason && (
                        <span className="text-xs text-red-500 italic">{row.payment.rejectionReason}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Rejection Modal */}
      {rejectingId && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title">Reject Payment</h2>
              <button onClick={() => setRejectingId(null)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <div className="modal-body">
              <label className="form-label">Rejection Reason</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Reason for rejection..."
                value={rejectionReason}
                onChange={e => setRejectionReason(e.target.value)}
              />
            </div>
            <div className="modal-footer">
              <button onClick={() => setRejectingId(null)} className="btn btn-outline">Cancel</button>
              <button
                onClick={() => handleAction(rejectingId!, "REJECT", rejectionReason)}
                className="btn btn-danger"
              >
                Confirm Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

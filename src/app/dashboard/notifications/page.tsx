"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  FEE_DUE: "💰", PAYMENT_RECEIVED: "✅", ATTENDANCE: "📋",
  HOMEWORK: "📝", ASSIGNMENT: "📌", EXAM: "📄", RESULT: "🏆",
  ROUTINE_UPDATE: "📅", ANNOUNCEMENT: "📢", TRIAL_ENDING: "⚠️",
  SUBSCRIPTION_EXPIRY: "🔔", GENERAL: "ℹ️",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ title: "", body: "", type: "ANNOUNCEMENT" });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/notifications");
    const data = await res.json();
    setNotifications(data.notifications || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    await fetch("/api/notifications", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSubmitting(false);
    setShowModal(false);
    setForm({ title: "", body: "", type: "ANNOUNCEMENT" });
    fetchNotifications();
  }

  const unreadCount = notifications.filter(n => !n.readAt).length;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-sm text-slate-500">{unreadCount} unread</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Send Notice
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-slate-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map(n => (
            <div
              key={n.id}
              className={`card hover:shadow-md transition-shadow ${!n.readAt ? "border-l-4 border-l-blue-500" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {TYPE_ICONS[n.type] || "ℹ️"}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      {n.body && <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>}
                    </div>
                    {!n.readAt && (
                      <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0 mt-1.5" />
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="badge badge-blue">{n.type.replace("_", " ")}</span>
                    <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Send Notice</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                <div>
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="Notice title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                </div>
                <div>
                  <label className="form-label">Type</label>
                  <select className="form-select" value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="FEE_DUE">Fee Due</option>
                    <option value="EXAM">Exam</option>
                    <option value="ROUTINE_UPDATE">Routine Update</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>
                <div>
                  <label className="form-label">Message</label>
                  <textarea className="form-input" rows={4} placeholder="Notice content..." value={form.body} onChange={e => setForm({...form, body: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Sending..." : "Send Notice"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

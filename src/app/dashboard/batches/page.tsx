"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatusColor, formatCurrency, formatDate } from "@/lib/utils";

interface BatchRow {
  batch: {
    id: string;
    name: string;
    room: string;
    startDate: string;
    endDate: string;
    fee: string;
    status: string;
  };
  courseName: string;
  teacherName: string;
  studentCount: number;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({
    name: "", courseId: "", teacherId: "", room: "",
    startDate: "", endDate: "", fee: "",
  });

  const fetchBatches = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/batches");
    const data = await res.json();
    setBatches(data.batches || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchBatches(); }, [fetchBatches]);

  useEffect(() => {
    fetch("/api/courses").then(r => r.json()).then(d => setCourses(d.courses?.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) || []));
    fetch("/api/staff").then(r => r.json()).then(d => setStaffList(d.staff?.map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })) || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/batches", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowModal(false);
    setForm({ name: "", courseId: "", teacherId: "", room: "", startDate: "", endDate: "", fee: "" });
    fetchBatches();
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this batch?")) return;
    await fetch(`/api/batches/${id}`, { method: "DELETE" });
    fetchBatches();
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Batches</h1>
          <p className="text-sm text-slate-500">{batches.length} batches</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Batch
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {batches.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-3">🏫</div>
              <p className="text-slate-500">No batches yet</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm mt-4">Create Batch</button>
            </div>
          ) : batches.map(row => (
            <div key={row.batch.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">{row.batch.name}</h3>
                  <p className="text-sm text-blue-600">{row.courseName || "No course"}</p>
                </div>
                <span className={`badge ${getStatusColor(row.batch.status)}`}>{row.batch.status}</span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Teacher</span>
                  <span className="font-medium text-slate-700">{row.teacherName || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Room</span>
                  <span className="text-slate-700">{row.batch.room || "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Students</span>
                  <span className="font-semibold text-blue-600">{row.studentCount || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fee/Month</span>
                  <span className="font-semibold text-slate-700">{row.batch.fee ? formatCurrency(row.batch.fee) : "—"}</span>
                </div>
                {row.batch.startDate && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Period</span>
                    <span className="text-slate-600 text-xs">{formatDate(row.batch.startDate)} – {formatDate(row.batch.endDate)}</span>
                  </div>
                )}
              </div>
              {row.batch.status !== "ARCHIVED" && (
                <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                  <button onClick={() => handleArchive(row.batch.id)} className="text-xs text-red-500 hover:text-red-700 transition">Archive</button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Add Batch</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="form-label">Batch Name *</label>
                    <input className="form-input" placeholder="e.g. SSC Batch A-2024" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label">Course</label>
                    <select className="form-select" value={form.courseId} onChange={e => setForm({...form, courseId: e.target.value})}>
                      <option value="">Select course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Teacher</label>
                    <select className="form-select" value={form.teacherId} onChange={e => setForm({...form, teacherId: e.target.value})}>
                      <option value="">Select teacher</option>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Room</label>
                    <input className="form-input" placeholder="Room 101" value={form.room} onChange={e => setForm({...form, room: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Monthly Fee (৳)</label>
                    <input type="number" className="form-input" placeholder="0" value={form.fee} onChange={e => setForm({...form, fee: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" value={form.startDate} onChange={e => setForm({...form, startDate: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-input" value={form.endDate} onChange={e => setForm({...form, endDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Creating..." : "Create Batch"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

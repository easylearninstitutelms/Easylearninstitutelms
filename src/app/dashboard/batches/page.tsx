"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatusColor, formatCurrency, formatDate } from "@/lib/utils";

interface BatchRow {
  batch: { id: string; name: string; room: string | null; startDate: string | null; endDate: string | null; fee: string | null; status: string };
  courseName?: string | null;
  teacherName?: string | null;
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
  const [form, setForm] = useState({ name: "", courseId: "", teacherId: "", room: "", startDate: "", endDate: "", fee: "" });

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/batches", { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to load batches");
      const data = await res.json();
      setBatches(data.batches || []);
    } catch (err) {
      console.error(err);
      setBatches([]);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void fetchBatches(); }, [fetchBatches]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [coursesRes, staffRes] = await Promise.all([fetch("/api/courses"), fetch("/api/staff")]);
        const coursesData = await coursesRes.json();
        const staffData = await staffRes.json();
        setCourses((coursesData.courses || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        setStaffList((staffData.staff || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      } catch (err) { console.error("Failed to load batch options:", err); }
    }
    void loadOptions();
  }, []);

  function resetForm() {
    setForm({ name: "", courseId: "", teacherId: "", room: "", startDate: "", endDate: "", fee: "" });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault(); setSubmitting(true); setError("");
    try {
      const res = await fetch("/api/batches", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await res.json();
      if (!res.ok) { setError(data.error || "Failed to create batch."); return; }
      setShowModal(false); resetForm(); await fetchBatches();
    } catch (err) { console.error(err); setError("Something went wrong. Please try again."); }
    finally { setSubmitting(false); }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this batch?")) return;
    try { await fetch(`/api/batches/${id}`, { method: "DELETE" }); await fetchBatches(); } catch (err) { console.error(err); }
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Batches</h1>
          <p className="text-sm text-slate-500">{batches.length} batches</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Batch
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <div className="mb-3 text-4xl">🏫</div><p className="text-slate-500">No batches yet</p>
              <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary btn-sm mt-4">Create Batch</button>
            </div>
          ) : batches.map((row) => (
            <div key={row.batch.id} className="card transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-start justify-between">
                <div className="min-w-0">
                  <h3 className="truncate font-bold text-slate-800">{row.batch.name}</h3>
                  {row.courseName ? <p className="mt-0.5 truncate text-sm font-semibold text-blue-600">{row.courseName}</p> : <p className="mt-0.5 text-sm text-slate-400">No course</p>}
                </div>
                <span className={`badge ml-2 flex-shrink-0 ${getStatusColor(row.batch.status)}`}>{row.batch.status}</span>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Teacher</span><span className="font-medium text-slate-700">{row.teacherName || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Room</span><span className="text-slate-700">{row.batch.room || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Students</span><span className="font-semibold text-blue-600">{row.studentCount || 0}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Fee/Month</span><span className="font-semibold text-slate-700">{row.batch.fee ? formatCurrency(row.batch.fee) : "—"}</span></div>
                {row.batch.startDate && <div className="flex justify-between gap-3"><span className="text-slate-500">Period</span><span className="text-right text-xs text-slate-600">{formatDate(row.batch.startDate)} – {row.batch.endDate ? formatDate(row.batch.endDate) : "—"}</span></div>}
              </div>

              {row.batch.status !== "ARCHIVED" && <div className="mt-3 flex justify-end border-t border-slate-100 pt-3"><button onClick={() => handleArchive(row.batch.id)} className="text-xs text-red-500 transition hover:text-red-700">Archive</button></div>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setShowModal(false); }}>
          <div className="modal-box">
            <div className="modal-header">
              <div><h2 className="modal-title">Add Batch</h2><p className="mt-0.5 text-xs text-slate-400">Create a batch independently from Programme and Semester</p></div>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2"><label className="form-label">Batch Name *</label><input className="form-input" placeholder="e.g. CSE Morning Batch A" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></div>
                  <div><label className="form-label">Course</label><select className="form-select" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}><option value="">Select course</option>{courses.map((course) => <option key={course.id} value={course.id}>{course.name}</option>)}</select></div>
                  <div><label className="form-label">Teacher</label><select className="form-select" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}><option value="">Select teacher</option>{staffList.map((staff) => <option key={staff.id} value={staff.id}>{staff.name}</option>)}</select></div>
                  <div><label className="form-label">Room</label><input className="form-input" placeholder="Room 101" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} /></div>
                  <div><label className="form-label">Monthly Fee (৳)</label><input type="number" min="0" step="0.01" className="form-input" placeholder="0" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} /></div>
                  <div><label className="form-label">Start Date</label><input type="date" className="form-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></div>
                  <div><label className="form-label">End Date</label><input type="date" className="form-input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
                </div>
              </div>
              <div className="modal-footer"><button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button><button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Creating..." : "Create Batch"}</button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

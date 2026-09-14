"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";

interface HwRow {
  homework: { id: string; title: string; description: string; deadline: string; createdAt: string };
  batchName: string;
  teacherName: string;
}

export default function HomeworkPage() {
  const [hwList, setHwList] = useState<HwRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState<Array<{ batch: { id: string; name: string } }>>([]);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ batchId: "", teacherId: "", title: "", description: "", deadline: "" });

  const fetchHw = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/homework");
    const data = await res.json();
    setHwList(data.homework || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchHw(); }, [fetchHw]);
  useEffect(() => {
    fetch("/api/batches").then(r => r.json()).then(d => setBatches(d.batches || []));
    fetch("/api/staff").then(r => r.json()).then(d => setStaffList(d.staff || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/homework", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowModal(false);
    setForm({ batchId: "", teacherId: "", title: "", description: "", deadline: "" });
    fetchHw();
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Homework</h1>
          <p className="text-sm text-slate-500">{hwList.length} assignments</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Assign Homework
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hwList.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-3">📝</div>
              <p className="text-slate-500">No homework assigned yet</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm mt-4">Assign Homework</button>
            </div>
          ) : hwList.map(row => (
            <div key={row.homework.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📝</div>
                <div>
                  <h3 className="font-bold text-slate-800">{row.homework.title}</h3>
                  <p className="text-xs text-blue-600">{row.batchName}</p>
                </div>
              </div>
              {row.homework.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{row.homework.description}</p>}
              <div className="flex items-center justify-between text-xs text-slate-400">
                <span>👩‍🏫 {row.teacherName || "—"}</span>
                {row.homework.deadline && (
                  <span className={`font-medium ${new Date(row.homework.deadline) < new Date() ? "text-red-500" : "text-orange-500"}`}>
                    📅 {formatDate(row.homework.deadline)}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Assign Homework</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div>
                  <label className="form-label">Title *</label>
                  <input className="form-input" placeholder="Homework title" value={form.title} onChange={e => setForm({...form, title: e.target.value})} required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Batch *</label>
                    <select className="form-select" value={form.batchId} onChange={e => setForm({...form, batchId: e.target.value})} required>
                      <option value="">Select batch</option>
                      {batches.map(b => <option key={b.batch.id} value={b.batch.id}>{b.batch.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Teacher</label>
                    <select className="form-select" value={form.teacherId} onChange={e => setForm({...form, teacherId: e.target.value})}>
                      <option value="">Select teacher</option>
                      {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} placeholder="Homework details..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div>
                  <label className="form-label">Deadline</label>
                  <input type="date" className="form-input" value={form.deadline} onChange={e => setForm({...form, deadline: e.target.value})} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Assigning..." : "Assign Homework"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

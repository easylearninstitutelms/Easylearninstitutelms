"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDate } from "@/lib/utils";

interface ExamRow {
  exam: { id: string; name: string; examDate: string; createdAt: string };
  batchName: string;
}

export default function ExamsPage() {
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState<Array<{ batch: { id: string; name: string } }>>([]);
  const [form, setForm] = useState({ batchId: "", name: "", examDate: "", subjects: [{ subjectName: "", totalMarks: 100 }] });

  const fetchExams = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/exams");
    const data = await res.json();
    setExams(data.exams || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchExams(); }, [fetchExams]);
  useEffect(() => {
    fetch("/api/batches").then(r => r.json()).then(d => setBatches(d.batches || []));
  }, []);

  function addSubject() {
    setForm(prev => ({ ...prev, subjects: [...prev.subjects, { subjectName: "", totalMarks: 100 }] }));
  }

  function updateSubject(idx: number, field: string, value: string | number) {
    setForm(prev => ({
      ...prev,
      subjects: prev.subjects.map((s, i) => i === idx ? { ...s, [field]: value } : s),
    }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/exams", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowModal(false);
    setForm({ batchId: "", name: "", examDate: "", subjects: [{ subjectName: "", totalMarks: 100 }] });
    fetchExams();
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Exams & Results</h1>
          <p className="text-sm text-slate-500">{exams.length} exams</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Create Exam
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {exams.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-3">📄</div>
              <p className="text-slate-500">No exams yet</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm mt-4">Create Exam</button>
            </div>
          ) : exams.map(row => (
            <div key={row.exam.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">📄</div>
                <div>
                  <h3 className="font-bold text-slate-800">{row.exam.name}</h3>
                  <p className="text-xs text-blue-600">{row.batchName}</p>
                </div>
              </div>
              <div className="flex justify-between text-sm text-slate-500">
                <span>Exam Date</span>
                <span className="font-medium text-slate-700">{row.exam.examDate ? formatDate(row.exam.examDate) : "TBD"}</span>
              </div>
              <div className="flex justify-between text-xs text-slate-400 mt-1">
                <span>Created</span>
                <span>{formatDate(row.exam.createdAt)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Create Exam</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div>
                  <label className="form-label">Exam Name *</label>
                  <input className="form-input" placeholder="e.g. Mid-term Exam 2024" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
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
                    <label className="form-label">Exam Date</label>
                    <input type="date" className="form-input" value={form.examDate} onChange={e => setForm({...form, examDate: e.target.value})} />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="form-label mb-0">Subjects</label>
                    <button type="button" onClick={addSubject} className="btn btn-outline btn-sm">+ Add Subject</button>
                  </div>
                  <div className="space-y-2">
                    {form.subjects.map((subj, idx) => (
                      <div key={idx} className="flex gap-2">
                        <input
                          className="form-input flex-1"
                          placeholder="Subject name"
                          value={subj.subjectName}
                          onChange={e => updateSubject(idx, "subjectName", e.target.value)}
                        />
                        <input
                          type="number"
                          className="form-input w-24"
                          placeholder="Marks"
                          value={subj.totalMarks}
                          onChange={e => updateSubject(idx, "totalMarks", parseInt(e.target.value))}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Creating..." : "Create Exam"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatusColor, formatCurrency } from "@/lib/utils";

interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  fee: string;
  status: string;
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", description: "", duration: "", fee: "" });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/courses");
    const data = await res.json();
    setCourses(data.courses || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/courses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowModal(false);
    setForm({ name: "", description: "", duration: "", fee: "" });
    fetchCourses();
  }

  async function toggleStatus(id: string, status: string) {
    await fetch(`/api/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    fetchCourses();
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="text-sm text-slate-500">{courses.length} courses</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Course
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {courses.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-3">📚</div>
              <p className="text-slate-500">No courses yet</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm mt-4">Create Course</button>
            </div>
          ) : courses.map(c => (
            <div key={c.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl">📚</div>
                <span className={`badge ${getStatusColor(c.status)}`}>{c.status}</span>
              </div>
              <h3 className="font-bold text-slate-800 mb-1">{c.name}</h3>
              {c.description && <p className="text-sm text-slate-500 mb-3 line-clamp-2">{c.description}</p>}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Duration: <span className="font-medium text-slate-700">{c.duration || "—"}</span></span>
                <span className="font-bold text-blue-600">{c.fee ? formatCurrency(c.fee) : "Free"}</span>
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex justify-end">
                <button
                  onClick={() => toggleStatus(c.id, c.status)}
                  className={`btn btn-sm ${c.status === "ACTIVE" ? "btn-outline text-red-500" : "btn-outline text-green-600"}`}
                >
                  {c.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Add Course</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div>
                  <label className="form-label">Course Name *</label>
                  <input className="form-input" placeholder="e.g. SSC Preparation" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                </div>
                <div>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} placeholder="Course description..." value={form.description} onChange={e => setForm({...form, description: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Duration</label>
                    <input className="form-input" placeholder="e.g. 12 months" value={form.duration} onChange={e => setForm({...form, duration: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Fee (৳)</label>
                    <input type="number" className="form-input" placeholder="0" value={form.fee} onChange={e => setForm({...form, fee: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Creating..." : "Create Course"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatusColor, formatCurrency } from "@/lib/utils";

interface ClassDraft {
  classNo: number;
  title: string;
  description: string;
  scheduledDate: string;
  startTime: string;
  endTime: string;
}

interface Course {
  id: string;
  name: string;
  description: string;
  duration: string;
  fee: string;
  status: string;
  classCount?: number;
}

function newClass(classNo: number): ClassDraft {
  return { classNo, title: "", description: "", scheduledDate: "", startTime: "", endTime: "" };
}

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState<ClassDraft[]>(Array.from({ length: 10 }, (_, i) => newClass(i + 1)));
  const [form, setForm] = useState({ name: "", description: "", duration: "", fee: "" });

  const fetchCourses = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/courses", { cache: "no-store" });
    const data = await res.json();
    setCourses(data.courses || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchCourses(); }, [fetchCourses]);

  function openAdd() {
    setForm({ name: "", description: "", duration: "", fee: "" });
    setClasses(Array.from({ length: 10 }, (_, i) => newClass(i + 1)));
    setError("");
    setShowModal(true);
  }

  function updateClass(index: number, patch: Partial<ClassDraft>) {
    setClasses(prev => prev.map((item, i) => i === index ? { ...item, ...patch } : item));
  }

  function addClass() {
    setClasses(prev => [...prev, newClass(prev.length + 1)]);
  }

  function removeClass(index: number) {
    setClasses(prev => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, classNo: i + 1 })));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/courses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          classes: classes.filter(c => c.title.trim()).map(c => ({
            ...c,
            title: c.title.trim(),
            description: c.description.trim() || null,
            scheduledDate: c.scheduledDate || null,
            startTime: c.startTime || null,
            endTime: c.endTime || null,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create course");
        return;
      }

      setShowModal(false);
      await fetchCourses();
    } catch (e) {
      console.error(e);
      setError("Failed to create course");
    } finally {
      setSubmitting(false);
    }
  }

  async function toggleStatus(id: string, status: string) {
    await fetch(`/api/courses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: status === "ACTIVE" ? "INACTIVE" : "ACTIVE" }),
    });
    fetchCourses();
  }

  const filledClasses = classes.filter(c => c.title.trim()).length;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Courses</h1>
          <p className="text-sm text-slate-500">{courses.length} courses</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">
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
              <button onClick={openAdd} className="btn btn-primary btn-sm mt-4">Create Course</button>
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
              <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3">
                <span className="text-xs font-semibold text-teal-700">{c.classCount || 0} Classes</span>
                <button onClick={() => toggleStatus(c.id, c.status)} className={`btn btn-sm ${c.status === "ACTIVE" ? "btn-outline text-red-500" : "btn-outline text-green-600"}`}>
                  {c.status === "ACTIVE" ? "Deactivate" : "Activate"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && !submitting && setShowModal(false)}>
          <div className="modal-box max-w-5xl max-h-[94vh] overflow-y-auto">
            <div className="modal-header sticky top-0 z-10 bg-white">
              <div>
                <h2 className="modal-title">Add Course</h2>
                <p className="text-xs text-slate-400">Course create করার সময়ই class / syllabus যোগ করুন।</p>
              </div>
              <button onClick={() => !submitting && setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}

                <div>
                  <label className="form-label">Course Name *</label>
                  <input className="form-input" placeholder="e.g. SSC Preparation" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
                </div>

                <div>
                  <label className="form-label">Description</label>
                  <textarea className="form-input" rows={3} placeholder="Course description..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Duration</label>
                    <input className="form-input" placeholder="e.g. 12 months" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Fee (৳)</label>
                    <input type="number" className="form-input" placeholder="0" value={form.fee} onChange={e => setForm({ ...form, fee: e.target.value })} />
                  </div>
                </div>

                <div className="mt-2 rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
                  <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h3 className="font-bold text-slate-900">Course Syllabus / Classes</h3>
                      <p className="text-xs text-slate-500">{filledClasses} class titles added · blank rows will be skipped</p>
                    </div>
                    <button type="button" onClick={addClass} className="btn btn-outline btn-sm text-teal-700">+ Add Class</button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {classes.map((c, index) => (
                      <div key={index} className="rounded-xl border border-slate-200 bg-white p-3">
                        <div className="grid grid-cols-1 gap-3 lg:grid-cols-[70px_1fr_170px_115px_115px_auto]">
                          <div><label className="form-label">Class</label><div className="rounded-xl border bg-slate-50 px-3 py-2.5 text-sm font-black text-teal-700">{c.classNo}</div></div>
                          <div><label className="form-label">Class Title</label><input className="form-input" placeholder="Class title / topic" value={c.title} onChange={e => updateClass(index, { title: e.target.value })} /></div>
                          <div><label className="form-label">Date</label><input type="date" className="form-input" value={c.scheduledDate} onChange={e => updateClass(index, { scheduledDate: e.target.value })} /></div>
                          <div><label className="form-label">Start</label><input type="time" className="form-input" value={c.startTime} onChange={e => updateClass(index, { startTime: e.target.value })} /></div>
                          <div><label className="form-label">End</label><input type="time" className="form-input" value={c.endTime} onChange={e => updateClass(index, { endTime: e.target.value })} /></div>
                          <div className="flex items-end"><button type="button" onClick={() => removeClass(index)} className="btn btn-ghost btn-sm text-red-600">Remove</button></div>
                        </div>
                        <div className="mt-2"><label className="form-label">Class Description / Notes</label><input className="form-input" placeholder="Optional topics, tools, notes..." value={c.description} onChange={e => updateClass(index, { description: e.target.value })} /></div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="modal-footer sticky bottom-0 bg-white">
                <button type="button" onClick={() => !submitting && setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Creating..." : `Create Course + ${filledClasses} Classes`}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

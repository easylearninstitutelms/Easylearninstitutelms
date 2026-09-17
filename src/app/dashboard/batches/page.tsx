"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatusColor, formatCurrency, formatDate } from "@/lib/utils";

type Programme = {
  id: string;
  programmeNo: number | null;
  name: string;
  code: string | null;
  semesters: Array<{ id: string; semesterNo: number; name: string }>;
};

type BatchRow = {
  id: string;
  name: string;
  room: string | null;
  startDate: string | null;
  endDate: string | null;
  fee: string | null;
  status: string;
  batchNo: number | null;
  programmeId: string | null;
  semesterId: string | null;
  programmeName: string | null;
  programmeCode: string | null;
  programmeNo: number | null;
  semesterName: string | null;
  semesterNo: number | null;
  courseName: string | null;
  teacherName: string | null;
  studentCount: number;
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [staffList, setStaffList] = useState<Array<{ id: string; name: string }>>([]);
  const [nextBatchNo, setNextBatchNo] = useState(211);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ batchNo: "211", name: "", programmeId: "", semesterId: "", courseId: "", teacherId: "", room: "", startDate: "", endDate: "", fee: "" });

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/batches", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load batches");
      setBatches(data.batches || []);
      const next = Number(data.nextBatchNo) || 211;
      setNextBatchNo(next);
      setForm((current) => ({ ...current, batchNo: current.name ? current.batchNo : String(next) }));
    } catch (err) {
      console.error(err);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void fetchBatches(); }, [fetchBatches]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [programmeRes, coursesRes, staffRes] = await Promise.all([
          fetch("/api/programmes", { cache: "no-store" }),
          fetch("/api/courses", { cache: "no-store" }),
          fetch("/api/staff", { cache: "no-store" }),
        ]);
        const programmeData = await programmeRes.json();
        const coursesData = await coursesRes.json();
        const staffData = await staffRes.json();
        setProgrammes(programmeData.programmes || []);
        setCourses((coursesData.courses || []).map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })));
        setStaffList((staffData.staff || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
      } catch (err) {
        console.error("Failed to load batch options:", err);
      }
    }
    void loadOptions();
  }, []);

  function resetForm() {
    setForm({ batchNo: String(nextBatchNo), name: "", programmeId: "", semesterId: "", courseId: "", teacherId: "", room: "", startDate: "", endDate: "", fee: "" });
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/batches", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create batch.");
        return;
      }
      setShowModal(false);
      resetForm();
      await fetchBatches();
    } catch (err) {
      console.error(err);
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this batch?")) return;
    try {
      await fetch(`/api/batches/${id}`, { method: "DELETE" });
      await fetchBatches();
    } catch (err) {
      console.error(err);
    }
  }

  const selectedProgramme = programmes.find((p) => p.id === form.programmeId);

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Batches</h1>
          <p className="text-sm text-slate-500">Batch numbering starts from 211</p>
        </div>
        <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary">+ Add Batch</button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div>
      ) : batches.length === 0 ? (
        <div className="card py-12 text-center">
          <div className="mb-3 text-4xl">🏫</div>
          <p className="text-slate-500">No batches yet</p>
          <button onClick={() => { resetForm(); setShowModal(true); }} className="btn btn-primary btn-sm mt-4">Create Batch</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((row) => (
            <div key={row.id} className="card transition-shadow hover:shadow-md">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">#{row.batchNo || "—"}</span>
                    <span className={`badge ${getStatusColor(row.status)}`}>{row.status}</span>
                  </div>
                  <h3 className="mt-2 truncate font-bold text-slate-800">{row.name}</h3>
                  <p className="mt-0.5 truncate text-sm font-semibold text-teal-700">{row.programmeCode || "Programme"} · {row.programmeName || "—"}</p>
                </div>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-3"><span className="text-slate-500">Programme No</span><span className="font-semibold text-slate-700">{row.programmeNo || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Semester</span><span className="text-slate-700">{row.semesterName || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Course</span><span className="text-slate-700">{row.courseName || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Teacher</span><span className="text-slate-700">{row.teacherName || "—"}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Students</span><span className="font-semibold text-blue-600">{row.studentCount || 0}</span></div>
                <div className="flex justify-between gap-3"><span className="text-slate-500">Fee/Month</span><span className="font-semibold text-slate-700">{row.fee ? formatCurrency(row.fee) : "—"}</span></div>
              </div>

              {row.status !== "ARCHIVED" && <div className="mt-3 flex justify-end border-t border-slate-100 pt-3"><button onClick={() => handleArchive(row.id)} className="text-xs text-red-500 transition hover:text-red-700">Archive</button></div>}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget && !submitting) setShowModal(false); }}>
          <div className="modal-box max-w-2xl">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Add Batch</h2>
                <p className="mt-0.5 text-xs text-slate-400">Next available batch number: {nextBatchNo}</p>
              </div>
              <button onClick={() => !submitting && setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Batch No *</label>
                    <input type="number" min="211" className="form-input font-bold" value={form.batchNo} onChange={(e) => setForm({ ...form, batchNo: e.target.value })} required />
                  </div>
                  <div>
                    <label className="form-label">Batch Name *</label>
                    <input className="form-input" placeholder="Morning Batch" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Programme *</label>
                    <select className="form-select" value={form.programmeId} onChange={(e) => setForm({ ...form, programmeId: e.target.value, semesterId: "" })} required>
                      <option value="">Select programme</option>
                      {programmes.map((p) => <option key={p.id} value={p.id}>{p.programmeNo ? `${p.programmeNo} · ` : ""}{p.code || "CODE"} · {p.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Semester</label>
                    <select className="form-select" value={form.semesterId} onChange={(e) => setForm({ ...form, semesterId: e.target.value })} disabled={!selectedProgramme}>
                      <option value="">Select semester</option>
                      {(selectedProgramme?.semesters || []).map((s) => <option key={s.id} value={s.id}>{s.semesterNo} · {s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Course</label>
                    <select className="form-select" value={form.courseId} onChange={(e) => setForm({ ...form, courseId: e.target.value })}>
                      <option value="">Select course</option>
                      {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Teacher</label>
                    <select className="form-select" value={form.teacherId} onChange={(e) => setForm({ ...form, teacherId: e.target.value })}>
                      <option value="">Select teacher</option>
                      {staffList.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Room</label>
                    <input className="form-input" placeholder="Room 101" value={form.room} onChange={(e) => setForm({ ...form, room: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Monthly Fee</label>
                    <input type="number" min="0" step="0.01" className="form-input" placeholder="0" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">Start Date</label>
                    <input type="date" className="form-input" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                  </div>
                  <div>
                    <label className="form-label">End Date</label>
                    <input type="date" className="form-input" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => !submitting && setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Creating..." : "Create Batch"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

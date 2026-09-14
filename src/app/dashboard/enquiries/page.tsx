"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatusColor, formatDate } from "@/lib/utils";

interface EnquiryRow {
  enquiry: { id: string; name: string; phone: string; source: string; notes: string; followUpDate: string; status: string; createdAt: string };
  courseName: string;
}

const STATUS_OPTIONS = ["ALL", "NEW", "CONTACTED", "INTERESTED", "ADMITTED", "NOT_INTERESTED", "LOST"];
const STATUS_COLORS: Record<string, string> = {
  NEW: "bg-blue-100 text-blue-700", CONTACTED: "bg-purple-100 text-purple-700",
  INTERESTED: "bg-orange-100 text-orange-700", ADMITTED: "bg-green-100 text-green-700",
  NOT_INTERESTED: "bg-slate-100 text-slate-600", LOST: "bg-red-100 text-red-700",
};

export default function EnquiriesPage() {
  const [enquiries, setEnquiries] = useState<EnquiryRow[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [courses, setCourses] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ name: "", phone: "", courseId: "", source: "", notes: "", followUpDate: "" });

  const fetchEnquiries = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/enquiries?status=${statusFilter}`);
    const data = await res.json();
    setEnquiries(data.enquiries || []);
    setLoading(false);
  }, [statusFilter]);

  useEffect(() => { fetchEnquiries(); }, [fetchEnquiries]);
  useEffect(() => {
    fetch("/api/courses").then(r => r.json()).then(d => setCourses(d.courses?.map((c: { id: string; name: string }) => ({ id: c.id, name: c.name })) || []));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    const res = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowModal(false);
    setForm({ name: "", phone: "", courseId: "", source: "", notes: "", followUpDate: "" });
    fetchEnquiries();
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/enquiries/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchEnquiries();
  }

  const counts: Record<string, number> = {};
  // Count by status from all enquiries fetched
  enquiries.forEach(e => {
    counts[e.enquiry.status] = (counts[e.enquiry.status] || 0) + 1;
  });

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Enquiries</h1>
          <p className="text-sm text-slate-500">{enquiries.length} enquiries</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Enquiry
        </button>
      </div>

      {/* Status filter */}
      <div className="flex flex-wrap gap-2">
        {STATUS_OPTIONS.map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
              statusFilter === s ? "bg-blue-600 text-white shadow-sm" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {s === "ALL" ? "All" : s.replace("_", " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {enquiries.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-3">📋</div>
              <p className="text-slate-500">No enquiries found</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm mt-4">Add Enquiry</button>
            </div>
          ) : enquiries.map(row => (
            <div key={row.enquiry.id} className="card hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-bold text-slate-800">{row.enquiry.name}</h3>
                  <p className="text-sm text-slate-500">{row.enquiry.phone || "—"}</p>
                </div>
                <select
                  value={row.enquiry.status}
                  onChange={e => handleStatusChange(row.enquiry.id, e.target.value)}
                  className={`text-xs font-semibold px-2 py-1 rounded-lg border-0 cursor-pointer ${STATUS_COLORS[row.enquiry.status] || "bg-slate-100 text-slate-600"}`}
                >
                  {STATUS_OPTIONS.filter(s => s !== "ALL").map(s => (
                    <option key={s} value={s}>{s.replace("_", " ")}</option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5 text-sm">
                {row.courseName && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">Course:</span> {row.courseName}
                  </div>
                )}
                {row.enquiry.source && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <span className="text-slate-400">Source:</span> {row.enquiry.source}
                  </div>
                )}
                {row.enquiry.notes && (
                  <p className="text-slate-500 italic text-xs line-clamp-2">{row.enquiry.notes}</p>
                )}
                {row.enquiry.followUpDate && (
                  <div className="flex items-center gap-1 text-xs text-orange-600 font-medium">
                    📅 Follow up: {formatDate(row.enquiry.followUpDate)}
                  </div>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-3">{formatDate(row.enquiry.createdAt)}</p>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Add Enquiry</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="form-label">Name *</label>
                    <input className="form-input" placeholder="Enquiry name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input className="form-input" placeholder="01XXXXXXXXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Interested Course</label>
                    <select className="form-select" value={form.courseId} onChange={e => setForm({...form, courseId: e.target.value})}>
                      <option value="">Select course</option>
                      {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Source</label>
                    <input className="form-input" placeholder="Facebook, Walk-in..." value={form.source} onChange={e => setForm({...form, source: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Notes</label>
                    <textarea className="form-input" rows={2} placeholder="Additional notes..." value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Follow-up Date</label>
                    <input type="date" className="form-input" value={form.followUpDate} onChange={e => setForm({...form, followUpDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Adding..." : "Add Enquiry"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

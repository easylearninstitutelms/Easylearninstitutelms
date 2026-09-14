"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatusColor, getInitials, formatCurrency, formatDate } from "@/lib/utils";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  designation: string;
  joiningDate: string;
  salary: string;
  status: string;
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", phone: "", email: "", designation: "",
    joiningDate: new Date().toISOString().split("T")[0], salary: "", address: "",
  });

  const fetchStaff = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ search });
    const res = await fetch(`/api/staff?${params}`);
    const data = await res.json();
    setStaffList(data.staff || []);
    setLoading(false);
  }, [search]);

  useEffect(() => { fetchStaff(); }, [fetchStaff]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const res = await fetch("/api/staff", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const data = await res.json();
    setSubmitting(false);
    if (!res.ok) { setError(data.error); return; }
    setShowModal(false);
    setForm({ name: "", phone: "", email: "", designation: "", joiningDate: new Date().toISOString().split("T")[0], salary: "", address: "" });
    fetchStaff();
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this staff member?")) return;
    await fetch(`/api/staff/${id}`, { method: "DELETE" });
    fetchStaff();
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>
          <p className="text-sm text-slate-500">{staffList.length} staff members</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
          Add Staff
        </button>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        <input className="form-input pl-9 max-w-xs" placeholder="Search staff..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-3">👩‍🏫</div>
              <p className="text-slate-500">No staff members found</p>
              <button onClick={() => setShowModal(true)} className="btn btn-primary btn-sm mt-4">Add Staff</button>
            </div>
          ) : staffList.map(s => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-lg font-bold text-purple-600">
                    {getInitials(s.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <p className="text-sm text-slate-500">{s.designation || "Staff"}</p>
                  </div>
                </div>
                <span className={`badge ${getStatusColor(s.status)}`}>{s.status}</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {s.phone && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                    {s.phone}
                  </div>
                )}
                {s.email && (
                  <div className="flex items-center gap-2 text-slate-600">
                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                    {s.email}
                  </div>
                )}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Salary</span>
                  <span className="font-semibold text-slate-700">{s.salary ? formatCurrency(s.salary) : "—"}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Joined</span>
                  <span className="text-slate-600">{formatDate(s.joiningDate)}</span>
                </div>
              </div>
              {s.status !== "ARCHIVED" && (
                <button onClick={() => handleArchive(s.id)} className="mt-3 text-xs text-red-500 hover:text-red-700 transition">Archive</button>
              )}
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Add Staff Member</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" placeholder="Staff name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input className="form-input" placeholder="01XXXXXXXXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Email</label>
                    <input type="email" className="form-input" placeholder="email@example.com" value={form.email} onChange={e => setForm({...form, email: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Designation</label>
                    <input className="form-input" placeholder="Teacher, Accountant..." value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Salary (৳)</label>
                    <input type="number" className="form-input" placeholder="Monthly salary" value={form.salary} onChange={e => setForm({...form, salary: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Joining Date</label>
                    <input type="date" className="form-input" value={form.joiningDate} onChange={e => setForm({...form, joiningDate: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">{submitting ? "Adding..." : "Add Staff"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Semester = { id: string; semesterNo: number; name: string };

type Programme = {
  id: string;
  programmeNo: number | null;
  name: string;
  code: string | null;
  description: string | null;
  duration: string | null;
  status: string;
  semesters: Semester[];
};

type FormState = {
  programmeNo: string;
  name: string;
  code: string;
  duration: string;
  description: string;
  semesterCount: string;
};

const initialForm: FormState = {
  programmeNo: "211",
  name: "",
  code: "",
  duration: "",
  description: "",
  semesterCount: "4",
};

function suggestCode(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      const clean = word.replace(/[^a-zA-Z0-9]/g, "");
      if (/^[A-Z0-9]{2,3}$/.test(clean)) return clean.toUpperCase();
      return clean ? clean[0].toUpperCase() : "";
    })
    .join("")
    .slice(0, 12) || "PRG";
}

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [nextProgrammeNo, setNextProgrammeNo] = useState(211);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");
  const [form, setForm] = useState<FormState>(initialForm);

  async function loadProgrammes() {
    try {
      setLoading(true);
      const response = await fetch("/api/programmes", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to load programmes");
      setProgrammes(data.programmes || []);
      const next = Number(data.nextProgrammeNo) || 211;
      setNextProgrammeNo(next);
      setForm((current) => ({ ...current, programmeNo: String(next) }));
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to load programmes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void loadProgrammes(); }, []);

  function openCreateModal() {
    setError("");
    setSuccess("");
    setForm({ ...initialForm, programmeNo: String(nextProgrammeNo) });
    setShowModal(true);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");

    const name = form.name.trim();
    const programmeNo = Number(form.programmeNo);
    const code = (form.code.trim() || suggestCode(name)).toUpperCase();
    const semesterCount = Number(form.semesterCount);

    if (!name) return setError("Programme name is required.");
    if (!Number.isInteger(programmeNo) || programmeNo < 211) {
      return setError("Programme number must start from 211.");
    }
    if (!Number.isInteger(semesterCount) || semesterCount < 4 || semesterCount > 30) {
      return setError("Semester count must be between 4 and 30.");
    }

    try {
      setSaving(true);
      const response = await fetch("/api/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          programmeNo,
          name,
          code,
          duration: form.duration.trim() || null,
          description: form.description.trim() || null,
          semesterCount,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Failed to create programme");

      setSuccess(`${name} created as Programme ${programmeNo} (${code}).`);
      setShowModal(false);
      await loadProgrammes();
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "Failed to create programme");
    } finally {
      setSaving(false);
    }
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return programmes;
    return programmes.filter((p) =>
      [p.name, p.code || "", String(p.programmeNo || ""), p.duration || ""].some((v) =>
        v.toLowerCase().includes(q),
      ),
    );
  }, [programmes, search]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">ACADEMIC</span>
            <h1 className="mt-3 text-3xl font-bold text-slate-900">Programmes</h1>
            <p className="mt-1 text-sm text-slate-500">Programme numbers now start from 211 and continue automatically.</p>
          </div>
          <button type="button" onClick={openCreateModal} className="btn btn-primary">+ Add Programme</button>
        </div>

        {success && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">✓ {success}</div>}
        {error && !showModal && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}

        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <input
            className="form-input"
            placeholder="Search by programme no, name or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        {loading ? (
          <div className="flex justify-center py-12"><div className="h-8 w-8 animate-spin rounded-full border-4 border-teal-600 border-t-transparent" /></div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white py-14 text-center">
            <div className="text-4xl">📚</div>
            <p className="mt-3 font-semibold text-slate-700">No programmes found</p>
            <button type="button" onClick={openCreateModal} className="btn btn-primary btn-sm mt-4">Create Programme</button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filtered.map((programme) => (
              <div key={programme.id} className="card">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-lg bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">#{programme.programmeNo || "—"}</span>
                      <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{programme.status}</span>
                    </div>
                    <h2 className="mt-3 text-xl font-bold text-slate-900">{programme.name}</h2>
                    <p className="mt-1 text-xs font-bold uppercase tracking-wider text-teal-700">{programme.code || "No code"}</p>
                  </div>
                  <div className="rounded-xl bg-slate-100 px-3 py-2 text-center">
                    <p className="text-[10px] font-bold uppercase text-slate-400">Semesters</p>
                    <p className="text-xl font-black text-slate-800">{programme.semesters.length}</p>
                  </div>
                </div>

                {programme.description && <p className="mt-4 text-sm leading-6 text-slate-600">{programme.description}</p>}

                <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {programme.semesters.map((semester) => (
                    <div key={semester.id} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                      <p className="text-[10px] font-bold uppercase text-slate-400">Semester</p>
                      <p className="mt-1 font-bold text-slate-800">{semester.semesterNo}</p>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {showModal && (
          <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && !saving && setShowModal(false)}>
            <div className="modal-box max-w-2xl">
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">Add Programme</h2>
                  <p className="mt-1 text-xs text-slate-400">Next available programme number: {nextProgrammeNo}</p>
                </div>
                <button type="button" onClick={() => !saving && setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="modal-body space-y-4">
                  {error && <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</div>}

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="form-label">Programme No *</label>
                      <input type="number" min="211" className="form-input font-bold" value={form.programmeNo} onChange={(e) => setForm({ ...form, programmeNo: e.target.value })} required />
                    </div>
                    <div>
                      <label className="form-label">Programme Code</label>
                      <input className="form-input uppercase" placeholder="Auto: GDWAI" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
                    </div>
                    <div className="col-span-2">
                      <label className="form-label">Programme Name *</label>
                      <input className="form-input" placeholder="Graphic Design With AI" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value, code: form.code || suggestCode(e.target.value) })} required />
                      <p className="mt-1 text-xs text-slate-400">Graphic Design With AI → GDWAI</p>
                    </div>
                    <div>
                      <label className="form-label">Duration</label>
                      <input className="form-input" placeholder="3 Years" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })} />
                    </div>
                    <div>
                      <label className="form-label">Semesters *</label>
                      <select className="form-select" value={form.semesterCount} onChange={(e) => setForm({ ...form, semesterCount: e.target.value })}>
                        {Array.from({ length: 27 }, (_, i) => i + 4).map((n) => <option key={n} value={n}>{n} Semesters</option>)}
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="form-label">Description</label>
                      <textarea className="form-input" rows={4} placeholder="Programme description..." value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button type="button" onClick={() => !saving && setShowModal(false)} className="btn btn-outline">Cancel</button>
                  <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Creating..." : "Create Programme"}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

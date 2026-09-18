"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type Semester = { id: string; semesterNo: number; name: string };
type SyllabusClass = {
  id: string;
  classNo: number;
  title: string;
  description: string | null;
  scheduledDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  semesterId: string;
  semesterNo: number;
  semesterName: string;
};

const statusMeta: Record<string, { label: string; cls: string }> = {
  UPCOMING: { label: "Upcoming", cls: "bg-blue-50 border-blue-200 text-blue-700" },
  TODAY: { label: "Today", cls: "bg-amber-50 border-amber-200 text-amber-700" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-50 border-red-200 text-red-700" },
};

const emptyClass = {
  semesterId: "",
  classNo: "",
  title: "",
  description: "",
  scheduledDate: "",
  startTime: "",
  endTime: "",
};

export default function ProgrammeSyllabusPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [classes, setClasses] = useState<SyllabusClass[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [programme, setProgramme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState(emptyClass);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const r = await fetch(`/api/programmes/${id}/syllabus`, { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to load syllabus");
      setClasses(d.classes || []);
      setSemesters(d.semesters || []);
      setProgramme(d.programme || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load syllabus");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void load();
  }, [id]);

  async function loadTemplate() {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(`/api/programmes/${id}/syllabus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: "WEB_DESIGN_AI" }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to load syllabus template");
      setMessage(d?.message || `Syllabus template loaded. ${d.seeded || 0} classes are available.`);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load syllabus template");
    } finally {
      setSaving(false);
    }
  }

  async function updateClass(c: SyllabusClass, patch: Partial<SyllabusClass>) {
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(`/api/programmes/${id}/syllabus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId: c.id, ...patch }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to update class");
      setClasses(prev => prev.map(x => x.id === c.id ? { ...x, ...patch } : x));
      setMessage("Syllabus class updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update class");
    } finally {
      setSaving(false);
    }
  }

  async function addClass(e: React.FormEvent) {
    e.preventDefault();
    if (!addForm.semesterId || !addForm.classNo || !addForm.title.trim()) {
      setError("Semester, class number and title are required.");
      return;
    }
    setSaving(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch(`/api/programmes/${id}/syllabus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          semesterId: addForm.semesterId,
          classNo: Number(addForm.classNo),
          title: addForm.title.trim(),
          description: addForm.description.trim() || null,
          scheduledDate: addForm.scheduledDate || null,
          startTime: addForm.startTime || null,
          endTime: addForm.endTime || null,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to add syllabus class");
      setShowAdd(false);
      setAddForm(emptyClass);
      setMessage("New syllabus class added successfully.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add syllabus class");
    } finally {
      setSaving(false);
    }
  }

  const grouped = useMemo(() => {
    const bySemester = new Map<number, { semester: Semester; items: SyllabusClass[] }>();
    for (const semester of semesters) {
      bySemester.set(semester.semesterNo, { semester, items: [] });
    }
    for (const item of classes) {
      const group = bySemester.get(item.semesterNo);
      if (group) group.items.push(item);
    }
    return Array.from(bySemester.values());
  }, [classes, semesters]);

  function openAdd() {
    const first = semesters[0];
    const selectedSemester = addForm.semesterId || first?.id || "";
    const semesterNo = semesters.find(s => s.id === selectedSemester)?.semesterNo;
    const used = classes.filter(c => c.semesterId === selectedSemester).map(c => c.classNo);
    const next = used.length ? Math.max(...used) + 1 : (semesterNo ? 1 : "");
    setAddForm({ ...emptyClass, semesterId: selectedSemester, classNo: String(next) });
    setError("");
    setShowAdd(true);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">Academic · Syllabus</p>
            <h1 className="mt-1 text-3xl font-bold text-slate-900">{programme?.name || "Programme"}</h1>
            <p className="mt-1 text-sm text-slate-500">
              {semesters.length} Semesters · {classes.length} Classes
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={openAdd} disabled={saving || semesters.length === 0} className="btn btn-outline">
              + Add Class
            </button>
            <button onClick={loadTemplate} disabled={saving || semesters.length !== 4} className="btn btn-primary">
              {saving ? "Working..." : "Load Web Design with AI Syllabus"}
            </button>
          </div>
        </div>

        {semesters.length !== 4 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            This programme has {semesters.length} semesters. The Web Design with AI template requires exactly 4 semesters, but you can still add and edit classes manually.
          </div>
        )}

        {message && <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
        {error && <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading syllabus...</div>
        ) : grouped.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="text-lg font-bold text-slate-800">No semesters found</h2>
            <p className="mt-2 text-sm text-slate-500">This programme does not have semester records yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map(({ semester, items }) => (
              <section key={semester.id} className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <div>
                    <h2 className="text-lg font-bold text-slate-900">Semester {semester.semesterNo}</h2>
                    <p className="mt-1 text-xs text-slate-500">{semester.name} · {items.length} classes</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const used = items.map(c => c.classNo);
                      const next = used.length ? Math.max(...used) + 1 : 1;
                      setAddForm({ ...emptyClass, semesterId: semester.id, classNo: String(next) });
                      setShowAdd(true);
                    }}
                    className="btn btn-outline btn-sm"
                  >
                    + Class
                  </button>
                </div>

                <div className="divide-y divide-slate-100">
                  {items.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">No classes yet. Click + Class to add one.</div>
                  ) : items.sort((a, b) => a.classNo - b.classNo).map(c => {
                    const meta = statusMeta[c.status] || statusMeta.UPCOMING;
                    return (
                      <div key={c.id} className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between">
                        <div className="flex min-w-0 gap-3">
                          <div className={`flex h-10 w-14 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${meta.cls}`}>Class {c.classNo}</div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-800">{c.title}</h3>
                              <button
                                type="button"
                                onClick={() => {
                                  const title = prompt("Class title:", c.title);
                                  if (title === null) return;
                                  const description = prompt("Class description:", c.description || "");
                                  if (description === null) return;
                                  if (!title.trim()) { alert("Class title is required."); return; }
                                  void updateClass(c, { title: title.trim(), description: description.trim() || null });
                                }}
                                disabled={saving}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                              >
                                Edit
                              </button>
                            </div>
                            {c.description && <p className="mt-1 text-xs text-slate-500">{c.description}</p>}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <input type="date" value={c.scheduledDate || ""} onChange={e => void updateClass(c, { scheduledDate: e.target.value || null })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                          <input type="time" value={c.startTime || ""} onChange={e => void updateClass(c, { startTime: e.target.value || null })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                          <input type="time" value={c.endTime || ""} onChange={e => void updateClass(c, { endTime: e.target.value || null })} className="rounded-lg border border-slate-200 px-3 py-2 text-xs" />
                          {(["UPCOMING", "TODAY", "COMPLETED", "CANCELLED"] as const).map(status => (
                            <button
                              key={status}
                              type="button"
                              onClick={() => void updateClass(c, { status })}
                              disabled={saving}
                              className={`rounded-lg border px-3 py-2 text-xs font-bold ${c.status === status ? statusMeta[status].cls : "border-slate-200 bg-white text-slate-600"}`}
                            >
                              {statusMeta[status].label}
                            </button>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {showAdd && (
        <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget && !saving) setShowAdd(false); }}>
          <div className="modal-box max-w-2xl">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Add Syllabus Class</h2>
                <p className="text-xs text-slate-400">Teacher can add a class to an existing programme semester.</p>
              </div>
              <button onClick={() => !saving && setShowAdd(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={addClass}>
              <div className="modal-body grid grid-cols-2 gap-3">
                <div>
                  <label className="form-label">Semester *</label>
                  <select className="form-select" value={addForm.semesterId} onChange={e => {
                    const semesterId = e.target.value;
                    const used = classes.filter(c => c.semesterId === semesterId).map(c => c.classNo);
                    const next = used.length ? Math.max(...used) + 1 : 1;
                    setAddForm(x => ({ ...x, semesterId, classNo: String(next) }));
                  }} required>
                    <option value="">Select semester</option>
                    {semesters.map(s => <option key={s.id} value={s.id}>Semester {s.semesterNo} · {s.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="form-label">Class No *</label>
                  <input type="number" min="1" className="form-input" value={addForm.classNo} onChange={e => setAddForm({ ...addForm, classNo: e.target.value })} required />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Class Title *</label>
                  <input className="form-input" value={addForm.title} onChange={e => setAddForm({ ...addForm, title: e.target.value })} required />
                </div>
                <div className="col-span-2">
                  <label className="form-label">Description</label>
                  <textarea className="form-input min-h-24" value={addForm.description} onChange={e => setAddForm({ ...addForm, description: e.target.value })} />
                </div>
                <div><label className="form-label">Date</label><input type="date" className="form-input" value={addForm.scheduledDate} onChange={e => setAddForm({ ...addForm, scheduledDate: e.target.value })} /></div>
                <div><label className="form-label">Start Time</label><input type="time" className="form-input" value={addForm.startTime} onChange={e => setAddForm({ ...addForm, startTime: e.target.value })} /></div>
                <div><label className="form-label">End Time</label><input type="time" className="form-input" value={addForm.endTime} onChange={e => setAddForm({ ...addForm, endTime: e.target.value })} /></div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => !saving && setShowAdd(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Saving..." : "Add Class"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

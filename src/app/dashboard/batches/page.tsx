"use client";

import { useCallback, useEffect, useState } from "react";
import { getStatusColor, formatCurrency, formatDate } from "@/lib/utils";

type Programme = { id: string; programmeNo: number | null; name: string; code: string | null; semesters: { id: string; semesterNo: number; name: string }[] };
type BatchRow = { id: string; name: string; room: string | null; startDate: string | null; endDate: string | null; fee: string | null; status: string; batchNo: number | null; programmeId: string | null; programmeName: string | null; programmeCode: string | null; programmeNo: number | null; semesterId: string | null; semesterNo: number | null; semesterName: string | null; courseName: string | null; teacherName: string | null; studentCount: number };

const blankForm = { batchNo: "", name: "", programmeId: "", semesterId: "", courseId: "", teacherId: "", room: "", startDate: "", endDate: "", fee: "" };

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [courses, setCourses] = useState<{id:string;name:string}[]>([]);
  const [staff, setStaff] = useState<{id:string;name:string}[]>([]);
  const [nextNo, setNextNo] = useState(211);
  const [loading, setLoading] = useState(true);
  const [show, setShow] = useState(false);
  const [editing, setEditing] = useState<BatchRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string|null>(null);
  const [error, setError] = useState("");
  const [form, setForm] = useState(blankForm);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const r = await fetch("/api/batches", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to load batches");
      setBatches(d.batches || []);
      const n = Number(d.nextBatchNo) || 211;
      setNextNo(n);
      setForm(x => ({ ...x, batchNo: x.name ? x.batchNo : String(n) }));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load batches");
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    Promise.all([
      fetch("/api/programmes", { cache: "no-store" }),
      fetch("/api/courses", { cache: "no-store" }),
      fetch("/api/staff", { cache: "no-store" }),
    ]).then(async ([p,c,s]) => {
      const pd = await p.json(); const cd = await c.json(); const sd = await s.json();
      setProgrammes(pd.programmes || []);
      setCourses(cd.courses || []);
      setStaff(sd.staff || []);
    }).catch(e => console.error(e));
  }, []);

  function resetCreate() {
    setEditing(null);
    setForm({ ...blankForm, batchNo: String(nextNo) });
    setError("");
  }

  function openEdit(row: BatchRow) {
    setEditing(row);
    setForm({
      batchNo: String(row.batchNo || ""),
      name: row.name || "",
      programmeId: row.programmeId || "",
      semesterId: row.semesterId || "",
      courseId: "",
      teacherId: "",
      room: row.room || "",
      startDate: row.startDate || "",
      endDate: row.endDate || "",
      fee: row.fee || "",
    });
    setError("");
    setShow(true);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const url = editing ? `/api/batches/${editing.id}` : "/api/batches";
      const r = await fetch(url, {
        method: editing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d?.error || (editing ? "Failed to update batch" : "Failed to create batch"));
      setShow(false);
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to save batch");
    } finally {
      setSaving(false);
    }
  }

  async function removeBatch(id:string,name:string) {
    if (!confirm(`Delete batch "${name}"? This removes linked enrollments, attendance, homework and exam records.`)) return;
    setDeleting(id); setError("");
    try {
      const r = await fetch(`/api/batches/${id}`, { method:"DELETE" });
      const d = await r.json().catch(()=>({}));
      if (!r.ok) throw new Error(d?.error || "Failed to delete batch");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete batch");
    } finally {
      setDeleting(null);
    }
  }

  const selected = programmes.find(p => p.id === form.programmeId);

  return <div className="space-y-5">
    <div className="page-header">
      <div><h1 className="page-title">Batches</h1><p className="text-sm text-slate-500">Batch numbering starts from 211</p></div>
      <button onClick={() => { resetCreate(); setShow(true); }} className="btn btn-primary">+ Add Batch</button>
    </div>

    {error && <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

    {loading ? <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"/></div> :
      batches.length === 0 ? <div className="card py-12 text-center"><div className="mb-3 text-4xl">🏫</div><p className="text-slate-500">No batches yet</p></div> :
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {batches.map(row => <div key={row.id} className="card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="flex gap-2"><span className="rounded-lg bg-blue-50 px-2 py-1 text-xs font-black text-blue-700">#{row.batchNo||"—"}</span><span className={`badge ${getStatusColor(row.status)}`}>{row.status}</span></div>
              <h3 className="mt-2 font-bold text-slate-800">{row.name}</h3>
              <p className="text-sm font-semibold text-teal-700">{row.programmeCode||"Programme"} · {row.programmeName||"—"}</p>
            </div>
          </div>
          <div className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Programme No</span><b>{row.programmeNo||"—"}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">Semester</span><span>{row.semesterName||"—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Course</span><span>{row.courseName||"—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Teacher</span><span>{row.teacherName||"—"}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Students</span><b className="text-blue-600">{row.studentCount||0}</b></div>
            <div className="flex justify-between"><span className="text-slate-500">Fee/Month</span><b>{row.fee?formatCurrency(row.fee):"—"}</b></div>
            {row.startDate&&<div className="flex justify-between"><span className="text-slate-500">Period</span><span className="text-xs">{formatDate(row.startDate)} – {row.endDate?formatDate(row.endDate):"—"}</span></div>}
          </div>
          <div className="mt-4 flex justify-end gap-2 border-t pt-3">
            <button onClick={() => { openEdit(row); }} className="btn btn-outline btn-sm text-blue-700">Edit</button>
            <button onClick={()=>removeBatch(row.id,row.name)} disabled={deleting===row.id} className="btn btn-ghost btn-sm text-red-600">{deleting===row.id?"Deleting...":"Delete"}</button>
          </div>
        </div>)}
      </div>
    }

    {show && <div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget&&!saving)setShow(false)}}>
      <div className="modal-box max-w-2xl">
        <div className="modal-header">
          <div><h2 className="modal-title">{editing ? "Edit Batch" : "Add Batch"}</h2><p className="text-xs text-slate-400">{editing ? `Batch #${editing.batchNo || "—"}` : `Next available batch number: ${nextNo}`}</p></div>
          <button onClick={()=>!saving&&setShow(false)} className="btn btn-ghost btn-sm">✕</button>
        </div>
        <form onSubmit={submit}>
          <div className="modal-body grid grid-cols-2 gap-3">
            <div><label className="form-label">Batch No</label><input type="number" className="form-input font-bold bg-slate-50" value={form.batchNo} readOnly /></div>
            <div><label className="form-label">Batch Name *</label><input className="form-input" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required /></div>
            <div className="col-span-2"><label className="form-label">Programme</label><input className="form-input bg-slate-50" value={selected ? `${selected.programmeNo || ""} · ${selected.code || "CODE"} · ${selected.name}` : (editing?.programmeName || "")} readOnly /></div>
            <div><label className="form-label">Semester</label><select className="form-select" value={form.semesterId} onChange={e=>setForm({...form,semesterId:e.target.value})} disabled={!selected}><option value="">Select semester</option>{(selected?.semesters||[]).map(s=><option key={s.id} value={s.id}>{s.semesterNo} · {s.name}</option>)}</select></div>
            <div><label className="form-label">Course</label><select className="form-select" value={form.courseId} onChange={e=>setForm({...form,courseId:e.target.value})}><option value="">Select course</option>{courses.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
            <div><label className="form-label">Room</label><input className="form-input" value={form.room} onChange={e=>setForm({...form,room:e.target.value})}/></div>
            <div><label className="form-label">Monthly Fee</label><input type="number" min="0" step="0.01" className="form-input" value={form.fee} onChange={e=>setForm({...form,fee:e.target.value})}/></div>
            <div><label className="form-label">Start Date</label><input type="date" className="form-input" value={form.startDate} onChange={e=>setForm({...form,startDate:e.target.value})}/></div>
            <div><label className="form-label">End Date</label><input type="date" className="form-input" value={form.endDate} onChange={e=>setForm({...form,endDate:e.target.value})}/></div>
          </div>
          <div className="modal-footer">
            <button type="button" onClick={()=>!saving&&setShow(false)} className="btn btn-outline">Cancel</button>
            <button type="submit" disabled={saving} className="btn btn-primary">{saving?(editing?"Saving...":"Creating..."):(editing?"Save Changes":"Create Batch")}</button>
          </div>
        </form>
      </div>
    </div>}
  </div>;
}

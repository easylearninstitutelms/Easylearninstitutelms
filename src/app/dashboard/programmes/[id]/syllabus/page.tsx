"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type SyllabusClass = {
  id:string; classNo:number; title:string; description:string|null;
  scheduledDate:string|null; startTime:string|null; endTime:string|null;
  status:string; semesterId:string; semesterNo:number; semesterName:string;
};

const statusMeta:Record<string,{label:string;cls:string}> = {
  UPCOMING:{label:"Upcoming",cls:"bg-blue-50 border-blue-200 text-blue-700"},
  TODAY:{label:"Today",cls:"bg-amber-50 border-amber-200 text-amber-700"},
  COMPLETED:{label:"Completed",cls:"bg-emerald-50 border-emerald-200 text-emerald-700"},
  CANCELLED:{label:"Cancelled",cls:"bg-red-50 border-red-200 text-red-700"},
};

export default function ProgrammeSyllabusPage(){
  const params=useParams<{id:string}>();
  const id=params.id;
  const [classes,setClasses]=useState<SyllabusClass[]>([]);
  const [programme,setProgramme]=useState<any>(null);
  const [loading,setLoading]=useState(true);
  const [saving,setSaving]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");

  async function load(){
    setLoading(true); setError("");
    try{
      const [s,p]=await Promise.all([fetch(`/api/programmes/${id}/syllabus`,{cache:"no-store"}),fetch("/api/programmes",{cache:"no-store"})]);
      const sd=await s.json(); const pd=await p.json();
      if(!s.ok) throw new Error(sd?.error||"Failed to load syllabus");
      setClasses(sd.classes||[]);
      setProgramme((pd.programmes||[]).find((x:any)=>x.id===id)||null);
    }catch(e){setError(e instanceof Error?e.message:"Failed to load syllabus");}
    finally{setLoading(false);}
  }
  useEffect(()=>{if(id) void load();},[id]);

  async function seed(){
    if(!confirm("Load the 40-class Web Design with AI syllabus? Existing syllabus classes for this programme will be replaced.")) return;
    setSaving(true);setMessage("");setError("");
    try{
      const r=await fetch(`/api/programmes/${id}/syllabus`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({template:"WEB_DESIGN_AI"})});
      const d=await r.json(); if(!r.ok) throw new Error(d?.error||"Failed");
      setMessage(`✓ ${d.seeded} classes loaded successfully.`); await load();
    }catch(e){setError(e instanceof Error?e.message:"Failed to load syllabus");}
    finally{setSaving(false);}
  }

  async function updateClass(c:SyllabusClass, patch:Partial<SyllabusClass>){
    setSaving(true);setError("");setMessage("");
    try{
      const r=await fetch(`/api/programmes/${id}/syllabus`,{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({classId:c.id,...patch})});
      const d=await r.json();if(!r.ok)throw new Error(d?.error||"Failed");
      setClasses(prev=>prev.map(x=>x.id===c.id?{...x,...patch}:x));
    }catch(e){setError(e instanceof Error?e.message:"Failed to update class");}
    finally{setSaving(false);}
  }

  const grouped=useMemo(()=>Array.from({length:4},(_,i)=>({no:i+1,items:classes.filter(c=>c.semesterNo===i+1).sort((a,b)=>a.classNo-b.classNo)})),[classes]);

  return <div className="min-h-screen bg-slate-50"><div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
    <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
      <div><p className="text-xs font-bold uppercase tracking-widest text-teal-700">Academic · Syllabus</p><h1 className="mt-1 text-3xl font-bold text-slate-900">{programme?.name||"Programme"}</h1><p className="mt-1 text-sm text-slate-500">4 Semesters · 10 Classes per Semester · 40 Classes Total</p></div>
      <button onClick={seed} disabled={saving} className="btn btn-primary">{saving?"Working...":"Load Web Design with AI Syllabus"}</button>
    </div>
    {message&&<div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{message}</div>}
    {error&&<div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}
    {loading?<div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent"/></div>:<div className="space-y-5">{grouped.map(g=>{
      const completed=g.items.filter(x=>x.status==="COMPLETED").length;
      const semesterDone=g.items.length===10&&completed===10;
      return <section key={g.no} className={`overflow-hidden rounded-2xl border bg-white shadow-sm ${semesterDone?"border-emerald-300":"border-slate-200"}`}>
        <div className={`border-b p-5 ${semesterDone?"bg-emerald-50":"bg-slate-50"}`}><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-wider text-teal-700">Semester {g.no}</p><h2 className="mt-1 text-xl font-bold text-slate-900">Semester {g.no}</h2></div><span className={`rounded-full border px-3 py-1 text-xs font-bold ${semesterDone?"bg-emerald-100 border-emerald-200 text-emerald-700":"bg-white border-slate-200 text-slate-600"}`}>{semesterDone?"✓ Completed":`${completed}/10 Completed`}</span></div></div>
        <div className="divide-y">{g.items.length===0?<div className="p-6 text-sm text-slate-400">No syllabus loaded yet.</div>:g.items.map(c=>{
          const meta=statusMeta[c.status]||statusMeta.UPCOMING;
          return <div key={c.id} className={`p-4 sm:p-5 ${c.status==="COMPLETED"?"bg-emerald-50/40":c.status==="TODAY"?"bg-amber-50/50":c.status==="CANCELLED"?"bg-red-50/40":"bg-white"}`}>
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="flex gap-3"><div className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${meta.cls}`}>Class {c.classNo}</div><div><h3 className="font-bold text-slate-800">{c.title}</h3>{c.description&&<p className="mt-1 text-xs text-slate-500">{c.description}</p>}</div></div>
              <span className={`self-start rounded-full border px-3 py-1 text-xs font-bold ${meta.cls}`}>{meta.label}</span>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3 lg:max-w-3xl">
              <label className="text-xs text-slate-500">Date<input type="date" value={c.scheduledDate||""} onChange={e=>updateClass(c,{scheduledDate:e.target.value||null})} className="form-input mt-1"/></label>
              <label className="text-xs text-slate-500">Start<input type="time" value={(c.startTime||"").slice(0,5)} onChange={e=>updateClass(c,{startTime:e.target.value||null})} className="form-input mt-1"/></label>
              <label className="text-xs text-slate-500">End<input type="time" value={(c.endTime||"").slice(0,5)} onChange={e=>updateClass(c,{endTime:e.target.value||null})} className="form-input mt-1"/></label>
            </div>
            <div className="mt-3 flex flex-wrap gap-2"><span className="text-xs font-semibold text-slate-500 self-center">Status:</span>{Object.entries(statusMeta).map(([value,m])=><button key={value} onClick={()=>updateClass(c,{status:value})} className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold ${c.status===value?m.cls:"border-slate-200 bg-white text-slate-500"}`}>{m.label}</button>)}</div>
          </div>
        })}</div>
      </section>
    })}</div>}
  </div></div>;
}

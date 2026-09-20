"use client";

import { useEffect, useMemo, useState } from "react";

type ClassRow = {
  batchId:string; batchName:string; batchNo:number|null; room:string|null;
  programmeId:string; programmeName:string; programmeCode:string|null;
  semesterId:string; semesterNo:number; semesterName:string;
  classId:string; classNo:number; title:string; description:string|null;
  scheduledDate:string|null; startTime:string|null; endTime:string|null;
  syllabusStatus:string; sessionStatus:"PENDING"|"COMPLETED"; takenAt:string|null;
  recordingId:string|null; recordingTitle:string|null; recordingUrl:string|null; recordingDuration:string|null;
};

function dateStatus(date:string|null, sessionStatus:string){
  if(sessionStatus==="COMPLETED") return "COMPLETED";
  if(!date) return "PENDING";
  const today=new Date().toISOString().slice(0,10);
  if(date<today) return "PENDING";
  if(date===today) return "TODAY";
  return "UPCOMING";
}
function cardClass(status:string){
  if(status==="COMPLETED") return "border-emerald-200 bg-emerald-50/60";
  if(status==="TODAY") return "border-amber-200 bg-amber-50/70";
  return "border-slate-200 bg-white";
}

export default function TeacherClassesPage(){
  const [classes,setClasses]=useState<ClassRow[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  const [saving,setSaving]=useState("");
  const [recordingRow,setRecordingRow]=useState<ClassRow|null>(null);
  const [recordingTitle,setRecordingTitle]=useState("");
  const [recordingUrl,setRecordingUrl]=useState("");
  const [recordingDuration,setRecordingDuration]=useState("");
  const [recordingSaving,setRecordingSaving]=useState(false);

  async function load(){
    setLoading(true); setError("");
    try{
      const res=await fetch("/api/teacher/classes",{cache:"no-store"});
      const body=await res.json();
      if(!res.ok) throw new Error(body?.error||"Failed to load classes");
      setClasses(body.classes||[]);
    }catch(e){setError(e instanceof Error?e.message:"Failed to load classes");}
    finally{setLoading(false);}
  }
  useEffect(()=>{void load();},[]);

  const grouped=useMemo(()=>{
    const map=new Map<string,{key:string;batchName:string;batchNo:number|null;programmeName:string;semesterName:string;semesterNo:number;items:ClassRow[]}>();
    for(const row of classes){
      if(!map.has(row.batchId)) map.set(row.batchId,{key:row.batchId,batchName:row.batchName,batchNo:row.batchNo,programmeName:row.programmeName,semesterName:row.semesterName,semesterNo:row.semesterNo,items:[]});
      map.get(row.batchId)!.items.push(row);
    }
    return Array.from(map.values());
  },[classes]);

  async function markClass(row:ClassRow,status:"COMPLETED"|"PENDING"){
    setSaving(row.classId+row.batchId);
    try{
      const res=await fetch("/api/teacher/classes",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({classId:row.classId,batchId:row.batchId,status})});
      const body=await res.json();
      if(!res.ok) throw new Error(body?.error||"Failed to update class");
      await load();
    }catch(e){alert(e instanceof Error?e.message:"Failed to update class");}
    finally{setSaving("");}
  }

  function openRecording(row:ClassRow){
    setRecordingRow(row);
    setRecordingTitle(row.recordingTitle||`Class ${row.classNo} Recording`);
    setRecordingUrl(row.recordingUrl||"");
    setRecordingDuration(row.recordingDuration||"");
  }

  async function saveRecording(e:React.FormEvent){
    e.preventDefault(); if(!recordingRow) return;
    setRecordingSaving(true);
    try{
      const res=await fetch("/api/teacher/class-recordings",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({
        classId:recordingRow.classId,batchId:recordingRow.batchId,title:recordingTitle.trim(),videoUrl:recordingUrl.trim(),duration:recordingDuration.trim()
      })});
      const body=await res.json();
      if(!res.ok) throw new Error(body?.error||"Failed to save recording");
      setRecordingRow(null); await load();
    }catch(e){alert(e instanceof Error?e.message:"Failed to save recording");}
    finally{setRecordingSaving(false);}
  }

  async function removeRecording(){
    if(!recordingRow?.recordingId) return;
    if(!confirm("Remove this class recording?")) return;
    setRecordingSaving(true);
    try{
      const res=await fetch("/api/teacher/class-recordings",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({classId:recordingRow.classId,batchId:recordingRow.batchId})});
      const body=await res.json();
      if(!res.ok) throw new Error(body?.error||"Failed to remove recording");
      setRecordingRow(null); await load();
    }catch(e){alert(e instanceof Error?e.message:"Failed to remove recording");}
    finally{setRecordingSaving(false);}
  }

  if(loading) return <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"/></div>;
  if(error) return <div className="card"><p className="text-red-600 text-sm">{error}</p><button className="btn btn-primary mt-4" onClick={load}>Try Again</button></div>;

  return <>
    <div className="space-y-6">
      <div className="page-header">
        <div><h1 className="page-title">My Classes</h1><p className="text-sm text-slate-500">Take your syllabus classes and add the recording underneath each completed class.</p></div>
        <button className="btn btn-outline" onClick={load}>Refresh</button>
      </div>

      {grouped.length===0 ? <div className="card text-center py-12"><div className="text-4xl mb-3">👨‍🏫</div><p className="font-semibold text-slate-700">No active class assigned</p><p className="text-sm text-slate-400 mt-1">A programme, semester and active batch must be assigned to you.</p></div> :
      grouped.map(group=>{
        const completed=group.items.filter(x=>x.sessionStatus==="COMPLETED").length;
        return <section key={group.key} className="card">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div><h2 className="text-lg font-bold text-slate-800">{group.programmeName}</h2><p className="text-sm text-slate-500 mt-1">Batch {group.batchNo??"—"} · {group.batchName} · {group.semesterName}</p></div>
            <span className="badge badge-blue">{completed}/{group.items.length} Classes Taken</span>
          </div>
          <div className="mt-5 space-y-3">
            {group.items.map(row=>{
              const status=dateStatus(row.scheduledDate,row.sessionStatus);
              const key=row.classId+row.batchId;
              return <div key={key} className={"rounded-2xl border p-4 "+cardClass(status)}>
                <div className="flex flex-col lg:flex-row lg:items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center shrink-0"><span className="text-[10px] uppercase text-slate-400">Class</span><span className="text-xl font-black text-slate-700">{row.classNo}</span></div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-slate-800">{row.title}</h3><span className="rounded-full px-2.5 py-1 text-xs font-bold bg-white/80">{status==="COMPLETED"?"✓ Taken":status==="TODAY"?"Today":"Pending"}</span></div>
                    {row.description&&<p className="text-sm text-slate-500 mt-1">{row.description}</p>}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-slate-500"><span>📅 {row.scheduledDate||"Date not set"}</span>{(row.startTime||row.endTime)&&<span>🕒 {row.startTime||"—"} - {row.endTime||"—"}</span>}{row.room&&<span>🏫 {row.room}</span>}</div>
                    {row.recordingId&&<div className="mt-3 rounded-xl border border-blue-200 bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><div><p className="text-xs font-bold text-blue-700">🎥 Recording added</p><p className="text-sm font-semibold text-slate-700">{row.recordingTitle}</p>{row.recordingDuration&&<p className="text-xs text-slate-400">{row.recordingDuration}</p>}</div><a href={row.recordingUrl||"#"} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">Open Video</a></div></div>}
                  </div>
                  <div className="shrink-0 flex flex-wrap justify-end gap-2">
                    {row.sessionStatus==="COMPLETED" ? <>
                      <button disabled={saving===key} onClick={()=>markClass(row,"PENDING")} className="btn btn-outline">Mark Pending</button>
                      <button type="button" onClick={()=>openRecording(row)} className="btn btn-primary">{row.recordingId?"Edit Recording":"+ Add Recording"}</button>
                    </> : <button disabled={saving===key} onClick={()=>markClass(row,"COMPLETED")} className="btn btn-primary">{saving===key?"Saving...":"✓ I Took This Class"}</button>}
                  </div>
                </div>
              </div>;
            })}
          </div>
        </section>;
      })}
    </div>

    {recordingRow&&<div className="modal-overlay" onClick={e=>{if(e.target===e.currentTarget&&!recordingSaving)setRecordingRow(null)}}>
      <div className="modal-box max-w-xl">
        <div className="modal-header"><div><h2 className="modal-title">{recordingRow.recordingId?"Edit Class Recording":"Add Class Recording"}</h2><p className="text-xs text-slate-400">Class {recordingRow.classNo} · {recordingRow.title} · Batch {recordingRow.batchNo??"—"}</p></div><button type="button" onClick={()=>!recordingSaving&&setRecordingRow(null)} className="btn btn-ghost btn-sm">✕</button></div>
        <form onSubmit={saveRecording}>
          <div className="modal-body space-y-3">
            <div><label className="form-label">Video Title *</label><input className="form-input" value={recordingTitle} onChange={e=>setRecordingTitle(e.target.value)} placeholder="Class recording" required/></div>
            <div><label className="form-label">Video URL *</label><input type="url" className="form-input" value={recordingUrl} onChange={e=>setRecordingUrl(e.target.value)} placeholder="https://..." required/><p className="mt-1 text-xs text-slate-400">Paste a hosted video link such as YouTube, Vimeo, or a direct MP4 URL.</p></div>
            <div><label className="form-label">Duration</label><input className="form-input" value={recordingDuration} onChange={e=>setRecordingDuration(e.target.value)} placeholder="45 minutes"/></div>
          </div>
          <div className="modal-footer">{recordingRow.recordingId&&<button type="button" onClick={removeRecording} disabled={recordingSaving} className="btn btn-ghost text-red-600 mr-auto">Remove</button>}<button type="button" onClick={()=>!recordingSaving&&setRecordingRow(null)} className="btn btn-outline">Cancel</button><button type="submit" disabled={recordingSaving} className="btn btn-primary">{recordingSaving?"Saving...":"Save Recording"}</button></div>
        </form>
      </div>
    </div>}
  </>;
}

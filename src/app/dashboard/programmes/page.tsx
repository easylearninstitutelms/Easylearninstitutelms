"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Semester = { id: string; semesterNo: number; name: string };
type Programme = {
  id: string; programmeNo: number | null; name: string; code: string | null;
  duration: string | null; description: string | null; status: string;
  studentCount: number; semesters: Semester[];
};
type ClassDraft = {
  classNo: number; title: string; description: string;
  scheduledDate: string; startTime: string; endTime: string;
};
type SemesterDraft = { semesterNo: number; classes: ClassDraft[] };
type FormState = {
  programmeNo: string; name: string; code: string; duration: string;
  description: string; semesterCount: string;
};

const emptyForm: FormState = {
  programmeNo: "211", name: "", code: "", duration: "", description: "", semesterCount: "4"
};

const WEB_DESIGN_AI: [string, string][] = [
  ["Introduction to Web Design in the AI Era", "ওয়েব প্রসেস, ডোমেইন, হোস্টিং এবং AI-এর ভূমিকা"],
  ["Color Theory, Typography & Grid System with AI Assistant", ""],
  ["AI Prompt Engineering for UI/UX Design", "v0.dev, Relume.io, Midjourney/DALL-E"],
  ["Wireframing & Site Architecture using AI Tools", ""],
  ["Figma Fundamentals: Vector Tools, Components & Auto-Layout", ""],
  ["Designing UI with Figma AI Features & Plugins", ""],
  ["Generating Design System & UI Kits using AI Prompts", ""],
  ["Converting AI Prompt to Figma Design Layouts", ""],
  ["Responsive Web Design Rules & Mobile-First Approach", ""],
  ["Semester Project 1: Figma-তে একটি সম্পূর্ণ ওয়েবসাইট ইন্টারফেস ও UI Kits ডিজাইন.", ""],
  ["Introduction to WordPress & AI-Driven Local Setup", ""],
  ["AI Website Builders Overview", "ZipWP, Elementor AI, CodeWP"],
  ["Elementor Basics: Layouts, Containers & Widgets", ""],
  ["Advanced Elementor + AI: Generating Custom Layouts & Content", ""],
  ["Dynamic Content & Custom Post Types", "ACF / JetEngine basics"],
  ["Creating Modern Hero Sections & Animated Effects with AI Prompts", ""],
  ["E-Commerce Setup with WooCommerce & AI Product Generation", ""],
  ["AI-Powered Form Builders & Lead Capture Automation", ""],
  ["Website Performance Optimization & AI Image Compression", ""],
  ["Semester Project 2: AI-এর মাধ্যমে একটি সম্পূর্ণ Dynamic Business or E-Commerce Website তৈরি.", ""],
  ["HTML5 Structure & Semantic Tags with ChatGPT/Claude", ""],
  ["CSS3 Fundamentals & Modern Layouts", "Flexbox & Grid with AI Coding"],
  ["Modern Styling Frameworks: Tailwind CSS Basics with AI", ""],
  ["JavaScript Essentials for Designers & Event Handling", ""],
  ["Generating Custom JS Interactivity & Animations using AI", ""],
  ["Debugging & Fixing Code Errors using AI Assistance", ""],
  ["Converting Figma Design to Custom Code (HTML/CSS) with AI Tools", ""],
  ["Customizing WordPress Themes with AI-Generated Custom CSS/JS", ""],
  ["Building One-Page Portfolio Website using Pure Code & AI", ""],
  ["Semester Project 3: AI-এর সাহায্যে Figma টু Custom Responsive Frontend Web Page কনভার্সন.", ""],
  ["Integrating Custom AI Chatbots in Websites", "Voiceflow / Botpress"],
  ["AI Automation for Websites", "Zapier / Make.com Integration"],
  ["Technical & On-Page SEO Optimization using AI Tools", ""],
  ["Website Security, Backup & Maintenance with AI Monitoring", ""],
  ["Web Accessibility (a11y) & Cross-Browser Testing", ""],
  ["Building a High-Converting Portfolio Site with AI Copywriting", ""],
  ["Creating Client Proposals & Project Scoping using AI", ""],
  ["Marketplace Orientation (Fiverr, Upwork) & Freelancing Strategies", ""],
  ["AI Workflow for Rapid Client Project Delivery & Handover", ""],
  ["Final Capstone Project & Portfolio Review", "লাইভ ক্লায়েন্ট প্রজেক্ট প্রেজেন্টেশন ও সার্টিফিকেশন."]
];

function makeClass(classNo: number): ClassDraft {
  return { classNo, title: "", description: "", scheduledDate: "", startTime: "", endTime: "" };
}

function makeSemesterDraft(count: number): SemesterDraft[] {
  return Array.from({ length: count }, (_, i) => ({
    semesterNo: i + 1,
    classes: Array.from({ length: 10 }, (_, j) => makeClass(j + 1)),
  }));
}

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [nextNo, setNextNo] = useState(211);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [show, setShow] = useState(false);
  const [search, setSearch] = useState("");
  const [error, setError] = useState("");
  const [form, setForm] = useState<FormState>(emptyForm);
  const [semesterDrafts, setSemesterDrafts] = useState<SemesterDraft[]>(makeSemesterDraft(4));

  async function load() {
    try {
      setLoading(true);
      setError("");
      const r = await fetch("/api/programmes", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d?.error || "Failed to load programmes");
      setProgrammes(d.programmes || []);
      const n = Number(d.nextProgrammeNo) || 211;
      setNextNo(n);
      setForm(f => ({ ...f, programmeNo: f.name ? f.programmeNo : String(n) }));
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : "Failed to load programmes");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function openAdd() {
    setForm({ ...emptyForm, programmeNo: String(nextNo) });
    setSemesterDrafts(makeSemesterDraft(4));
    setError("");
    setShow(true);
  }

  function changeSemesterCount(value: string) {
    const count = Number(value);
    setForm({ ...form, semesterCount: value });
    setSemesterDrafts(prev => Array.from({ length: count }, (_, i) => {
      return prev[i] || {
        semesterNo: i + 1,
        classes: Array.from({ length: 10 }, (_, j) => makeClass(j + 1)),
      };
    }));
  }

  function updateClass(semesterNo: number, classIndex: number, patch: Partial<ClassDraft>) {
    setSemesterDrafts(prev => prev.map(s =>
      s.semesterNo === semesterNo
        ? { ...s, classes: s.classes.map((c, i) => i === classIndex ? { ...c, ...patch } : c) }
        : s
    ));
  }

  function addClass(semesterNo: number) {
    setSemesterDrafts(prev => prev.map(s => {
      if (s.semesterNo !== semesterNo) return s;
      return { ...s, classes: [...s.classes, makeClass(s.classes.length + 1)] };
    }));
  }

  function removeClass(semesterNo: number, classIndex: number) {
    setSemesterDrafts(prev => prev.map(s => {
      if (s.semesterNo !== semesterNo) return s;
      return {
        ...s,
        classes: s.classes.filter((_, i) => i !== classIndex).map((c, i) => ({ ...c, classNo: i + 1 }))
      };
    }));
  }

  function loadWebDesignTemplate() {
    setForm(f => ({ ...f, semesterCount: "4" }));
    setSemesterDrafts(Array.from({ length: 4 }, (_, semesterIndex) => ({
      semesterNo: semesterIndex + 1,
      classes: Array.from({ length: 10 }, (_, classIndex) => {
        const item = WEB_DESIGN_AI[semesterIndex * 10 + classIndex];
        return {
          ...makeClass(classIndex + 1),
          title: item?.[0] || "",
          description: item?.[1] || "",
        };
      })
    })));
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    const syllabus = semesterDrafts.map(s => ({
      semesterNo: s.semesterNo,
      classes: s.classes.filter(c => c.title.trim()).map(c => ({
        classNo: c.classNo,
        title: c.title.trim(),
        description: c.description.trim() || null,
        scheduledDate: c.scheduledDate || null,
        startTime: c.startTime || null,
        endTime: c.endTime || null,
      }))
    }));

    try {
      const r = await fetch("/api/programmes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          programmeNo: Number(form.programmeNo),
          semesterCount: Number(form.semesterCount),
          syllabus,
        })
      });
      const d = await r.json();
      if (!r.ok) {
        setError(d?.error || "Failed to create programme");
        return;
      }
      setShow(false);
      setForm({ ...emptyForm, programmeNo: String(nextNo) });
      await load();
    } catch (e) {
      console.error(e);
      setError("Failed to create programme");
    } finally {
      setSaving(false);
    }
  }

  async function removeProgramme(id: string, name: string) {
    if (!confirm(`Delete programme "${name}"? It can only be deleted when no batches or exams are linked.`)) return;
    setDeleting(id);
    setError("");
    try {
      const r = await fetch(`/api/programmes/${id}`, { method: "DELETE" });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setError(d?.error || "Failed to delete programme"); return; }
      await load();
    } catch (e) {
      console.error(e);
      setError("Failed to delete programme");
    } finally {
      setDeleting(null);
    }
  }

  const filtered = useMemo(() => programmes.filter(p => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return p.name.toLowerCase().includes(q) ||
      (p.code || "").toLowerCase().includes(q) ||
      String(p.programmeNo || "").includes(q);
  }), [programmes, search]);

  const totalDraftClasses = semesterDrafts.reduce((sum, s) => sum + s.classes.filter(c => c.title.trim()).length, 0);

  return <div className="min-h-screen bg-slate-50">
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white">EL</span>
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">ACADEMIC</span>
          </div>
          <h1 className="text-3xl font-bold text-slate-900">Programmes</h1>
          <p className="mt-1 text-sm text-slate-500">Programme numbering starts from 211.</p>
        </div>
        <button onClick={openAdd} className="btn btn-primary">+ Add Programme</button>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>}

      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search programme number, name or code..." className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-teal-500" />
      </div>

      {loading ? <div className="flex justify-center py-12"><div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" /></div> :
        filtered.length === 0 ? <div className="card py-12 text-center"><p className="font-semibold text-slate-700">No programmes found</p><button onClick={openAdd} className="btn btn-primary btn-sm mt-4">Add Programme</button></div> :
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filtered.map(p => <div key={p.id} className="rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex flex-wrap gap-2">
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-xs font-black text-blue-700">#{p.programmeNo || "—"}</span>
                    <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">{p.status}</span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold text-slate-900">{p.name}</h2>
                  {p.code && <p className="mt-1 text-xs font-bold uppercase tracking-wider text-teal-700">Code: {p.code}</p>}
                </div>
                <div className="flex h-11 w-11 flex-col items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                  <span className="text-base font-black">{p.studentCount ?? 0}</span>
                  <span className="text-[8px] font-bold uppercase tracking-wide">Students</span>
                </div>
              </div>
              {p.description && <p className="mt-3 text-sm text-slate-600">{p.description}</p>}
              <div className="mt-4 flex flex-wrap gap-2">
                {p.duration && <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-xs text-slate-600">{p.duration}</span>}
                <span className="rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">{p.semesters.length} Semesters</span>
              </div>
            </div>
            <div className="p-5">
              <h3 className="mb-3 text-sm font-bold text-slate-800">Semester Structure</h3>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {p.semesters.map(s => <div key={s.id} className="rounded-xl border bg-slate-50 px-3 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">Semester</p>
                  <p className="mt-1 font-bold text-slate-800">{s.semesterNo}</p>
                  <p className="truncate text-xs text-slate-500">{s.name}</p>
                </div>)}
              </div>
              <div className="mt-5 flex justify-end gap-2 border-t pt-3">
                <a href={`/dashboard/programmes/${p.id}/syllabus`} className="btn btn-outline btn-sm text-teal-700">Manage Syllabus</a>
                <button onClick={() => removeProgramme(p.id, p.name)} disabled={deleting === p.id} className="btn btn-ghost btn-sm text-red-600">{deleting === p.id ? "Deleting..." : "Delete"}</button>
              </div>
            </div>
          </div>)}
        </div>
      }

      {show && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
        <div className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
          <div className="sticky top-0 z-10 flex items-center justify-between border-b bg-white p-5">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Add New Programme</h2>
              <p className="text-xs text-slate-500">Programme create করার সময়ই semester-wise syllabus/class যোগ করুন।</p>
            </div>
            <button onClick={() => !saving && setShow(false)} className="btn btn-ghost btn-sm">✕</button>
          </div>

          <form onSubmit={submit} className="p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div><label className="form-label">Programme No *</label><input type="number" min="211" className="form-input font-bold" value={form.programmeNo} onChange={e => setForm({ ...form, programmeNo: e.target.value })} required /></div>
              <div><label className="form-label">Programme Name *</label><input className="form-input" placeholder="Graphic Design With AI" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required /></div>
              <div><label className="form-label">Programme Code</label><input className="form-input uppercase" placeholder="GDWAI" value={form.code} onChange={e => setForm({ ...form, code: e.target.value.toUpperCase() })} /><p className="mt-1 text-xs text-slate-400">Empty রাখলে automatic code হবে.</p></div>
              <div><label className="form-label">Duration</label><input className="form-input" placeholder="e.g. 1 Year" value={form.duration} onChange={e => setForm({ ...form, duration: e.target.value })} /></div>
              <div><label className="form-label">Semesters *</label><select className="form-select" value={form.semesterCount} onChange={e => changeSemesterCount(e.target.value)}>{Array.from({ length: 27 }, (_, i) => i + 4).map(n => <option key={n} value={n}>{n} Semesters</option>)}</select></div>
              <div className="sm:col-span-2 lg:col-span-1"><label className="form-label">Description</label><input className="form-input" placeholder="Short description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div>
            </div>

            <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50/40 p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <h3 className="font-bold text-slate-900">Semester-wise Syllabus / Classes</h3>
                  <p className="text-xs text-slate-500">{semesterDrafts.length} semesters · {totalDraftClasses} class titles added</p>
                </div>
                <button type="button" onClick={loadWebDesignTemplate} className="btn btn-outline btn-sm text-teal-700">Load Web Design with AI (40 Classes)</button>
              </div>
              <div className="mt-4 space-y-4">
                {semesterDrafts.map(s => <details key={s.semesterNo} open={s.semesterNo === 1} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
                  <summary className="cursor-pointer list-none border-b bg-slate-50 px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">Semester {s.semesterNo}</span>
                      <span className="text-xs font-semibold text-teal-700">{s.classes.filter(c => c.title.trim()).length}/{s.classes.length} classes filled</span>
                    </div>
                  </summary>
                  <div className="space-y-3 p-4">
                    {s.classes.map((c, index) => <div key={index} className="rounded-xl border border-slate-200 bg-slate-50/60 p-3">
                      <div className="grid grid-cols-1 gap-3 lg:grid-cols-[70px_1fr_180px_120px_120px_auto]">
                        <div><label className="form-label">Class</label><div className="rounded-xl border bg-white px-3 py-2.5 text-sm font-black text-teal-700">{c.classNo}</div></div>
                        <div><label className="form-label">Class Title *</label><input className="form-input" placeholder="Class title / topic" value={c.title} onChange={e => updateClass(s.semesterNo, index, { title: e.target.value })} /></div>
                        <div><label className="form-label">Date</label><input type="date" className="form-input" value={c.scheduledDate} onChange={e => updateClass(s.semesterNo, index, { scheduledDate: e.target.value })} /></div>
                        <div><label className="form-label">Start</label><input type="time" className="form-input" value={c.startTime} onChange={e => updateClass(s.semesterNo, index, { startTime: e.target.value })} /></div>
                        <div><label className="form-label">End</label><input type="time" className="form-input" value={c.endTime} onChange={e => updateClass(s.semesterNo, index, { endTime: e.target.value })} /></div>
                        <div className="flex items-end"><button type="button" onClick={() => removeClass(s.semesterNo, index)} className="btn btn-ghost btn-sm text-red-600">Remove</button></div>
                      </div>
                      <div className="mt-2"><label className="form-label">Class Description / Notes</label><input className="form-input" placeholder="Optional description, tools, topics..." value={c.description} onChange={e => updateClass(s.semesterNo, index, { description: e.target.value })} /></div>
                    </div>)}
                    <button type="button" onClick={() => addClass(s.semesterNo)} className="btn btn-outline btn-sm">+ Add Class to Semester {s.semesterNo}</button>
                  </div>
                </details>)}
              </div>
            </div>

            <div className="mt-6 flex justify-end gap-3 border-t pt-5">
              <button type="button" onClick={() => !saving && setShow(false)} className="btn btn-outline">Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Creating Programme..." : `Create Programme + ${totalDraftClasses} Classes`}</button>
            </div>
          </form>
        </div>
      </div>}
    </div>
  </div>;
}

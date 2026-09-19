"use client";

import { useEffect, useMemo, useState } from "react";

type Ad = {
  platform: string;
  campaignName: string;
  amount: string;
  leadsCount: string;
  clicks: string;
  impressions: string;
  enrollmentsCount: string;
  note: string;
};

type Report = {
  id: string;
  report_date: string;
  summary: string | null;
  tasks_completed: string | null;
  posts_count: number;
  videos_count: number;
  creatives_count: number;
  leads_count: number;
  enrollments_count: number;
  messages_count: number;
  calls_count: number;
  website_visits: number;
  impressions: number;
  clicks: number;
  budget: string;
  budget_spent: string;
  notes: string | null;
  staff_name?: string;
  ads: any[];
};

const emptyAd = (): Ad => ({
  platform: "",
  campaignName: "",
  amount: "",
  leadsCount: "0",
  clicks: "0",
  impressions: "0",
  enrollmentsCount: "0",
  note: "",
});

const initialForm = {
  reportDate: new Date().toISOString().slice(0, 10),
  summary: "",
  tasksCompleted: "",
  postsCount: "0",
  videosCount: "0",
  creativesCount: "0",
  leadsCount: "0",
  enrollmentsCount: "0",
  messagesCount: "0",
  callsCount: "0",
  websiteVisits: "0",
  impressions: "0",
  clicks: "0",
  budget: "0",
  budgetSpent: "0",
  notes: "",
};

const money = (value: number | string) => `৳${Number(value || 0).toLocaleString("en-BD")}`;
const num = (value: number | string) => Number(value || 0).toLocaleString("en-BD");

export default function DigitalMarketerPage() {
  const [reports, setReports] = useState<Report[]>([]);
  const [staff, setStaff] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(initialForm);
  const [ads, setAds] = useState<Ad[]>([emptyAd()]);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [viewReport, setViewReport] = useState<Report | null>(null);

  async function loadReports() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (from && to) {
        params.set("from", from);
        params.set("to", to);
      }
      const res = await fetch("/api/digital-marketer/reports?" + params.toString(), { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load reports");
      setReports(data.reports || []);
      setStaff(data.staff || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load reports");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadReports();
  }, [from, to]);

  function setField(key: keyof typeof initialForm, value: string) {
    setForm((old) => ({ ...old, [key]: value }));
  }

  function updateAd(index: number, key: keyof Ad, value: string) {
    setAds((old) => old.map((ad, i) => (i === index ? { ...ad, [key]: value } : ad)));
  }

  async function submitReport(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/digital-marketer/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, ads }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not save report");
      setShowForm(false);
      setForm({ ...initialForm, reportDate: form.reportDate });
      setAds([emptyAd()]);
      await loadReports();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save report");
    } finally {
      setSaving(false);
    }
  }

  const totals = useMemo(
    () =>
      reports.reduce(
        (a, r) => ({
          posts: a.posts + Number(r.posts_count || 0),
          videos: a.videos + Number(r.videos_count || 0),
          leads: a.leads + Number(r.leads_count || 0),
          enrollments: a.enrollments + Number(r.enrollments_count || 0),
          messages: a.messages + Number(r.messages_count || 0),
          calls: a.calls + Number(r.calls_count || 0),
          spent: a.spent + Number(r.budget_spent || 0),
          budget: a.budget + Number(r.budget || 0),
          impressions: a.impressions + Number(r.impressions || 0),
          clicks: a.clicks + Number(r.clicks || 0),
        }),
        { posts: 0, videos: 0, leads: 0, enrollments: 0, messages: 0, calls: 0, spent: 0, budget: 0, impressions: 0, clicks: 0 }
      ),
    [reports]
  );

  const platformStats = useMemo(() => {
    const map = new Map<string, { spend: number; leads: number; enrollments: number; clicks: number; impressions: number }>();
    reports.forEach((r) =>
      (r.ads || []).forEach((a: any) => {
        const key = a.platform || "Other";
        const current = map.get(key) || { spend: 0, leads: 0, enrollments: 0, clicks: 0, impressions: 0 };
        current.spend += Number(a.amount || 0);
        current.leads += Number(a.leads_count || 0);
        current.enrollments += Number(a.enrollments_count || 0);
        current.clicks += Number(a.clicks || 0);
        current.impressions += Number(a.impressions || 0);
        map.set(key, current);
      })
    );
    return Array.from(map.entries()).sort((a, b) => b[1].spend - a[1].spend);
  }, [reports]);

  const recent = reports.slice(0, 7);
  const budgetPercent = totals.budget > 0 ? Math.min(100, Math.round((totals.spent / totals.budget) * 100)) : 0;
  const conversion = totals.leads > 0 ? ((totals.enrollments / totals.leads) * 100).toFixed(1) : "0.0";
  const maxDaily = Math.max(1, ...recent.map((r) => Number(r.leads_count || 0)));

  return (
    <div className="space-y-5">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-11 h-11 rounded-xl bg-blue-600 text-white grid place-items-center text-xs font-bold shadow-sm">DM</span>
            <div>
              <h1 className="page-title">Digital Marketing</h1>
              <p className="text-sm text-slate-500">{staff?.name ? `Daily performance report for ${staff.name}` : "Marketing performance & daily reports"}</p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-600">
            <span>📅</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="outline-none bg-transparent" />
            <span className="text-slate-300">→</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="outline-none bg-transparent" />
          </div>
          <button className="btn btn-primary shadow-sm" onClick={() => { setError(""); setShowForm(true); }}>+ Add Daily Report</button>
        </div>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 xl:grid-cols-5 gap-4">
        {[
          ["Posts", totals.posts, "📝", "Content published"],
          ["Videos", totals.videos, "🎬", "Videos added"],
          ["Leads", totals.leads, "👥", "Leads generated"],
          ["Enrollments", totals.enrollments, "🎓", "New enrollments"],
          ["Ad Spend", money(totals.spent), "💰", `${budgetPercent}% of budget`],
        ].map(([label, value, icon, sub]) => (
          <div key={String(label)} className="relative overflow-hidden bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="h-1 absolute left-0 top-0 w-full bg-blue-600 rounded-t-2xl" />
            <div className="flex items-start justify-between">
              <span className="w-9 h-9 rounded-xl bg-slate-100 grid place-items-center text-sm">{icon}</span>
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-4">{label}</p>
            <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
            <p className="text-[11px] text-slate-400 mt-1">{sub}</p>
          </div>
        ))}
      </div>

      <div className="grid xl:grid-cols-[minmax(0,1.65fr)_minmax(300px,.85fr)] gap-5">
        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-slate-800">Performance Overview</h2>
                <p className="text-xs text-slate-400 mt-1">Leads and enrollments from your daily reports</p>
              </div>
              <button className="btn btn-outline btn-sm" onClick={() => { setFrom(""); setTo(""); }}>All Time</button>
            </div>
            {recent.length === 0 ? (
              <div className="h-48 grid place-items-center text-sm text-slate-400">Add your first daily report to see performance here.</div>
            ) : (
              <div className="h-48 flex items-end gap-3 px-2">
                {recent.slice().reverse().map((r) => {
                  const leadH = Math.max(6, (Number(r.leads_count || 0) / maxDaily) * 135);
                  const enrollH = Math.max(4, (Number(r.enrollments_count || 0) / maxDaily) * 135);
                  return (
                    <div key={r.id} className="flex-1 h-full flex flex-col justify-end items-center gap-2">
                      <div className="w-full flex items-end justify-center gap-1 h-36">
                        <div title={`Leads: ${r.leads_count}`} className="w-1/3 max-w-8 rounded-t-md bg-blue-500" style={{ height: leadH }} />
                        <div title={`Enrollments: ${r.enrollments_count}`} className="w-1/3 max-w-8 rounded-t-md bg-emerald-400" style={{ height: enrollH }} />
                      </div>
                      <span className="text-[10px] text-slate-400">{new Date(r.report_date).toLocaleDateString("en-BD", { day: "2-digit", month: "short" })}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="flex gap-5 mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500">
              <span><i className="inline-block w-2 h-2 rounded-full bg-blue-500 mr-1" /> Leads</span>
              <span><i className="inline-block w-2 h-2 rounded-full bg-emerald-400 mr-1" /> Enrollments</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-800">Conversion Summary</h2>
            <p className="text-xs text-slate-400 mt-1">From generated leads to enrollment</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-5">
              {[
                ["Leads", totals.leads, "👥"],
                ["Messages", totals.messages, "💬"],
                ["Calls", totals.calls, "☎️"],
                ["Enrollments", totals.enrollments, "🎓"],
              ].map(([label, value, icon], i) => (
                <div key={String(label)} className="relative">
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-lg">{icon}</span>
                    <p className="text-xs text-slate-500 mt-2">{label}</p>
                    <p className="text-xl font-bold text-slate-800">{num(value as number)}</p>
                  </div>
                  {i < 3 && <span className="hidden md:block absolute -right-2 top-1/2 text-slate-300">→</span>}
                </div>
              ))}
            </div>
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500">Lead → Enrollment conversion</span>
              <b className="text-blue-600">{conversion}%</b>
            </div>
            <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, Number(conversion))}%` }} /></div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-5 flex items-center justify-between border-b border-slate-100">
              <div><h2 className="font-bold text-slate-800">Recent Daily Reports</h2><p className="text-xs text-slate-400 mt-1">Your latest submitted work</p></div>
              <span className="text-xs text-slate-400">{reports.length} reports</span>
            </div>
            {loading ? <div className="py-12 text-center text-slate-400">Loading...</div> : reports.length === 0 ? (
              <div className="py-12 text-center text-slate-400">No daily reports yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead><tr><th>Date</th><th>Posts</th><th>Videos</th><th>Leads</th><th>Enrollments</th><th>Spend</th><th>View</th></tr></thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id}>
                        <td className="font-medium">{new Date(r.report_date).toLocaleDateString("en-BD", { day: "2-digit", month: "short", year: "numeric" })}</td>
                        <td>{r.posts_count}</td><td>{r.videos_count}</td><td>{r.leads_count}</td><td>{r.enrollments_count}</td>
                        <td>{money(r.budget_spent)}</td>
                        <td><button className="text-xs font-semibold text-blue-600 hover:underline" onClick={() => setViewReport(r)}>{expanded === r.id ? "Hide" : "View"}</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {expanded && (() => {
            const r = reports.find((x) => x.id === expanded);
            if (!r) return null;
            return (
              <div className="bg-white border border-blue-100 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between gap-4"><div><h2 className="font-bold text-slate-800">{new Date(r.report_date).toLocaleDateString("en-BD", { day: "2-digit", month: "long", year: "numeric" })}</h2><p className="text-xs text-slate-400 mt-1">{r.staff_name || staff?.name || "Digital Marketer"}</p></div><button className="btn btn-ghost btn-sm" onClick={() => setExpanded(null)}>✕</button></div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-5">
                  {[
                    ["Creatives", r.creatives_count], ["Messages", r.messages_count], ["Calls", r.calls_count], ["Clicks", r.clicks], ["Impressions", r.impressions],
                  ].map(([label, value]) => <div key={String(label)} className="p-3 rounded-xl bg-slate-50"><p className="text-xs text-slate-500">{label}</p><b className="text-lg text-slate-800">{num(value as number)}</b></div>)}
                </div>
                {r.summary && <div className="mt-5"><p className="text-xs font-semibold text-slate-500">Daily Summary</p><p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{r.summary}</p></div>}
                {r.tasks_completed && <div className="mt-4"><p className="text-xs font-semibold text-slate-500">Work Completed</p><p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{r.tasks_completed}</p></div>}
                {r.ads?.length > 0 && <div className="mt-5"><p className="font-semibold text-sm text-slate-700 mb-2">Platform-wise Ads</p><div className="overflow-x-auto"><table className="w-full"><thead><tr><th>Platform</th><th>Campaign</th><th>Spend</th><th>Leads</th><th>Clicks</th><th>Enrollments</th></tr></thead><tbody>{r.ads.map((a: any, i: number) => <tr key={a.id || i}><td>{a.platform}</td><td>{a.campaign_name || "—"}</td><td>{money(a.amount)}</td><td>{a.leads_count}</td><td>{a.clicks}</td><td>{a.enrollments_count}</td></tr>)}</tbody></table></div></div>}
                {r.notes && <div className="mt-4"><p className="text-xs font-semibold text-slate-500">Notes / Tomorrow's Plan</p><p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{r.notes}</p></div>}
              </div>
            );
          })()}
        </div>

        <div className="space-y-5">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-800">Platform Performance</h2>
            <p className="text-xs text-slate-400 mt-1">Ad spend & results by platform</p>
            <div className="space-y-4 mt-5">
              {platformStats.length === 0 ? <p className="text-sm text-slate-400 py-6 text-center">No platform data yet.</p> : platformStats.map(([platform, s]) => (
                <div key={platform}>
                  <div className="flex items-center justify-between gap-3">
                    <div><p className="text-sm font-semibold text-slate-700">{platform}</p><p className="text-[11px] text-slate-400">{s.leads} leads · {s.enrollments} enrollments</p></div>
                    <b className="text-sm text-slate-800">{money(s.spend)}</b>
                  </div>
                  <div className="h-2 bg-slate-100 rounded-full mt-2 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${Math.min(100, totals.spent ? (s.spend / totals.spent) * 100 : 0)}%` }} /></div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center justify-between"><div><h2 className="font-bold text-slate-800">Budget Overview</h2><p className="text-xs text-slate-400 mt-1">Total budget vs. spent</p></div><span className="text-lg font-bold text-blue-600">{budgetPercent}%</span></div>
            <div className="h-3 bg-slate-100 rounded-full mt-5 overflow-hidden"><div className="h-full bg-blue-500 rounded-full" style={{ width: `${budgetPercent}%` }} /></div>
            <div className="grid grid-cols-2 gap-4 mt-5">
              <div><p className="text-[11px] text-slate-400">Total Budget</p><b className="text-base text-slate-800">{money(totals.budget)}</b></div>
              <div><p className="text-[11px] text-slate-400">Total Spent</p><b className="text-base text-slate-800">{money(totals.spent)}</b></div>
              <div><p className="text-[11px] text-slate-400">Remaining</p><b className="text-base text-emerald-600">{money(Math.max(0, totals.budget - totals.spent))}</b></div>
              <div><p className="text-[11px] text-slate-400">Clicks</p><b className="text-base text-slate-800">{num(totals.clicks)}</b></div>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
            <h2 className="font-bold text-slate-800">Quick Stats</h2>
            <div className="space-y-3 mt-4">
              <div className="flex justify-between text-sm"><span className="text-slate-500">Website visits</span><b>{num(reports.reduce((a, r) => a + Number(r.website_visits || 0), 0))}</b></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Impressions</span><b>{num(totals.impressions)}</b></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Creatives</span><b>{num(reports.reduce((a, r) => a + Number(r.creatives_count || 0), 0))}</b></div>
              <div className="flex justify-between text-sm"><span className="text-slate-500">Reports submitted</span><b>{reports.length}</b></div>
            </div>
          </div>
        </div>
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm p-3 sm:p-6 overflow-y-auto">
          <div className="max-w-5xl mx-auto bg-white rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white z-10">
              <div><h2 className="text-lg font-bold text-slate-800">Add Daily Marketing Report</h2><p className="text-xs text-slate-400 mt-1">One report per staff member per day. Saving again updates that day.</p></div>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
            </div>

            <form onSubmit={submitReport} className="p-5 space-y-6">
              <section>
                <div className="flex items-center gap-2 mb-3"><span className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 grid place-items-center text-xs font-bold">1</span><h3 className="font-bold text-slate-800">Daily Activity</h3></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className="form-label">Report Date *</label><input type="date" className="form-input" value={form.reportDate} onChange={(e) => setField("reportDate", e.target.value)} required /></div>
                  <div><label className="form-label">Posts Published</label><input type="number" min="0" className="form-input" value={form.postsCount} onChange={(e) => setField("postsCount", e.target.value)} /></div>
                  <div><label className="form-label">Videos Added</label><input type="number" min="0" className="form-input" value={form.videosCount} onChange={(e) => setField("videosCount", e.target.value)} /></div>
                  <div><label className="form-label">Creatives Designed</label><input type="number" min="0" className="form-input" value={form.creativesCount} onChange={(e) => setField("creativesCount", e.target.value)} /></div>
                </div>
                <div className="grid md:grid-cols-2 gap-3 mt-3">
                  <div><label className="form-label">What did you do today?</label><textarea className="form-input min-h-24" placeholder="Content planning, posting, campaign setup, community management..." value={form.tasksCompleted} onChange={(e) => setField("tasksCompleted", e.target.value)} /></div>
                  <div><label className="form-label">Daily Summary</label><textarea className="form-input min-h-24" placeholder="Short overview of today's marketing work..." value={form.summary} onChange={(e) => setField("summary", e.target.value)} /></div>
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2 mb-3"><span className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 grid place-items-center text-xs font-bold">2</span><h3 className="font-bold text-slate-800">Leads & Conversion</h3></div>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[["leadsCount","Leads Generated"],["enrollmentsCount","Enrollments"],["messagesCount","Messages"],["callsCount","Calls"],["websiteVisits","Website Visits"]].map(([key,label]) => <div key={key}><label className="form-label">{label}</label><input type="number" min="0" className="form-input" value={form[key as keyof typeof form]} onChange={(e) => setField(key as keyof typeof initialForm, e.target.value)} /></div>)}
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <div className="flex items-center gap-2 mb-3"><span className="w-7 h-7 rounded-lg bg-amber-50 text-amber-600 grid place-items-center text-xs font-bold">3</span><h3 className="font-bold text-slate-800">Budget & Ads</h3></div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><label className="form-label">Total Budget (৳)</label><input type="number" min="0" step="0.01" className="form-input" value={form.budget} onChange={(e) => setField("budget", e.target.value)} /></div>
                  <div><label className="form-label">Total Spent (৳)</label><input type="number" min="0" step="0.01" className="form-input" value={form.budgetSpent} onChange={(e) => setField("budgetSpent", e.target.value)} /></div>
                  <div><label className="form-label">Total Impressions</label><input type="number" min="0" className="form-input" value={form.impressions} onChange={(e) => setField("impressions", e.target.value)} /></div>
                  <div><label className="form-label">Total Clicks</label><input type="number" min="0" className="form-input" value={form.clicks} onChange={(e) => setField("clicks", e.target.value)} /></div>
                </div>
                <div className="flex items-center justify-between mt-5 mb-3"><div><h4 className="font-semibold text-slate-700">Platform-wise Ads</h4><p className="text-xs text-slate-400">Track each campaign separately.</p></div><button type="button" className="btn btn-outline btn-sm" onClick={() => setAds([...ads, emptyAd()])}>+ Add Platform</button></div>
                <div className="space-y-3">
                  {ads.map((ad, i) => (
                    <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                        <div><label className="form-label">Platform *</label><input className="form-input" placeholder="Facebook / Instagram / Google / TikTok" value={ad.platform} onChange={(e) => updateAd(i,"platform",e.target.value)} /></div>
                        <div><label className="form-label">Campaign</label><input className="form-input" placeholder="Campaign name" value={ad.campaignName} onChange={(e) => updateAd(i,"campaignName",e.target.value)} /></div>
                        <div><label className="form-label">Spend (৳)</label><input type="number" min="0" step="0.01" className="form-input" value={ad.amount} onChange={(e) => updateAd(i,"amount",e.target.value)} /></div>
                        <div><label className="form-label">Leads</label><input type="number" min="0" className="form-input" value={ad.leadsCount} onChange={(e) => updateAd(i,"leadsCount",e.target.value)} /></div>
                        <div><label className="form-label">Clicks</label><input type="number" min="0" className="form-input" value={ad.clicks} onChange={(e) => updateAd(i,"clicks",e.target.value)} /></div>
                        <div><label className="form-label">Impressions</label><input type="number" min="0" className="form-input" value={ad.impressions} onChange={(e) => updateAd(i,"impressions",e.target.value)} /></div>
                        <div><label className="form-label">Enrollments</label><input type="number" min="0" className="form-input" value={ad.enrollmentsCount} onChange={(e) => updateAd(i,"enrollmentsCount",e.target.value)} /></div>
                        <div className="flex items-end gap-2"><input className="form-input" placeholder="Note" value={ad.note} onChange={(e) => updateAd(i,"note",e.target.value)} />{ads.length > 1 && <button type="button" className="btn btn-sm text-red-600 border border-red-200" onClick={() => setAds(ads.filter((_,j)=>j!==i))}>Remove</button>}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="border-t border-slate-100 pt-5">
                <label className="form-label">Notes / Tomorrow's Plan</label>
                <textarea className="form-input min-h-24" placeholder="Problems, learnings, follow-up plan..." value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
              </section>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
                <button type="submit" disabled={saving} className="btn btn-primary min-w-32">{saving ? "Saving..." : "Save Daily Report"}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

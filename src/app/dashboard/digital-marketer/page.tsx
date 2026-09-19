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
  ads: Ad[];
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

  const totals = useMemo(() => reports.reduce((a, r) => ({
    posts: a.posts + Number(r.posts_count || 0),
    videos: a.videos + Number(r.videos_count || 0),
    leads: a.leads + Number(r.leads_count || 0),
    enrollments: a.enrollments + Number(r.enrollments_count || 0),
    spent: a.spent + Number(r.budget_spent || 0),
  }), { posts: 0, videos: 0, leads: 0, enrollments: 0, spent: 0 }), [reports]);

  return (
    <div className="space-y-6">
      <div className="page-header">
        <div>
          <h1 className="page-title">Digital Marketing</h1>
          <p className="text-sm text-slate-500">
            {staff?.name ? `Daily performance report for ${staff.name}` : "Marketing performance & daily reports"}
          </p>
        </div>
        <button className="btn btn-primary" onClick={() => { setError(""); setShowForm(true); }}>
          + Add Daily Report
        </button>
      </div>

      {error && <div className="p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          ["Posts", totals.posts],
          ["Videos", totals.videos],
          ["Leads", totals.leads],
          ["Enrollments", totals.enrollments],
          ["Ad Spend", `৳${totals.spent.toLocaleString()}`],
        ].map(([label, value]) => (
          <div key={String(label)} className="card">
            <p className="text-xs text-slate-500">{label}</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{value}</p>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label className="form-label">From</label>
            <input type="date" className="form-input" value={from} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div>
            <label className="form-label">To</label>
            <input type="date" className="form-input" value={to} onChange={(e) => setTo(e.target.value)} />
          </div>
          <button className="btn btn-outline" onClick={() => { setFrom(""); setTo(""); }}>All Reports</button>
        </div>
      </div>

      {showForm && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-slate-800">Daily Marketing Report</h2>
              <p className="text-xs text-slate-500 mt-1">One report per staff member per day. Saving again updates that day.</p>
            </div>
            <button className="btn btn-ghost btn-sm" onClick={() => setShowForm(false)}>✕</button>
          </div>

          <form onSubmit={submitReport} className="space-y-5">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="form-label">Report Date *</label>
                <input type="date" className="form-input" value={form.reportDate} onChange={(e) => setField("reportDate", e.target.value)} required />
              </div>
              <div><label className="form-label">Posts Published</label><input type="number" min="0" className="form-input" value={form.postsCount} onChange={(e) => setField("postsCount", e.target.value)} /></div>
              <div><label className="form-label">Videos Added</label><input type="number" min="0" className="form-input" value={form.videosCount} onChange={(e) => setField("videosCount", e.target.value)} /></div>
              <div><label className="form-label">Creatives Designed</label><input type="number" min="0" className="form-input" value={form.creativesCount} onChange={(e) => setField("creativesCount", e.target.value)} /></div>
            </div>

            <div>
              <label className="form-label">What did you do today?</label>
              <textarea className="form-input min-h-24" placeholder="Content planning, posting, campaign setup, community management..." value={form.tasksCompleted} onChange={(e) => setField("tasksCompleted", e.target.value)} />
            </div>

            <div>
              <label className="form-label">Daily Summary</label>
              <textarea className="form-input min-h-20" placeholder="Short overview of today's marketing work..." value={form.summary} onChange={(e) => setField("summary", e.target.value)} />
            </div>

            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Leads & Conversion</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {[
                  ["leadsCount", "Leads Generated"], ["enrollmentsCount", "Enrollments"],
                  ["messagesCount", "Messages"], ["callsCount", "Calls"], ["websiteVisits", "Website Visits"],
                ].map(([key, label]) => (
                  <div key={key}><label className="form-label">{label}</label><input type="number" min="0" className="form-input" value={form[key as keyof typeof form]} onChange={(e) => setField(key as keyof typeof initialForm, e.target.value)} /></div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-semibold text-slate-700 mb-3">Overall Ads & Budget</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div><label className="form-label">Total Budget (৳)</label><input type="number" min="0" step="0.01" className="form-input" value={form.budget} onChange={(e) => setField("budget", e.target.value)} /></div>
                <div><label className="form-label">Total Spent (৳)</label><input type="number" min="0" step="0.01" className="form-input" value={form.budgetSpent} onChange={(e) => setField("budgetSpent", e.target.value)} /></div>
                <div><label className="form-label">Total Impressions</label><input type="number" min="0" className="form-input" value={form.impressions} onChange={(e) => setField("impressions", e.target.value)} /></div>
                <div><label className="form-label">Total Clicks</label><input type="number" min="0" className="form-input" value={form.clicks} onChange={(e) => setField("clicks", e.target.value)} /></div>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-slate-700">Platform-wise Ads</h3>
                <button type="button" className="btn btn-outline btn-sm" onClick={() => setAds([...ads, emptyAd()])}>+ Add Platform</button>
              </div>
              <div className="space-y-3">
                {ads.map((ad, i) => (
                  <div key={i} className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div><label className="form-label">Platform *</label><input className="form-input" placeholder="Facebook / Instagram / Google / TikTok" value={ad.platform} onChange={(e) => { const x=[...ads]; x[i]={...x[i],platform:e.target.value}; setAds(x); }} /></div>
                      <div><label className="form-label">Campaign</label><input className="form-input" placeholder="Campaign name" value={ad.campaignName} onChange={(e) => { const x=[...ads]; x[i]={...x[i],campaignName:e.target.value}; setAds(x); }} /></div>
                      <div><label className="form-label">Spend (৳)</label><input type="number" min="0" step="0.01" className="form-input" value={ad.amount} onChange={(e) => { const x=[...ads]; x[i]={...x[i],amount:e.target.value}; setAds(x); }} /></div>
                      <div><label className="form-label">Leads</label><input type="number" min="0" className="form-input" value={ad.leadsCount} onChange={(e) => { const x=[...ads]; x[i]={...x[i],leadsCount:e.target.value}; setAds(x); }} /></div>
                      <div><label className="form-label">Clicks</label><input type="number" min="0" className="form-input" value={ad.clicks} onChange={(e) => { const x=[...ads]; x[i]={...x[i],clicks:e.target.value}; setAds(x); }} /></div>
                      <div><label className="form-label">Impressions</label><input type="number" min="0" className="form-input" value={ad.impressions} onChange={(e) => { const x=[...ads]; x[i]={...x[i],impressions:e.target.value}; setAds(x); }} /></div>
                      <div><label className="form-label">Enrollments</label><input type="number" min="0" className="form-input" value={ad.enrollmentsCount} onChange={(e) => { const x=[...ads]; x[i]={...x[i],enrollmentsCount:e.target.value}; setAds(x); }} /></div>
                      <div className="flex items-end gap-2"><input className="form-input" placeholder="Note" value={ad.note} onChange={(e) => { const x=[...ads]; x[i]={...x[i],note:e.target.value}; setAds(x); }} />{ads.length > 1 && <button type="button" className="btn btn-sm text-red-600 border border-red-200" onClick={() => setAds(ads.filter((_,j)=>j!==i))}>Remove</button>}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="form-label">Notes / Tomorrow's Plan</label>
              <textarea className="form-input min-h-20" placeholder="Problems, learnings, follow-up plan..." value={form.notes} onChange={(e) => setField("notes", e.target.value)} />
            </div>

            <div className="flex justify-end gap-2">
              <button type="button" className="btn btn-outline" onClick={() => setShowForm(false)}>Cancel</button>
              <button type="submit" disabled={saving} className="btn btn-primary">{saving ? "Saving..." : "Save Daily Report"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-slate-700">Daily Reports</h2>
          <span className="text-xs text-slate-400">{reports.length} reports</span>
        </div>
        {loading ? <div className="py-10 text-center text-slate-400">Loading...</div> : reports.length === 0 ? <div className="py-10 text-center text-slate-400">No daily reports yet.</div> : (
          <div className="space-y-4">
            {reports.map((r) => (
              <details key={r.id} className="border border-slate-100 rounded-xl p-4">
                <summary className="cursor-pointer list-none">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div><p className="font-semibold text-slate-800">{new Date(r.report_date).toLocaleDateString("en-BD", { day:"2-digit", month:"long", year:"numeric" })}</p>{r.staff_name && <p className="text-xs text-slate-400">{r.staff_name}</p>}</div>
                    <div className="flex flex-wrap gap-2 text-xs">
                      <span className="badge badge-blue">Posts {r.posts_count}</span>
                      <span className="badge badge-blue">Videos {r.videos_count}</span>
                      <span className="badge badge-green">Leads {r.leads_count}</span>
                      <span className="badge badge-green">Enrollments {r.enrollments_count}</span>
                      <span className="badge badge-orange">Spend ৳{Number(r.budget_spent || 0).toLocaleString()}</span>
                    </div>
                  </div>
                </summary>
                <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
                  {r.summary && <div><p className="text-xs font-semibold text-slate-500">Summary</p><p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{r.summary}</p></div>}
                  {r.tasks_completed && <div><p className="text-xs font-semibold text-slate-500">Work Completed</p><p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{r.tasks_completed}</p></div>}
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                    <div className="p-3 bg-slate-50 rounded-lg">Creatives <b>{r.creatives_count}</b></div>
                    <div className="p-3 bg-slate-50 rounded-lg">Messages <b>{r.messages_count}</b></div>
                    <div className="p-3 bg-slate-50 rounded-lg">Calls <b>{r.calls_count}</b></div>
                    <div className="p-3 bg-slate-50 rounded-lg">Clicks <b>{r.clicks}</b></div>
                    <div className="p-3 bg-slate-50 rounded-lg">Impressions <b>{r.impressions}</b></div>
                  </div>
                  {r.ads?.length > 0 && <div><p className="font-semibold text-sm text-slate-700 mb-2">Platform-wise Ads</p><div className="overflow-x-auto"><table><thead><tr><th>Platform</th><th>Campaign</th><th>Spend</th><th>Leads</th><th>Clicks</th><th>Enrollments</th></tr></thead><tbody>{r.ads.map((a:any)=><tr key={a.id}><td>{a.platform}</td><td>{a.campaign_name || "—"}</td><td>৳{Number(a.amount || 0).toLocaleString()}</td><td>{a.leads_count}</td><td>{a.clicks}</td><td>{a.enrollments_count}</td></tr>)}</tbody></table></div></div>}
                  {r.notes && <div><p className="text-xs font-semibold text-slate-500">Notes / Plan</p><p className="text-sm text-slate-700 whitespace-pre-wrap mt-1">{r.notes}</p></div>}
                </div>
              </details>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { getInitials, formatCurrency, formatDate } from "@/lib/utils";

interface StaffMember {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  designation?: string | null;
  joiningDate?: string | null;
  salary?: string | null;
  status: string;
  deletedAt?: string | null;
}

export default function StaffBinPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchBin = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ search });
      const res = await fetch(`/api/staff/bin?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load bin");
      setStaffList(data.staff || []);
    } catch (error) {
      console.error("Failed to fetch staff bin:", error);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchBin();
  }, [fetchBin]);

  async function handlePermanentDelete(id: string, name: string) {
    const confirmed = confirm(
      `Permanently delete ${name}? This cannot be undone and the staff member will be removed from the Bin permanently.`
    );
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/staff/bin/${id}`, { method: "DELETE" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to permanently delete staff.");
        return;
      }
      await fetchBin();
    } catch (error) {
      console.error("Permanent delete error:", error);
      alert("Failed to permanently delete staff.");
    }
  }

  async function handleRestore(id: string) {
    if (!confirm("Restore this staff member to the active Staff list?")) return;

    try {
      const res = await fetch(`/api/staff/bin/${id}`, { method: "PATCH" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to restore staff.");
        return;
      }
      await fetchBin();
    } catch (error) {
      console.error("Restore error:", error);
      alert("Failed to restore staff.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff Bin</h1>
          <p className="text-sm text-slate-500">
            {staffList.length} deleted staff members
          </p>
        </div>

        <Link href="/dashboard/staff" className="btn btn-outline">
          ← Back to Staff
        </Link>
      </div>

      <div className="relative">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          className="form-input pl-9 max-w-xs"
          placeholder="Search deleted staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : staffList.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🗑️</div>
          <p className="text-slate-500">Staff Bin is empty</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.map((s) => (
            <div key={s.id} className="card">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-lg font-bold text-slate-600">
                    {getInitials(s.name)}
                  </div>
                  <div>
                    <p className="font-semibold text-slate-800">{s.name}</p>
                    <p className="text-sm text-slate-500">{s.designation || "Staff"}</p>
                  </div>
                </div>
                <span className="badge bg-slate-100 text-slate-600">BIN</span>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                {s.phone && <div className="text-slate-600">{s.phone}</div>}
                {s.email && <div className="text-slate-600">{s.email}</div>}
                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Salary</span>
                  <span className="font-semibold text-slate-700">
                    {s.salary ? formatCurrency(s.salary) : "—"}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Joined</span>
                  <span className="text-slate-600">{formatDate(s.joiningDate)}</span>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRestore(s.id)}
                  className="btn btn-outline btn-sm"
                >
                  Restore
                </button>
                <button
                  onClick={() => handlePermanentDelete(s.id, s.name)}
                  className="btn btn-sm border border-red-200 text-red-600 hover:bg-red-50"
                >
                  Delete Permanently
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

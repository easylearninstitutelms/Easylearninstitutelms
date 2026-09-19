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
}

export default function ArchivedStaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchArchived = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ search, status: "ARCHIVED" });
      const res = await fetch(`/api/staff?${params}`, { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load archived staff.");
      setStaffList(data.staff || []);
    } catch (error) {
      console.error("Failed to fetch archived staff:", error);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchArchived();
  }, [fetchArchived]);

  async function handleRestore(id: string) {
    if (!confirm("Restore this staff member to the active Staff list?")) return;
    const res = await fetch(`/api/staff/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "ACTIVE" }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data.error || "Failed to restore staff.");
      return;
    }
    await fetchArchived();
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Archived Staff</h1>
          <p className="text-sm text-slate-500">{staffList.length} archived staff members</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard/staff" className="btn btn-outline">Back to Staff</Link>
          <Link href="/dashboard/staff/bin" className="btn btn-outline">Bin</Link>
        </div>
      </div>
      <input
        className="form-input max-w-xs"
        placeholder="Search archived staff..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {loading ? (
        <div className="flex justify-center py-12">Loading...</div>
      ) : staffList.length === 0 ? (
        <div className="card text-center py-12">
          <p className="text-slate-500">No archived staff members</p>
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
                <span className="badge bg-slate-100 text-slate-600">ARCHIVED</span>
              </div>
              <div className="mt-4 space-y-2 text-sm">
                {s.phone && <div className="text-slate-600">{s.phone}</div>}
                {s.email && <div className="text-slate-600">{s.email}</div>}
                <div className="flex justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Salary</span>
                  <span className="font-semibold">{s.salary ? formatCurrency(s.salary) : "—"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Joined</span>
                  <span>{formatDate(s.joiningDate)}</span>
                </div>
              </div>
              <button onClick={() => handleRestore(s.id)} className="btn btn-outline btn-sm w-full mt-4">
                Restore to Active
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
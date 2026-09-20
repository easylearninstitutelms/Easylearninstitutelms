"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatusColor, formatDate } from "@/lib/utils";

interface InstituteRow {
  institute: { id: string; name: string; email: string; phone: string; type: string; status: string; createdAt: string };
  userCount: number;
  studentCount: number;
}

export default function AdminInstitutesPage() {
  const [institutes, setInstitutes] = useState<InstituteRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchInstitutes = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/admin/institutes");
    const data = await res.json();
    setInstitutes(data.institutes || []);
    setLoading(false);
  }, []);

  useEffect(() => { fetchInstitutes(); }, [fetchInstitutes]);

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/admin/institutes/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchInstitutes();
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">All Institutes</h1>
          <p className="text-sm text-slate-500">{institutes.length} institutes registered</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="card p-0">
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Institute</th>
                  <th>Type</th>
                  <th>Contact</th>
                  <th>Users</th>
                  <th>Students</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {institutes.map(row => (
                  <tr key={row.institute.id}>
                    <td>
                      <div>
                        <p className="font-semibold text-slate-800">{row.institute.name}</p>
                        <p className="text-xs text-slate-400">{row.institute.email}</p>
                      </div>
                    </td>
                    <td className="text-slate-500">{row.institute.type || "—"}</td>
                    <td className="text-slate-500">{row.institute.phone || "—"}</td>
                    <td><span className="badge badge-blue">{Number(row.userCount)}</span></td>
                    <td><span className="badge badge-green">{Number(row.studentCount)}</span></td>
                    <td><span className={`badge ${getStatusColor(row.institute.status)}`}>{row.institute.status}</span></td>
                    <td className="text-slate-500 text-xs">{formatDate(row.institute.createdAt)}</td>
                    <td>
                      <div className="flex gap-1">
                        {row.institute.status !== "SUSPENDED" ? (
                          <button
                            onClick={() => handleStatusChange(row.institute.id, "SUSPENDED")}
                            className="btn btn-ghost btn-sm text-red-500 hover:text-red-700"
                          >
                            Suspend
                          </button>
                        ) : (
                          <button
                            onClick={() => handleStatusChange(row.institute.id, "ACTIVE")}
                            className="btn btn-ghost btn-sm text-green-600 hover:text-green-800"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

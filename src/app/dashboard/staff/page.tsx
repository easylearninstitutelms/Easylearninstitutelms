"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  getStatusColor,
  getInitials,
  formatCurrency,
  formatDate,
} from "@/lib/utils";

interface StaffMember {
  id: string;
  name: string;
  phone: string;
  email: string;
  designation: string;
  joiningDate: string;
  salary: string;
  status: string;
}

interface CreatedAccount {
  userId: string;
  role: string;
  username: string;
  loginEmail: string;
  loginUrl: string;
  temporaryPassword: string;
}

export default function StaffPage() {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [copyMessage, setCopyMessage] = useState("");

  const [createdAccount, setCreatedAccount] =
    useState<CreatedAccount | null>(null);

  const [form, setForm] = useState({
    name: "",
    phone: "",
    email: "",
    designation: "",
    accountRole: "STAFF",
    joiningDate: new Date().toISOString().split("T")[0],
    salary: "",
    address: "",
  });

  const fetchStaff = useCallback(async () => {
    try {
      setLoading(true);

      const params = new URLSearchParams({ search });

      const res = await fetch(`/api/staff?${params}`);

      if (!res.ok) {
        throw new Error("Failed to load staff");
      }

      const data = await res.json();

      setStaffList(data.staff || []);
    } catch (err) {
      console.error("Failed to fetch staff:", err);
      setStaffList([]);
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  function resetForm() {
    setForm({
      name: "",
      phone: "",
      email: "",
      designation: "",
      accountRole: "STAFF",
      joiningDate: new Date().toISOString().split("T")[0],
      salary: "",
      address: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    setSubmitting(true);
    setError("");
    setCopyMessage("");

    try {
      const res = await fetch("/api/staff", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to add staff.");
        return;
      }

      setShowModal(false);

      resetForm();

      await fetchStaff();

      if (data.account) {
        setCreatedAccount(data.account);
        setShowAccountModal(true);
      }
    } catch (err) {
      console.error("Add staff error:", err);

      setError(
        "Something went wrong while creating the staff account."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCopy(text: string, label: string) {
    try {
      await navigator.clipboard.writeText(text);

      setCopyMessage(`${label} copied`);

      setTimeout(() => {
        setCopyMessage("");
      }, 2000);
    } catch (err) {
      console.error("Copy failed:", err);

      setCopyMessage("Copy failed");
    }
  }

  async function handleCopyAll() {
    if (!createdAccount) return;

    const loginLink =
      typeof window !== "undefined"
        ? `${window.location.origin}${createdAccount.loginUrl}`
        : createdAccount.loginUrl;

    const text = [
      "Easylearn Institute Login Details",
      "",
      `Role: ${createdAccount.role}`,
      `Username: ${createdAccount.username}`,
      `Password: ${createdAccount.temporaryPassword}`,
      `Login Link: ${loginLink}`,
    ].join("\n");

    await handleCopy(text, "Login details");
  }

  function getLoginLink() {
    if (!createdAccount) return "";

    if (
      createdAccount.loginUrl.startsWith("http://") ||
      createdAccount.loginUrl.startsWith("https://")
    ) {
      return createdAccount.loginUrl;
    }

    if (typeof window !== "undefined") {
      return `${window.location.origin}${createdAccount.loginUrl}`;
    }

    return createdAccount.loginUrl;
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this staff member? They will be removed from the active Staff list.")) return;

    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "ARCHIVED" }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to archive staff.");
        return;
      }

      await fetchStaff();
    } catch (err) {
      console.error("Archive error:", err);
      alert("Failed to archive staff.");
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Move this staff member to Bin? You can restore them later from Staff Bin.")) return;

    try {
      const res = await fetch(`/api/staff/${id}`, {
        method: "DELETE",
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data.error || "Failed to move staff to Bin.");
        return;
      }

      await fetchStaff();
    } catch (err) {
      console.error("Bin delete error:", err);
      alert("Failed to move staff to Bin.");
    }
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Staff</h1>

          <p className="text-sm text-slate-500">
            {staffList.length} staff members
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/dashboard/staff/bin" className="btn btn-outline">
            🗑️ Bin
          </Link>
          <button
            onClick={() => {
              setError("");
              setShowModal(true);
            }}
            className="btn btn-primary"
          >
          <svg
            className="w-4 h-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>

          Add Staff
          </button>
        </div>
      </div>

      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
          />
        </svg>

        <input
          className="form-input pl-9 max-w-xs"
          placeholder="Search staff..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {staffList.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-3">👩‍🏫</div>

              <p className="text-slate-500">
                No staff members found
              </p>

              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary btn-sm mt-4"
              >
                Add Staff
              </button>
            </div>
          ) : (
            staffList.map((s) => (
              <div key={s.id} className="card">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-purple-100 rounded-2xl flex items-center justify-center text-lg font-bold text-purple-600">
                      {getInitials(s.name)}
                    </div>

                    <div>
                      <p className="font-semibold text-slate-800">
                        {s.name}
                      </p>

                      <p className="text-sm text-slate-500">
                        {s.designation || "Staff"}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`badge ${getStatusColor(
                      s.status
                    )}`}
                  >
                    {s.status}
                  </span>
                </div>

                <div className="mt-4 space-y-2 text-sm">
                  {s.phone && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 5a2 2 0 012-2h3.28a2 2 0 011.897 1.368l1.498 4.493a2 2 0 01-1.003 2.42l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a2 2 0 012.42-1.003l4.493 1.498A2 2 0 0121 17.72V20a2 2 0 01-2 2h-1C9.163 22 2 14.837 2 6V5a2 2 0 012-2z"
                        />
                      </svg>

                      {s.phone}
                    </div>
                  )}

                  {s.email && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <svg
                        className="w-4 h-4 text-slate-400"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5v10a2 2 0 002 2h14z"
                        />
                      </svg>

                      {s.email}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                    <span className="text-slate-500">
                      Salary
                    </span>

                    <span className="font-semibold text-slate-700">
                      {s.salary
                        ? formatCurrency(s.salary)
                        : "—"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-slate-500">
                      Joined
                    </span>

                    <span className="text-slate-600">
                      {formatDate(s.joiningDate)}
                    </span>
                  </div>
                </div>

                {s.status !== "ARCHIVED" && (
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => handleArchive(s.id)}
                      className="btn btn-outline btn-sm flex-1"
                    >
                      Archive
                    </button>
                    <button
                      onClick={() => handleDelete(s.id)}
                      className="btn btn-sm flex-1 text-red-600 border border-red-200 hover:bg-red-50"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* ADD STAFF MODAL */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowModal(false);
            }
          }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">
                Add Staff Member
              </h2>

              <button
                onClick={() => setShowModal(false)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm mb-3">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="form-label">
                      Full Name *
                    </label>

                    <input
                      className="form-input"
                      placeholder="Staff name"
                      value={form.name}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          name: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Phone
                    </label>

                    <input
                      className="form-input"
                      placeholder="01XXXXXXXXX"
                      value={form.phone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          phone: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Email
                    </label>

                    <input
                      type="email"
                      className="form-input"
                      placeholder="email@example.com"
                      value={form.email}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          email: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Designation
                    </label>

                    <input
                      className="form-input"
                      placeholder="Teacher, Accountant..."
                      value={form.designation}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          designation: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Login Role
                    </label>

                    <select
                      className="form-input"
                      value={form.accountRole}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          accountRole: e.target.value,
                        })
                      }
                    >
                      <option value="STAFF">
                        Staff
                      </option>

                      <option value="TEACHER">
                        Teacher
                      </option>

                      <option value="ACCOUNTANT">
                        Accountant
                      </option>

                      <option value="MANAGER">
                        Manager
                      </option>

                      <option value="RECEPTIONIST">
                        Receptionist
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">
                      Salary (৳)
                    </label>

                    <input
                      type="number"
                      className="form-input"
                      placeholder="Monthly salary"
                      value={form.salary}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          salary: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Joining Date
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={form.joiningDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          joiningDate: e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="btn btn-outline"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting
                    ? "Creating Account..."
                    : "Add Staff"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ACCOUNT CREATED MODAL */}
      {showAccountModal && createdAccount && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setShowAccountModal(false);
            }
          }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Staff Account Created
                </h2>

                <p className="text-xs text-green-600 mt-1">
                  Login account has been created successfully.
                </p>
              </div>

              <button
                onClick={() => setShowAccountModal(false)}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <div className="modal-body space-y-4">
              <div className="p-4 bg-green-50 border border-green-200 rounded-2xl">
                <p className="text-sm font-semibold text-green-800">
                  Account Ready
                </p>

                <p className="text-xs text-green-700 mt-1">
                  Save these login details before closing this
                  window.
                </p>
              </div>

              <div>
                <label className="form-label">
                  Role
                </label>

                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl font-semibold text-slate-700">
                  {createdAccount.role}
                </div>
              </div>

              <div>
                <label className="form-label">
                  Login Link
                </label>

                <div className="flex gap-2">
                  <input
                    readOnly
                    className="form-input flex-1"
                    value={getLoginLink()}
                  />

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      handleCopy(
                        getLoginLink(),
                        "Login link"
                      )
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">
                  Username
                </label>

                <div className="flex gap-2">
                  <input
                    readOnly
                    className="form-input flex-1"
                    value={createdAccount.username}
                  />

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      handleCopy(
                        createdAccount.username,
                        "Username"
                      )
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>

              <div>
                <label className="form-label">
                  Temporary Password
                </label>

                <div className="flex gap-2">
                  <input
                    readOnly
                    type="text"
                    className="form-input flex-1 font-mono"
                    value={
                      createdAccount.temporaryPassword
                    }
                  />

                  <button
                    type="button"
                    className="btn btn-outline"
                    onClick={() =>
                      handleCopy(
                        createdAccount.temporaryPassword,
                        "Password"
                      )
                    }
                  >
                    Copy
                  </button>
                </div>
              </div>

              {copyMessage && (
                <div className="text-center text-sm font-medium text-green-600">
                  {copyMessage}
                </div>
              )}
            </div>

            <div className="modal-footer">
              <button
                type="button"
                onClick={handleCopyAll}
                className="btn btn-outline"
              >
                Copy Full Login Details
              </button>

              <button
                type="button"
                onClick={() => setShowAccountModal(false)}
                className="btn btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
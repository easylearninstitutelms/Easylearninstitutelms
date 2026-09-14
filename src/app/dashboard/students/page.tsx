"use client";

import { useState, useEffect, useCallback } from "react";
import { getStatusColor, getInitials, formatDate } from "@/lib/utils";

interface Student {
  id: string;
  studentId: string;
  name: string;
  photoUrl?: string | null;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  address?: string | null;
  dob?: string | null;
  gender: string;
  admissionDate: string;
  status: string;
}

interface StudentDetails {
  student: Student;
  enrollments: Array<{
    enrollment: { id: string; enrollmentDate: string; status: string };
    batch: { id: string; name: string } | null;
    course: { id: string; name: string } | null;
  }>;
  attendance: Array<{
    id: string;
    date: string;
    status: string;
    note?: string | null;
  }>;
  fees: Array<{
    id: string;
    feeType: string;
    amount: string;
    discount?: string | null;
    dueAmount: string;
    dueDate?: string | null;
    status: string;
  }>;
  payments: Array<{
    id: string;
    amount: string;
    method: string;
    receiptNumber: string;
    paidAt: string;
  }>;
}

interface FormData {
  name: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  address: string;
  dob: string;
  gender: string;
  admissionDate: string;
  batchId: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [batches, setBatches] = useState<Array<{ batch: { id: string; name: string } }>>([]);

  const [selectedStudent, setSelectedStudent] = useState<StudentDetails | null>(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const [form, setForm] = useState<FormData>({
    name: "",
    phone: "",
    guardianName: "",
    guardianPhone: "",
    address: "",
    dob: "",
    gender: "",
    admissionDate: new Date().toISOString().split("T")[0],
    batchId: "",
  });

  const fetchStudents = useCallback(async () => {
    setLoading(true);

    try {
      const params = new URLSearchParams({
        search,
        status: statusFilter,
      });

      const res = await fetch(`/api/students?${params}`);
      const data = await res.json();

      setStudents(data.students || []);
      setTotal(data.total || 0);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetch("/api/batches")
      .then((r) => r.json())
      .then((d) => setBatches(d.batches || []));
  }, []);

  async function openStudentDetails(id: string) {
    setDetailsLoading(true);
    setSelectedStudent(null);

    try {
      const res = await fetch(`/api/students/${id}`);
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "Failed to load student");
        return;
      }

      setSelectedStudent(data);
    } catch {
      alert("Failed to load student details");
    } finally {
      setDetailsLoading(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error);
        return;
      }

      setShowModal(false);

      setForm({
        name: "",
        phone: "",
        guardianName: "",
        guardianPhone: "",
        address: "",
        dob: "",
        gender: "",
        admissionDate: new Date().toISOString().split("T")[0],
        batchId: "",
      });

      fetchStudents();
    } catch {
      setError("Failed to add student");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(id: string) {
    if (!confirm("Archive this student?")) return;

    await fetch(`/api/students/${id}`, {
      method: "DELETE",
    });

    fetchStudents();
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-sm text-slate-500">
            {total} students found
          </p>
        </div>

        <button
          onClick={() => setShowModal(true)}
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
          Add Student
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
            className="form-input pl-9"
            placeholder="Search by name, ID, or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          className="form-select w-auto"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="ALL">All Status</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
          <option value="ARCHIVED">Archived</option>
        </select>
      </div>

      {/* Table */}
      <div className="card p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">👨‍🎓</div>

            <p className="text-slate-500 font-medium">
              No students found
            </p>

            <p className="text-sm text-slate-400 mt-1">
              {search
                ? "Try different search terms"
                : "Add your first student to get started"}
            </p>

            {!search && (
              <button
                onClick={() => setShowModal(true)}
                className="btn btn-primary btn-sm mt-4"
              >
                Add Student
              </button>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Phone</th>
                  <th>Guardian</th>
                  <th>Admission</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {students.map((s) => (
                  <tr key={s.id}>
                    <td>
                      <button
                        onClick={() => openStudentDetails(s.id)}
                        className="flex items-center gap-2 text-left hover:opacity-80"
                        title="View student details"
                      >
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                          {getInitials(s.name)}
                        </div>

                        <div>
                          <p className="font-semibold text-slate-700">
                            {s.name}
                          </p>

                          <p className="text-xs text-slate-400">
                            {s.gender || "—"}
                          </p>
                        </div>
                      </button>
                    </td>

                    <td>
                      <span className="badge badge-blue">
                        {s.studentId}
                      </span>
                    </td>

                    <td className="text-slate-500">
                      {s.phone || "—"}
                    </td>

                    <td>
                      <div>
                        <p className="text-sm text-slate-600">
                          {s.guardianName || "—"}
                        </p>

                        <p className="text-xs text-slate-400">
                          {s.guardianPhone || ""}
                        </p>
                      </div>
                    </td>

                    <td className="text-slate-500">
                      {formatDate(s.admissionDate)}
                    </td>

                    <td>
                      <span
                        className={`badge ${getStatusColor(s.status)}`}
                      >
                        {s.status}
                      </span>
                    </td>

                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => openStudentDetails(s.id)}
                          className="btn btn-ghost btn-sm text-blue-500 hover:text-blue-700"
                          title="View details"
                        >
                          👁
                        </button>

                        {s.status !== "ARCHIVED" && (
                          <button
                            onClick={() => handleArchive(s.id)}
                            className="btn btn-ghost btn-sm text-red-500 hover:text-red-700"
                            title="Archive"
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
                                d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"
                              />
                            </svg>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {(detailsLoading || selectedStudent) && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedStudent(null);
            }
          }}
        >
          <div className="modal-box max-w-4xl">
            {detailsLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : selectedStudent ? (
              <>
                <div className="modal-header">
                  <div>
                    <h2 className="modal-title">
                      Student Profile
                    </h2>
                    <p className="text-sm text-slate-400">
                      {selectedStudent.student.studentId}
                    </p>
                  </div>

                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="btn btn-ghost btn-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body space-y-5">
                  {/* Basic Info */}
                  <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-lg font-bold text-blue-600">
                      {getInitials(selectedStudent.student.name)}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-800">
                        {selectedStudent.student.name}
                      </h3>

                      <p className="text-sm text-slate-500">
                        Student ID: {selectedStudent.student.studentId}
                      </p>

                      <span
                        className={`badge mt-2 ${getStatusColor(
                          selectedStudent.student.status
                        )}`}
                      >
                        {selectedStudent.student.status}
                      </span>
                    </div>
                  </div>

                  {/* Information */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoItem
                        label="Phone"
                        value={selectedStudent.student.phone}
                      />

                      <InfoItem
                        label="Gender"
                        value={selectedStudent.student.gender}
                      />

                      <InfoItem
                        label="Date of Birth"
                        value={
                          selectedStudent.student.dob
                            ? formatDate(selectedStudent.student.dob)
                            : "—"
                        }
                      />

                      <InfoItem
                        label="Admission Date"
                        value={formatDate(
                          selectedStudent.student.admissionDate
                        )}
                      />

                      <InfoItem
                        label="Guardian"
                        value={selectedStudent.student.guardianName}
                      />

                      <InfoItem
                        label="Guardian Phone"
                        value={selectedStudent.student.guardianPhone}
                      />

                      <div className="sm:col-span-2 lg:col-span-3">
                        <InfoItem
                          label="Address"
                          value={selectedStudent.student.address}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enrollment */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Batch / Course
                    </h3>

                    {selectedStudent.enrollments.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No batch enrollment found.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedStudent.enrollments.map((item) => (
                          <div
                            key={item.enrollment.id}
                            className="p-3 border rounded-xl"
                          >
                            <p className="font-medium text-slate-700">
                              {item.batch?.name || "Unknown Batch"}
                            </p>

                            <p className="text-sm text-slate-500">
                              Course: {item.course?.name || "—"}
                            </p>

                            <p className="text-xs text-slate-400 mt-1">
                              Enrolled:{" "}
                              {formatDate(
                                item.enrollment.enrollmentDate
                              )}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Attendance */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Recent Attendance
                    </h3>

                    {selectedStudent.attendance.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No attendance records.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table>
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Status</th>
                              <th>Note</th>
                            </tr>
                          </thead>

                          <tbody>
                            {selectedStudent.attendance.map((a) => (
                              <tr key={a.id}>
                                <td>{formatDate(a.date)}</td>
                                <td>
                                  <span className="badge badge-blue">
                                    {a.status}
                                  </span>
                                </td>
                                <td className="text-slate-500">
                                  {a.note || "—"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Fees */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Fees
                    </h3>

                    {selectedStudent.fees.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No fee records.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table>
                          <thead>
                            <tr>
                              <th>Type</th>
                              <th>Amount</th>
                              <th>Due</th>
                              <th>Status</th>
                            </tr>
                          </thead>

                          <tbody>
                            {selectedStudent.fees.map((fee) => (
                              <tr key={fee.id}>
                                <td>{fee.feeType}</td>
                                <td>৳{fee.amount}</td>
                                <td>৳{fee.dueAmount}</td>
                                <td>
                                  <span className="badge badge-blue">
                                    {fee.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Payments */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Payment History
                    </h3>

                    {selectedStudent.payments.length === 0 ? (
                      <p className="text-sm text-slate-400">
                        No payment records.
                      </p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table>
                          <thead>
                            <tr>
                              <th>Receipt</th>
                              <th>Amount</th>
                              <th>Method</th>
                              <th>Date</th>
                            </tr>
                          </thead>

                          <tbody>
                            {selectedStudent.payments.map((payment) => (
                              <tr key={payment.id}>
                                <td>{payment.receiptNumber}</td>
                                <td>৳{payment.amount}</td>
                                <td>{payment.method}</td>
                                <td>
                                  {formatDate(payment.paidAt)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    onClick={() => setSelectedStudent(null)}
                    className="btn btn-outline"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Add Student Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget && setShowModal(false)
          }
        >
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Add New Student</h2>

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
                  <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">
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
                      placeholder="Student name"
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
                    <label className="form-label">Phone</label>

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
                    <label className="form-label">Gender</label>

                    <select
                      className="form-select"
                      value={form.gender}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          gender: e.target.value,
                        })
                      }
                    >
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">
                      Guardian Name
                    </label>

                    <input
                      className="form-input"
                      placeholder="Parent/Guardian"
                      value={form.guardianName}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          guardianName: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Guardian Phone
                    </label>

                    <input
                      className="form-input"
                      placeholder="01XXXXXXXXX"
                      value={form.guardianPhone}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          guardianPhone: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Date of Birth
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={form.dob}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          dob: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Admission Date *
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={form.admissionDate}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          admissionDate: e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="form-label">
                      Address
                    </label>

                    <input
                      className="form-input"
                      placeholder="Full address"
                      value={form.address}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          address: e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="col-span-2">
                    <label className="form-label">
                      Enroll in Batch (optional)
                    </label>

                    <select
                      className="form-select"
                      value={form.batchId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          batchId: e.target.value,
                        })
                      }
                    >
                      <option value="">No batch</option>

                      {batches.map((b) => (
                        <option
                          key={b.batch.id}
                          value={b.batch.id}
                        >
                          {b.batch.name}
                        </option>
                      ))}
                    </select>
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
                  {submitting ? "Adding..." : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function InfoItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="p-3 bg-slate-50 rounded-xl">
      <p className="text-xs text-slate-400 mb-1">{label}</p>
      <p className="text-sm font-medium text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}
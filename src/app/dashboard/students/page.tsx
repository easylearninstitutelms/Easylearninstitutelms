 "use client";

import {
  useState,
  useEffect,
  useCallback,
  useRef,
} from "react";
import {
  getStatusColor,
  getInitials,
  formatDate,
} from "@/lib/utils";

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
    enrollment: {
      id: string;
      enrollmentDate: string;
      status: string;
    };
    batch: {
      id: string;
      name: string;
    } | null;
    course: {
      id: string;
      name: string;
    } | null;
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
  photoUrl: string;
}

const MAX_PHOTO_SIZE = 2 * 1024 * 1024;

const EMPTY_FORM: FormData = {
  name: "",
  phone: "",
  guardianName: "",
  guardianPhone: "",
  address: "",
  dob: "",
  gender: "",
  admissionDate: new Date()
    .toISOString()
    .split("T")[0],
  batchId: "",
  photoUrl: "",
};

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>(
    []
  );

  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] =
    useState("ACTIVE");

  const [showModal, setShowModal] =
    useState(false);

  const [editingStudentId, setEditingStudentId] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const [batches, setBatches] = useState<
    Array<{
      batch: {
        id: string;
        name: string;
      };
    }>
  >([]);

  const [selectedStudent, setSelectedStudent] =
    useState<StudentDetails | null>(null);

  const [detailsLoading, setDetailsLoading] =
    useState(false);

  const [idCardStudent, setIdCardStudent] =
    useState<StudentDetails | null>(null);

  const [idCardLoading, setIdCardLoading] =
    useState(false);

  const [form, setForm] =
    useState<FormData>(EMPTY_FORM);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const fetchStudents = useCallback(
    async () => {
      setLoading(true);

      try {
        const params = new URLSearchParams({
          search,
          status: statusFilter,
        });

        const res = await fetch(
          `/api/students?${params}`,
          {
            cache: "no-store",
          }
        );

        const data = await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to load students"
          );
        }

        setStudents(data.students || []);
        setTotal(data.total || 0);
      } catch (err) {
        console.error(err);
        setStudents([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [search, statusFilter]
  );

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    fetch("/api/batches", {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d) => {
        setBatches(d.batches || []);
      })
      .catch((err) => {
        console.error(err);
        setBatches([]);
      });
  }, []);

  async function openStudentDetails(
    id: string
  ) {
    setDetailsLoading(true);
    setSelectedStudent(null);

    try {
      const res = await fetch(
        `/api/students/${id}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data?.error ||
            "Failed to load student"
        );
        return;
      }

      setSelectedStudent(data);
    } catch {
      alert(
        "Failed to load student details"
      );
    } finally {
      setDetailsLoading(false);
    }
  }

  async function openStudentIdCard(id: string) {
    setIdCardLoading(true);
    setIdCardStudent(null);

    try {
      const res = await fetch(
        `/api/students/${id}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        alert(
          data?.error ||
            "Failed to load student ID card."
        );
        return;
      }

      setIdCardStudent(data);
    } catch (err) {
      console.error(err);
      alert(
        "Failed to load student ID card."
      );
    } finally {
      setIdCardLoading(false);
    }
  }

  function closeIdCard() {
    setIdCardStudent(null);
    setIdCardLoading(false);
  }

  function printIdCard() {
    window.print();
  }

  function resetForm() {
    setForm({
      ...EMPTY_FORM,
      admissionDate: new Date()
        .toISOString()
        .split("T")[0],
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function closeStudentModal() {
    if (submitting) return;

    setShowModal(false);
    setEditingStudentId(null);
    setError("");
    resetForm();
  }

  function handlePhotoChange(
    e: React.ChangeEvent<HTMLInputElement>
  ) {
    const file = e.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError(
        "Please select a valid image file."
      );

      e.target.value = "";
      return;
    }

    if (file.size > MAX_PHOTO_SIZE) {
      setError(
        "Student photo must be 2 MB or smaller."
      );

      e.target.value = "";
      return;
    }

    setError("");

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        setForm((current) => ({
          ...current,
          photoUrl: result,
        }));
      }
    };

    reader.onerror = () => {
      setError(
        "Could not read the selected photo."
      );
    };

    reader.readAsDataURL(file);
  }

  function removePhoto() {
    setForm((current) => ({
      ...current,
      photoUrl: "",
    }));

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  async function openEditStudent(
    student: Student
  ) {
    setError("");

    try {
      const res = await fetch(
        `/api/students/${student.id}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        alert(
          data?.error ||
            "Failed to load student"
        );
        return;
      }

      const details =
        data as StudentDetails;

      const activeEnrollment =
        details.enrollments?.find(
          (item) =>
            item.enrollment.status ===
            "ACTIVE"
        );

      setEditingStudentId(student.id);

      setForm({
        name:
          details.student.name || "",

        phone:
          details.student.phone || "",

        guardianName:
          details.student.guardianName ||
          "",

        guardianPhone:
          details.student.guardianPhone ||
          "",

        address:
          details.student.address || "",

        dob:
          details.student.dob || "",

        gender:
          details.student.gender || "",

        admissionDate:
          details.student.admissionDate ||
          new Date()
            .toISOString()
            .split("T")[0],

        batchId:
          activeEnrollment?.batch?.id ||
          "",

        photoUrl:
          details.student.photoUrl || "",
      });

      setSelectedStudent(null);
      setShowModal(true);
    } catch (err) {
      console.error(err);

      alert(
        "Failed to load student information."
      );
    }
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    if (!form.name.trim()) {
      setError(
        "Student name is required."
      );
      return;
    }

    if (!form.admissionDate) {
      setError(
        "Admission date is required."
      );
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name: form.name.trim(),

        phone: form.phone.trim(),

        guardianName:
          form.guardianName.trim(),

        guardianPhone:
          form.guardianPhone.trim(),

        address:
          form.address.trim(),

        dob:
          form.dob || null,

        gender:
          form.gender || null,

        admissionDate:
          form.admissionDate,

        batchId:
          form.batchId || null,

        photoUrl:
          form.photoUrl || null,
      };

      const endpoint =
        editingStudentId
          ? `/api/students/${editingStudentId}`
          : "/api/students";

      const method =
        editingStudentId
          ? "PATCH"
          : "POST";

      const res = await fetch(
        endpoint,
        {
          method,
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(
            payload
          ),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        setError(
          data?.error ||
            (editingStudentId
              ? "Failed to update student."
              : "Failed to add student.")
        );
        return;
      }

      setShowModal(false);
      setEditingStudentId(null);
      resetForm();

      await fetchStudents();
    } catch (err) {
      console.error(err);

      setError(
        editingStudentId
          ? "Failed to update student. Please try again."
          : "Failed to add student. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(
    id: string
  ) {
    if (
      !confirm(
        "Archive this student?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch(
        `/api/students/${id}`,
        {
          method: "DELETE",
        }
      );

      if (!res.ok) {
        const data =
          await res
            .json()
            .catch(() => null);

        alert(
          data?.error ||
            "Failed to archive student."
        );

        return;
      }

      await fetchStudents();
    } catch {
      alert(
        "Failed to archive student."
      );
    }
  }

  function openAddStudent() {
    setEditingStudentId(null);
    resetForm();
    setError("");
    setShowModal(true);
  }

  return (
    <>
    <div className="space-y-5">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Students
          </h1>

          <p className="text-sm text-slate-500">
            {total} students found
          </p>
        </div>

        <button
          onClick={openAddStudent}
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
            onChange={(e) =>
              setSearch(
                e.target.value
              )
            }
          />
        </div>

        <select
          className="form-select w-auto"
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(
              e.target.value
            )
          }
        >
          <option value="ALL">
            All Status
          </option>

          <option value="ACTIVE">
            Active
          </option>

          <option value="INACTIVE">
            Inactive
          </option>

          <option value="ARCHIVED">
            Archived
          </option>
        </select>
      </div>

      {/* Student Table */}
      <div className="card p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">
              👨‍🎓
            </div>

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
                onClick={
                  openAddStudent
                }
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
                {students.map(
                  (s) => (
                    <tr key={s.id}>
                      <td>
                        <button
                          onClick={() =>
                            openStudentDetails(
                              s.id
                            )
                          }
                          className="flex items-center gap-3 text-left hover:opacity-80"
                          title="View student details"
                        >
                          <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                            {s.photoUrl ? (
                              <img
                                src={
                                  s.photoUrl
                                }
                                alt=""
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              getInitials(
                                s.name
                              )
                            )}
                          </div>

                          <div>
                            <p className="font-semibold text-slate-700">
                              {s.name}
                            </p>

                            <p className="text-xs text-slate-400">
                              {s.gender ||
                                "—"}
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
                        {s.phone ||
                          "—"}
                      </td>

                      <td>
                        <div>
                          <p className="text-sm text-slate-600">
                            {s.guardianName ||
                              "—"}
                          </p>

                          <p className="text-xs text-slate-400">
                            {s.guardianPhone ||
                              ""}
                          </p>
                        </div>
                      </td>

                      <td className="text-slate-500">
                        {formatDate(
                          s.admissionDate
                        )}
                      </td>

                      <td>
                        <span
                          className={`badge ${getStatusColor(
                            s.status
                          )}`}
                        >
                          {s.status}
                        </span>
                      </td>

                      <td>
                        <div className="flex items-center gap-1 flex-wrap">
                          <button
                            onClick={() =>
                              openStudentDetails(
                                s.id
                              )
                            }
                            className="btn btn-ghost btn-sm text-blue-500 hover:text-blue-700"
                            title="View details"
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
                                strokeWidth={
                                  2
                                }
                                d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
                              />
                              <circle
                                cx="12"
                                cy="12"
                                r="2.5"
                                strokeWidth={
                                  2
                                }
                              />
                            </svg>
                          </button>

                          <button
                            onClick={() =>
                              openStudentIdCard(
                                s.id
                              )
                            }
                            className="btn btn-ghost btn-sm text-emerald-600 hover:text-emerald-700"
                            title="Print Student ID Card"
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
                                d="M6 3h12a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2z"
                              />
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 7h6M8 11h8M8 15h8M9 19h6"
                              />
                            </svg>
                          </button>

                          {s.status !==
                            "ARCHIVED" && (
                            <button
                              onClick={() =>
                                openEditStudent(
                                  s
                                )
                              }
                              className="btn btn-ghost btn-sm text-amber-500 hover:text-amber-700"
                              title="Edit student"
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
                                  strokeWidth={
                                    2
                                  }
                                  d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                                />
                              </svg>
                            </button>
                          )}

                          {s.status !==
                            "ARCHIVED" && (
                            <button
                              onClick={() =>
                                handleArchive(
                                  s.id
                                )
                              }
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
                                  strokeWidth={
                                    2
                                  }
                                  d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"
                                />
                              </svg>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Details Modal */}
      {(detailsLoading ||
        selectedStudent) && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              setSelectedStudent(
                null
              );
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
                      {
                        selectedStudent
                          .student
                          .studentId
                      }
                    </p>
                  </div>

                  <button
                    onClick={() =>
                      setSelectedStudent(
                        null
                      )
                    }
                    className="btn btn-ghost btn-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body space-y-5">
                  {/* Profile Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4 p-4 bg-slate-50 rounded-xl">
                    <div className="w-20 h-20 rounded-full overflow-hidden border-2 border-white shadow-sm bg-blue-100 flex items-center justify-center text-lg font-bold text-blue-600 flex-shrink-0">
                      {selectedStudent
                        .student
                        .photoUrl ? (
                        <img
                          src={
                            selectedStudent
                              .student
                              .photoUrl
                          }
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        getInitials(
                          selectedStudent
                            .student
                            .name
                        )
                      )}
                    </div>

                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-slate-800">
                        {
                          selectedStudent
                            .student
                            .name
                        }
                      </h3>

                      <p className="text-sm text-slate-500">
                        Student ID:{" "}
                        {
                          selectedStudent
                            .student
                            .studentId
                        }
                      </p>

                      <span
                        className={`badge mt-2 ${getStatusColor(
                          selectedStudent
                            .student
                            .status
                        )}`}
                      >
                        {
                          selectedStudent
                            .student
                            .status
                        }
                      </span>
                    </div>

                    {selectedStudent
                      .student
                      .status !==
                      "ARCHIVED" && (
                      <button
                        onClick={() =>
                          openEditStudent(
                            selectedStudent.student
                          )
                        }
                        className="btn btn-outline btn-sm"
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
                            d="M11 4H6a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2v-5M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"
                          />
                        </svg>
                        Edit
                      </button>
                    )}
                  </div>

                  {/* Personal Information */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Personal Information
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      <InfoItem
                        label="Phone"
                        value={
                          selectedStudent
                            .student
                            .phone
                        }
                      />

                      <InfoItem
                        label="Gender"
                        value={
                          selectedStudent
                            .student
                            .gender
                        }
                      />

                      <InfoItem
                        label="Date of Birth"
                        value={
                          selectedStudent
                            .student
                            .dob
                            ? formatDate(
                                selectedStudent
                                  .student
                                  .dob
                              )
                            : "—"
                        }
                      />

                      <InfoItem
                        label="Admission Date"
                        value={formatDate(
                          selectedStudent
                            .student
                            .admissionDate
                        )}
                      />

                      <InfoItem
                        label="Guardian"
                        value={
                          selectedStudent
                            .student
                            .guardianName
                        }
                      />

                      <InfoItem
                        label="Guardian Phone"
                        value={
                          selectedStudent
                            .student
                            .guardianPhone
                        }
                      />

                      <div className="sm:col-span-2 lg:col-span-3">
                        <InfoItem
                          label="Address"
                          value={
                            selectedStudent
                              .student
                              .address
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Enrollment */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Batch / Course
                    </h3>

                    {selectedStudent
                      .enrollments.length ===
                    0 ? (
                      <p className="text-sm text-slate-400">
                        No batch enrollment
                        found.
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {selectedStudent.enrollments.map(
                          (item) => (
                            <div
                              key={
                                item.enrollment
                                  .id
                              }
                              className="p-3 border rounded-xl"
                            >
                              <p className="font-medium text-slate-700">
                                {item.batch?.name ||
                                  "Unknown Batch"}
                              </p>

                              <p className="text-sm text-slate-500">
                                Course:{" "}
                                {item.course
                                  ?.name ||
                                  "—"}
                              </p>

                              <p className="text-xs text-slate-400 mt-1">
                                Enrolled:{" "}
                                {formatDate(
                                  item
                                    .enrollment
                                    .enrollmentDate
                                )}
                              </p>
                            </div>
                          )
                        )}
                      </div>
                    )}
                  </div>

                  {/* Attendance */}
                  <div>
                    <h3 className="font-semibold text-slate-700 mb-3">
                      Recent Attendance
                    </h3>

                    {selectedStudent
                      .attendance.length ===
                    0 ? (
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
                            {selectedStudent.attendance.map(
                              (a) => (
                                <tr
                                  key={a.id}
                                >
                                  <td>
                                    {formatDate(
                                      a.date
                                    )}
                                  </td>

                                  <td>
                                    <span className="badge badge-blue">
                                      {
                                        a.status
                                      }
                                    </span>
                                  </td>

                                  <td className="text-slate-500">
                                    {a.note ||
                                      "—"}
                                  </td>
                                </tr>
                              )
                            )}
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

                    {selectedStudent
                      .fees.length === 0 ? (
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
                            {selectedStudent.fees.map(
                              (fee) => (
                                <tr
                                  key={
                                    fee.id
                                  }
                                >
                                  <td>
                                    {
                                      fee.feeType
                                    }
                                  </td>

                                  <td>
                                    ৳
                                    {
                                      fee.amount
                                    }
                                  </td>

                                  <td>
                                    ৳
                                    {
                                      fee.dueAmount
                                    }
                                  </td>

                                  <td>
                                    <span className="badge badge-blue">
                                      {
                                        fee.status
                                      }
                                    </span>
                                  </td>
                                </tr>
                              )
                            )}
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

                    {selectedStudent
                      .payments.length ===
                    0 ? (
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
                            {selectedStudent.payments.map(
                              (payment) => (
                                <tr
                                  key={
                                    payment.id
                                  }
                                >
                                  <td>
                                    {
                                      payment.receiptNumber
                                    }
                                  </td>

                                  <td>
                                    ৳
                                    {
                                      payment.amount
                                    }
                                  </td>

                                  <td>
                                    {
                                      payment.method
                                    }
                                  </td>

                                  <td>
                                    {formatDate(
                                      payment.paidAt
                                    )}
                                  </td>
                                </tr>
                              )
                            )}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    onClick={() =>
                      setSelectedStudent(
                        null
                      )
                    }
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

      {/* Student ID Card Modal */}
      {(idCardLoading || idCardStudent) && (
        <div
          className="modal-overlay print-id-card-overlay"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              closeIdCard();
            }
          }}
        >
          <div className="modal-box max-w-6xl">
            {idCardLoading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : idCardStudent ? (
              <>
                <div className="modal-header print:hidden">
                  <div>
                    <h2 className="modal-title">
                      Student ID Card
                    </h2>
                    <p className="text-sm text-slate-400 mt-1">
                      {idCardStudent.student.name} ·{" "}
                      {idCardStudent.student.studentId}
                    </p>
                  </div>

                  <button
                    onClick={closeIdCard}
                    className="btn btn-ghost btn-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="modal-body">
                  <div className="mb-4 flex flex-wrap items-center justify-end gap-2 print:hidden">
                    <button
                      type="button"
                      onClick={printIdCard}
                      className="btn btn-primary"
                    >
                      🖨 Print Student ID Card
                    </button>
                    <button
                      type="button"
                      onClick={closeIdCard}
                      className="btn btn-outline"
                    >
                      Close
                    </button>
                  </div>

                  <div className="id-card-print-area">
                    <div className="id-card-print-grid">
                      {(() => {
                        const student =
                          idCardStudent.student;

                        const enrollment =
                          idCardStudent.enrollments?.find(
                            (item) =>
                              item.enrollment.status ===
                              "ACTIVE"
                          ) ||
                          idCardStudent.enrollments?.[0] ||
                          null;

                        const initials =
                          student.name
                            .split(/\s+/)
                            .filter(Boolean)
                            .map(
                              (part) => part[0]
                            )
                            .join("")
                            .slice(0, 2)
                            .toUpperCase();

                        return (
                          <>
                            {/* FRONT */}
                            <section className="student-id-card">
                              <div className="h-2 bg-[#0f766e]" />
                              <div className="h-1 bg-[#f59e0b]" />

                              <div className="p-5">
                                <div className="flex items-center gap-3">
                                  <img
                                    src="/easylearn-logo.jpg"
                                    alt="Easylearn Institute"
                                    className="h-12 w-12 rounded-lg object-contain"
                                  />
                                  <div>
                                    <p className="text-base font-extrabold tracking-wide text-[#0f766e]">
                                      EASY LEARN INSTITUTE
                                    </p>
                                    <p className="text-[8px] font-bold tracking-[0.18em] text-slate-500">
                                      STUDENT IDENTIFICATION CARD
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-5 flex gap-4">
                                  <div className="h-28 w-24 shrink-0 overflow-hidden rounded-xl border-2 border-[#0f766e] bg-[#f0fdfa]">
                                    {student.photoUrl ? (
                                      <img
                                        src={
                                          student.photoUrl
                                        }
                                        alt=""
                                        className="h-full w-full object-cover"
                                      />
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center text-3xl font-extrabold text-[#0f766e]">
                                        {initials}
                                      </div>
                                    )}
                                  </div>

                                  <div className="min-w-0 flex-1">
                                    <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                                      Student Name
                                    </p>
                                    <p className="mt-1 text-lg font-extrabold text-slate-900">
                                      {student.name}
                                    </p>

                                    <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2">
                                      <div>
                                        <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                          Student ID
                                        </p>
                                        <p className="mt-0.5 text-xs font-extrabold text-slate-800">
                                          {student.studentId}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                          Status
                                        </p>
                                        <p className="mt-0.5 text-xs font-extrabold text-[#0f766e]">
                                          {student.status}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                          Batch
                                        </p>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                                          {enrollment?.batch?.name ||
                                            "—"}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                          Course
                                        </p>
                                        <p className="mt-0.5 text-xs font-semibold text-slate-700">
                                          {enrollment?.course?.name ||
                                            "—"}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2 rounded-xl bg-[#f0fdfa] p-3">
                                  <div>
                                    <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                      Phone
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-800">
                                      {student.phone || "—"}
                                    </p>
                                  </div>

                                  <div>
                                    <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                      Admission
                                    </p>
                                    <p className="mt-1 text-xs font-semibold text-slate-800">
                                      {formatDate(
                                        student.admissionDate
                                      )}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-4">
                                  <div className="border-t border-slate-300 pt-1.5 text-center text-[7px] font-semibold text-slate-500">
                                    Institute Authority
                                  </div>
                                  <div className="text-right">
                                    <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                      Validity
                                    </p>
                                    <p className="mt-0.5 text-[8px] font-bold text-slate-700">
                                      While Active
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="mt-auto border-t border-slate-200 bg-slate-50 px-5 py-3 text-center">
                                <p className="text-[7px] font-semibold text-slate-500">
                                  Hazibag Dhla, Near Tazuddin Ahmed Medical Collage Hospital,
                                  Joydebpur, Gazipur
                                </p>
                                <p className="mt-0.5 text-[7px] font-bold text-[#0f766e]">
                                  www.easylearninstitute.com
                                </p>
                              </div>
                            </section>

                            {/* BACK */}
                            <section className="student-id-card">
                              <div className="h-2 bg-[#0f766e]" />
                              <div className="h-1 bg-[#f59e0b]" />

                              <div className="p-5">
                                <div className="rounded-xl bg-[#f0fdfa] p-3">
                                  <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                                    Student / Emergency Contact
                                  </p>

                                  <div className="mt-3 space-y-2.5">
                                    <div>
                                      <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                        Guardian
                                      </p>
                                      <p className="mt-0.5 text-xs font-bold text-slate-800">
                                        {student.guardianName ||
                                          "—"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                        Guardian Phone
                                      </p>
                                      <p className="mt-0.5 text-xs font-bold text-slate-800">
                                        {student.guardianPhone ||
                                          "—"}
                                      </p>
                                    </div>

                                    <div>
                                      <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                        Address
                                      </p>
                                      <p className="mt-0.5 text-xs leading-4 font-medium text-slate-700">
                                        {student.address ||
                                          "—"}
                                      </p>
                                    </div>
                                  </div>
                                </div>

                                <div className="mt-4 rounded-xl border border-slate-200 p-3">
                                  <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-[#0f766e]">
                                    Important
                                  </p>
                                  <ul className="mt-2 space-y-1.5 text-[9px] leading-4 text-slate-600">
                                    <li>
                                      • This card remains the property of Easylearn Institute.
                                    </li>
                                    <li>
                                      • Carry this card during institute activities.
                                    </li>
                                    <li>
                                      • Report a lost card to the institute office.
                                    </li>
                                  </ul>
                                </div>

                                <div className="mt-4 grid grid-cols-2 gap-2">
                                  <div className="rounded-xl border border-slate-200 p-3">
                                    <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                      Date of Birth
                                    </p>
                                    <p className="mt-0.5 text-xs font-semibold text-slate-800">
                                      {formatDate(
                                        student.dob
                                      )}
                                    </p>
                                  </div>

                                  <div className="rounded-xl border border-slate-200 p-3">
                                    <p className="text-[7px] font-bold uppercase tracking-[0.12em] text-slate-400">
                                      Gender
                                    </p>
                                    <p className="mt-0.5 text-xs font-semibold text-slate-800">
                                      {student.gender ||
                                        "—"}
                                    </p>
                                  </div>
                                </div>

                                <div className="mt-4 rounded-xl border-2 border-dashed border-[#0f766e]/30 bg-[#f8fffd] p-3 text-center">
                                  <p className="text-[8px] font-bold uppercase tracking-[0.18em] text-[#0f766e]">
                                    Verification
                                  </p>
                                  <p className="mt-1.5 text-lg font-black tracking-[0.16em] text-slate-900">
                                    {student.studentId}
                                  </p>
                                  <p className="mt-1.5 text-[8px] text-slate-500">
                                    Present this card to the institute office for verification.
                                  </p>
                                </div>

                                <div className="mt-6 grid grid-cols-2 gap-8">
                                  <div className="border-t border-slate-300 pt-1.5 text-center text-[7px] font-semibold text-slate-500">
                                    Class Teacher
                                  </div>
                                  <div className="border-t border-slate-300 pt-1.5 text-center text-[7px] font-semibold text-slate-500">
                                    Principal / Director
                                  </div>
                                </div>
                              </div>

                              <div className="mt-auto border-t border-slate-200 bg-slate-50 px-5 py-3 text-center">
                                <p className="text-[7px] font-semibold text-slate-500">
                                  Hazibag Dhla, Near Tazuddin Ahmed Medical Collage Hospital,
                                  Joydebpur, Gazipur
                                </p>
                                <p className="mt-0.5 text-[7px] font-bold text-[#0f766e]">
                                  www.easylearninstitute.com
                                </p>
                              </div>
                            </section>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Add / Edit Student Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (
              e.target ===
              e.currentTarget
            ) {
              closeStudentModal();
            }
          }}
        >
          <div className="modal-box max-w-2xl">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  {editingStudentId
                    ? "Edit Student"
                    : "Add New Student"}
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  {editingStudentId
                    ? "Update student information and photo"
                    : "Add student information and photo"}
                </p>
              </div>

              <button
                onClick={
                  closeStudentModal
                }
                disabled={submitting}
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
            >
              <div className="modal-body">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm mb-4">
                    {error}
                  </div>
                )}

                {/* Photo Upload */}
                <div className="mb-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-col sm:flex-row gap-4 items-center sm:items-start">
                    <div className="w-28 h-28 rounded-2xl overflow-hidden border-2 border-white shadow-sm bg-blue-100 flex items-center justify-center text-2xl font-bold text-blue-600 flex-shrink-0">
                      {form.photoUrl ? (
                        <img
                          src={
                            form.photoUrl
                          }
                          alt="Student preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {form.name
                            ? getInitials(
                                form.name
                              )
                            : "👤"}
                        </span>
                      )}
                    </div>

                    <div className="flex-1 w-full">
                      <label className="form-label">
                        Student Photo
                      </label>

                      <p className="text-xs text-slate-400 mb-3">
                        JPG, PNG or WEBP • Maximum
                        2 MB
                      </p>

                      <div className="flex flex-wrap gap-2">
                        <label className="btn btn-outline btn-sm cursor-pointer">
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
                              d="M3 7h3l2-2h8l2 2h3a2 2 0 012 2v9a2 2 0 01-2 2H3a2 2 0 01-2-2V9a2 2 0 012-2z"
                            />
                            <circle
                              cx="12"
                              cy="13"
                              r="3"
                              strokeWidth={2}
                            />
                          </svg>

                          Choose Photo

                          <input
                            ref={
                              fileInputRef
                            }
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            className="hidden"
                            onChange={
                              handlePhotoChange
                            }
                          />
                        </label>

                        {form.photoUrl && (
                          <button
                            type="button"
                            onClick={
                              removePhoto
                            }
                            className="btn btn-ghost btn-sm text-red-500 hover:text-red-700"
                          >
                            Remove Photo
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Form */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
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
                          phone:
                            e.target.value,
                        })
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Gender
                    </label>

                    <select
                      className="form-select"
                      value={form.gender}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          gender:
                            e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select
                      </option>

                      <option value="MALE">
                        Male
                      </option>

                      <option value="FEMALE">
                        Female
                      </option>

                      <option value="OTHER">
                        Other
                      </option>
                    </select>
                  </div>

                  <div>
                    <label className="form-label">
                      Guardian Name
                    </label>

                    <input
                      className="form-input"
                      placeholder="Parent / Guardian"
                      value={
                        form.guardianName
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          guardianName:
                            e.target.value,
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
                      value={
                        form.guardianPhone
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          guardianPhone:
                            e.target.value,
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
                      value={
                        form.admissionDate
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          admissionDate:
                            e.target.value,
                        })
                      }
                      required
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="form-label">
                      Address
                    </label>

                    <input
                      className="form-input"
                      placeholder="Full address"
                      value={
                        form.address
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          address:
                            e.target.value,
                        })
                      }
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="form-label">
                      Enroll in Batch
                    </label>

                    <select
                      className="form-select"
                      value={
                        form.batchId
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          batchId:
                            e.target.value,
                        })
                      }
                    >
                      <option value="">
                        No batch
                      </option>

                      {batches.map(
                        (b) => (
                          <option
                            key={
                              b.batch.id
                            }
                            value={
                              b.batch.id
                            }
                          >
                            {
                              b.batch
                                .name
                            }
                          </option>
                        )
                      )}
                    </select>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={
                    closeStudentModal
                  }
                  disabled={submitting}
                  className="btn btn-outline"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting
                  }
                  className="btn btn-primary"
                >
                  {submitting
                    ? editingStudentId
                      ? "Saving..."
                      : "Adding..."
                    : editingStudentId
                      ? "Save Changes"
                      : "Add Student"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>

      <style jsx global>{`
        @media print {
          @page {
            size: A4 portrait;
            margin: 10mm;
          }

          html,
          body {
            background: #fff !important;
          }

          body * {
            visibility: hidden !important;
          }

          .print-id-card-overlay,
          .print-id-card-overlay * {
            visibility: visible !important;
          }

          .print-id-card-overlay {
            position: static !important;
            inset: auto !important;
            background: #fff !important;
            padding: 0 !important;
          }

          .print-id-card-overlay .modal-box {
            width: auto !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            overflow: visible !important;
          }

          .id-card-print-grid {
            display: grid !important;
            grid-template-columns: repeat(2, 86mm) !important;
            gap: 6mm !important;
            align-items: start !important;
            justify-content: center !important;
          }

          .student-id-card {
            width: 86mm !important;
            min-height: 54mm !important;
            height: 54mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            border: 1px solid #e2e8f0 !important;
            border-radius: 5mm !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>
    </>
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
      <p className="text-xs text-slate-400 mb-1">
        {label}
      </p>

      <p className="text-sm font-medium text-slate-700">
        {value || "—"}
      </p>
    </div>
  );
}

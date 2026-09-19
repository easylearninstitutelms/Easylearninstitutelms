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

    programme: {
      id: string;
      name: string;
      code?: string | null;
      programmeNo?: number | null;
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
  enrollmentType: "COURSE" | "PROGRAMME" | "BATCH";
  courseId: string;
  programmeId: string;
  photoUrl: string;
}

interface CreatedAccount {
  role: string;
  loginEmail: string;
  temporaryPassword: string;
  loginUrl: string;
  studentId: string;
  studentName: string;
}

const MAX_PHOTO_SIZE =
  2 * 1024 * 1024;

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
  enrollmentType: "COURSE",
  courseId: "",
  programmeId: "",
  photoUrl: "",
};

export default function StudentsPage() {
  const [students, setStudents] =
    useState<Student[]>([]);

  const [total, setTotal] =
    useState(0);

  const [loading, setLoading] =
    useState(true);

  const [search, setSearch] =
    useState("");

  const [statusFilter, setStatusFilter] =
    useState("ACTIVE");

  const [showModal, setShowModal] =
    useState(false);

  const [
    editingStudentId,
    setEditingStudentId,
  ] =
    useState<string | null>(null);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [batches, setBatches] =
    useState<
      Array<{
        batch: {
          id: string;
          name: string;
        };
      }>
    >([]);

  const [courses, setCourses] = useState<
    Array<{ id: string; name: string; courseNo?: number | null }>
  >([]);

  const [programmes, setProgrammes] = useState<
    Array<{ id: string; name: string; code?: string | null; programmeNo?: number | null }>
  >([]);

  const [
    selectedStudent,
    setSelectedStudent,
  ] =
    useState<StudentDetails | null>(
      null
    );

  const [
    detailsLoading,
    setDetailsLoading,
  ] = useState(false);

  const [
    idCardStudent,
    setIdCardStudent,
  ] =
    useState<StudentDetails | null>(
      null
    );

  const [
    idCardLoading,
    setIdCardLoading,
  ] = useState(false);

  const [form, setForm] =
    useState<FormData>(
      EMPTY_FORM
    );

  const [
    createdAccount,
    setCreatedAccount,
  ] =
    useState<CreatedAccount | null>(
      null
    );

  const [
    copyStatus,
    setCopyStatus,
  ] = useState<
    "idle" | "copied" | "error"
  >("idle");

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

  const fetchStudents =
    useCallback(async () => {
      setLoading(true);

      try {
        const params =
          new URLSearchParams({
            search,
            status: statusFilter,
          });

        const res = await fetch(
          `/api/students?${params}`,
          {
            cache: "no-store",
          }
        );

        const data =
          await res.json();

        if (!res.ok) {
          throw new Error(
            data?.error ||
              "Failed to load students"
          );
        }

        setStudents(
          data.students || []
        );

        setTotal(
          data.total || 0
        );
      } catch (err) {
        console.error(err);

        setStudents([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    }, [search, statusFilter]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  useEffect(() => {
    Promise.all([
      fetch("/api/batches", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/courses", { cache: "no-store" }).then((r) => r.json()),
      fetch("/api/programmes", { cache: "no-store" }).then((r) => r.json()),
    ])
      .then(([batchData, courseData, programmeData]) => {
        setBatches(batchData.batches || []);
        setCourses(courseData.courses || []);
        setProgrammes(programmeData.programmes || []);
      })
      .catch((err) => {
        console.error(err);
        setBatches([]);
        setCourses([]);
        setProgrammes([]);
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

      const data =
        await res.json();

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

  async function openStudentIdCard(
    id: string
  ) {
    setIdCardLoading(true);
    setIdCardStudent(null);

    try {
      const res = await fetch(
        `/api/students/${id}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await res.json();

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
      fileInputRef.current.value =
        "";
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
    const file =
      e.target.files?.[0];

    if (!file) return;

    if (
      !file.type.startsWith(
        "image/"
      )
    ) {
      setError(
        "Please select a valid image file."
      );

      e.target.value = "";
      return;
    }

    if (
      file.size >
      MAX_PHOTO_SIZE
    ) {
      setError(
        "Student photo must be 2 MB or smaller."
      );

      e.target.value = "";
      return;
    }

    setError("");

    const reader =
      new FileReader();

    reader.onload = () => {
      const result =
        reader.result;

      if (
        typeof result ===
        "string"
      ) {
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
      fileInputRef.current.value =
        "";
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
          (item) => item.enrollment.status === "ACTIVE"
        );

      const directEnrollmentType =
        activeEnrollment?.programme?.id
          ? "PROGRAMME"
          : activeEnrollment?.course?.id
            ? "COURSE"
            : "BATCH";

      setEditingStudentId(
        student.id
      );

      setForm({
        name:
          details.student.name ||
          "",

        phone:
          details.student.phone ||
          "",

        guardianName:
          details.student
            .guardianName || "",

        guardianPhone:
          details.student
            .guardianPhone || "",

        address:
          details.student.address ||
          "",

        dob:
          details.student.dob ||
          "",

        gender:
          details.student.gender ||
          "",

        admissionDate:
          details.student
            .admissionDate ||
          new Date()
            .toISOString()
            .split("T")[0],

        batchId:
          activeEnrollment?.batch
            ?.id || "",

        enrollmentType: directEnrollmentType,

        courseId:
          activeEnrollment?.course?.id ||
          "",

        programmeId:
          activeEnrollment?.programme?.id ||
          "",

        photoUrl:
          details.student.photoUrl ||
          "",
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

    if (
      !editingStudentId &&
      form.enrollmentType === "COURSE" &&
      !form.courseId
    ) {
      setError("Please select a course.");
      return;
    }

    if (
      !editingStudentId &&
      form.enrollmentType === "PROGRAMME" &&
      !form.programmeId
    ) {
      setError("Please select a programme.");
      return;
    }

    if (
      !editingStudentId &&
      form.enrollmentType === "BATCH" &&
      !form.batchId
    ) {
      setError("Please select a batch.");
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const payload = {
        name:
          form.name.trim(),

        phone:
          form.phone.trim(),

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
          form.enrollmentType === "BATCH"
            ? form.batchId || null
            : null,

        courseId:
          form.enrollmentType === "COURSE"
            ? form.courseId || null
            : null,

        programmeId:
          form.enrollmentType === "PROGRAMME"
            ? form.programmeId || null
            : null,

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

      if (
        !editingStudentId &&
        data.account
      ) {
        const loginUrl =
          typeof window !==
          "undefined"
            ? `${window.location.origin}/`
            : data.account
                .loginUrl ||
              "/";

        setCopyStatus("idle");

        setCreatedAccount({
          role:
            data.account.role ||
            "STUDENT",

          loginEmail:
            data.account
              .loginEmail,

          temporaryPassword:
            data.account
              .temporaryPassword,

          loginUrl,

          studentId:
            data.student
              ?.studentId || "",

          studentName:
            data.student?.name ||
            form.name,
        });
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
      const res =
        await fetch(
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

  async function copyCredentials() {
    if (!createdAccount) {
      return;
    }

    const text = [
      "Easylearn Institute - Student Login",
      "",
      `Student: ${createdAccount.studentName}`,
      `Student ID: ${createdAccount.studentId}`,
      `Login Email: ${createdAccount.loginEmail}`,
      `Temporary Password: ${createdAccount.temporaryPassword}`,
      `Login URL: ${createdAccount.loginUrl}`,
    ].join("\n");

    try {
      if (
        navigator.clipboard &&
        typeof navigator.clipboard
          .writeText === "function"
      ) {
        try {
          await navigator.clipboard.writeText(
            text
          );

          setCopyStatus("copied");

          window.setTimeout(() => {
            setCopyStatus("idle");
          }, 2500);

          return;
        } catch {
          // Use fallback below.
        }
      }

      const textarea =
        document.createElement(
          "textarea"
        );

      textarea.value = text;
      textarea.style.position =
        "fixed";
      textarea.style.left =
        "-9999px";
      textarea.style.top = "0";
      textarea.style.opacity = "0";

      document.body.appendChild(
        textarea
      );

      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(
        0,
        textarea.value.length
      );

      const copied =
        document.execCommand(
          "copy"
        );

      document.body.removeChild(
        textarea
      );

      if (!copied) {
        throw new Error(
          "Copy command failed"
        );
      }

      setCopyStatus("copied");

      window.setTimeout(() => {
        setCopyStatus("idle");
      }, 2500);
    } catch (err) {
      console.error(
        "Copy credentials failed:",
        err
      );

      setCopyStatus("error");

      window.setTimeout(() => {
        setCopyStatus("idle");
      }, 3000);
    }
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
            onClick={
              openAddStudent
            }
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
          ) : students.length ===
            0 ? (
            <div className="text-center py-12">
              <div className="text-4xl mb-3">
                ðŸ‘¨â€ðŸŽ“
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
                                  "â€”"}
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
                            "â€”"}
                        </td>

                        <td>
                          <div>
                            <p className="text-sm text-slate-600">
                              {s.guardianName ||
                                "â€”"}
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
                          <div className="flex items-center gap-1">
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
                                  strokeWidth={2}
                                  d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z"
                                />
                                <circle
                                  cx="12"
                                  cy="12"
                                  r="2.5"
                                  strokeWidth={2}
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
                                    strokeWidth={2}
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
                                    strokeWidth={2}
                                    d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 010 4M5 8l1 12a2 2 0 002 2h8a2 2 0 002-2l1-12"
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
                      âœ•
                    </button>
                  </div>

                  <div className="modal-body space-y-5">
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
                          Edit
                        </button>
                      )}
                    </div>

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
                              : "â€”"
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

                    <div>
                      <h3 className="font-semibold text-slate-700 mb-3">
                        Course / Programme Enrollment
                      </h3>

                      {selectedStudent
                        .enrollments.length ===
                      0 ? (
                        <p className="text-sm text-slate-400">
                          No course or programme enrollment found.
                        </p>
                      ) : (
                        <div className="space-y-2">
                          {selectedStudent.enrollments.map(
                            (item) => (
                              <div
                                key={
                                  item
                                    .enrollment
                                    .id
                                }
                                className="p-3 border rounded-xl"
                              >
                                <p className="font-medium text-slate-700">
                                  {item.programme?.name ||
                                    item.course?.name ||
                                    item.batch?.name ||
                                    "Unknown Enrollment"}
                                </p>

                                <p className="text-sm text-slate-500">
                                  {item.programme
                                    ? "Programme"
                                    : item.course
                                      ? "Course"
                                      : "Batch"}
                                  {item.batch?.name ? " · Batch: " + item.batch.name : ""}
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
                                    key={
                                      a.id
                                    }
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
                                        "â€”"}
                                    </td>
                                  </tr>
                                )
                              )}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>

                    <div>
                      <h3 className="font-semibold text-slate-700 mb-3">
                        Fees
                      </h3>

                      {selectedStudent
                        .fees.length ===
                      0 ? (
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
                                      à§³{" "}
                                      {
                                        fee.amount
                                      }
                                    </td>

                                    <td>
                                      à§³{" "}
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
                                      à§³{" "}
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
        {(idCardLoading ||
          idCardStudent) && (
          <div
            className="modal-overlay print-id-card-overlay"
            onClick={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
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
                        {
                          idCardStudent
                            .student
                            .name
                        }{" "}
                        Â·{" "}
                        {
                          idCardStudent
                            .student
                            .studentId
                        }
                      </p>
                    </div>

                    <button
                      onClick={
                        closeIdCard
                      }
                      className="btn btn-ghost btn-sm"
                    >
                      âœ•
                    </button>
                  </div>

                  <div className="modal-body">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 print:hidden">
                      <div className="text-sm text-slate-500">
                        Front &amp; back
                        preview
                      </div>

                      <button
                        type="button"
                        onClick={
                          printIdCard
                        }
                        className="btn btn-primary"
                      >
                        ðŸ–¨ Print Student ID
                        Card
                      </button>

                      <button
                        type="button"
                        onClick={
                          closeIdCard
                        }
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
                                item
                                  .enrollment
                                  .status ===
                                "ACTIVE"
                            ) ||
                            idCardStudent
                              .enrollments?.[0] ||
                            null;

                          const initials =
                            student.name
                              .split(
                                /\s+/
                              )
                              .filter(
                                Boolean
                              )
                              .map(
                                (
                                  part
                                ) =>
                                  part[0]
                              )
                              .join("")
                              .slice(
                                0,
                                2
                              )
                              .toUpperCase();

                          return (
                            <>
                              <section className="id-card-screen-wrap">
                                <span className="id-card-side-label">
                                  FRONT
                                </span>

                                <section className="student-id-card">
                                  <div className="id-card-topbar" />

                                  <div className="id-card-main">
                                    <div className="id-card-brand">
                                      <img
                                        src="/easylearn-logo.jpg"
                                        alt="Easylearn Institute"
                                        className="id-card-logo"
                                      />

                                      <div className="min-w-0">
                                        <p className="id-card-institute">
                                          EASY LEARN
                                          INSTITUTE
                                        </p>

                                        <p className="id-card-subtitle">
                                          STUDENT
                                          IDENTIFICATION
                                          CARD
                                        </p>
                                      </div>
                                    </div>

                                    <div className="id-card-front-body">
                                      <div className="id-card-photo">
                                        {student.photoUrl ? (
                                          <img
                                            src={
                                              student.photoUrl
                                            }
                                            alt=""
                                            className="h-full w-full object-cover"
                                          />
                                        ) : (
                                          <div className="id-card-initials">
                                            {
                                              initials
                                            }
                                          </div>
                                        )}
                                      </div>

                                      <div className="id-card-front-info">
                                        <p className="id-card-label">
                                          STUDENT NAME
                                        </p>

                                        <p className="id-card-name">
                                          {
                                            student.name
                                          }
                                        </p>

                                        <div className="id-card-meta-grid">
                                          <div>
                                            <p className="id-card-label">
                                              STUDENT ID
                                            </p>

                                            <p className="id-card-value">
                                              {
                                                student.studentId
                                              }
                                            </p>
                                          </div>

                                          <div>
                                            <p className="id-card-label">
                                              STATUS
                                            </p>

                                            <p className="id-card-value id-card-green">
                                              {
                                                student.status
                                              }
                                            </p>
                                          </div>

                                          <div>
                                            <p className="id-card-label">
                                              BATCH
                                            </p>

                                            <p className="id-card-value">
                                              {
                                                enrollment
                                                  ?.batch
                                                  ?.name ||
                                                "â€”"
                                              }
                                            </p>
                                          </div>

                                          <div>
                                            <p className="id-card-label">
                                              COURSE
                                            </p>

                                            <p className="id-card-value">
                                              {
                                                enrollment
                                                  ?.course
                                                  ?.name ||
                                                "â€”"
                                              }
                                            </p>
                                          </div>
                                        </div>
                                      </div>
                                    </div>

                                    <div className="id-card-contact-row">
                                      <div>
                                        <span className="id-card-label">
                                          PHONE
                                        </span>

                                        <strong>
                                          {
                                            student.phone ||
                                            "â€”"
                                          }
                                        </strong>
                                      </div>

                                      <div>
                                        <span className="id-card-label">
                                          ADMISSION
                                        </span>

                                        <strong>
                                          {formatDate(
                                            student.admissionDate
                                          )}
                                        </strong>
                                      </div>
                                    </div>

                                    <div className="id-card-sign-row">
                                      <div className="id-card-sign">
                                        Institute
                                        Authority
                                      </div>

                                      <div className="id-card-valid">
                                        <span className="id-card-label">
                                          VALIDITY
                                        </span>

                                        <strong>
                                          WHILE ACTIVE
                                        </strong>
                                      </div>
                                    </div>
                                  </div>

                                  <div className="id-card-footer">
                                    <span>
                                      Hazibag Dhla,
                                      Near Tazuddin
                                      Ahmed Medical
                                      Collage
                                      Hospital,
                                      Joydebpur,
                                      Gazipur
                                    </span>

                                    <b>
                                      www.easylearninstitute.com
                                    </b>
                                  </div>
                                </section>
                              </section>

                              <section className="id-card-screen-wrap">
                                <span className="id-card-side-label">
                                  BACK
                                </span>

                                <section className="student-id-card">
                                  <div className="id-card-topbar" />

                                  <div className="id-card-main id-card-back-main">
                                    <div className="id-card-back-title">
                                      <span>
                                        STUDENT /
                                        EMERGENCY
                                        CONTACT
                                      </span>

                                      <span>
                                        {
                                          student.studentId
                                        }
                                      </span>
                                    </div>

                                    <div className="id-card-back-grid">
                                      <div>
                                        <p className="id-card-label">
                                          GUARDIAN
                                        </p>

                                        <p className="id-card-value">
                                          {
                                            student.guardianName ||
                                            "â€”"
                                          }
                                        </p>
                                      </div>

                                      <div>
                                        <p className="id-card-label">
                                          GUARDIAN PHONE
                                        </p>

                                        <p className="id-card-value">
                                          {
                                            student.guardianPhone ||
                                            "â€”"
                                          }
                                        </p>
                                      </div>
                                    </div>

                                    <div className="id-card-address">
                                      <p className="id-card-label">
                                        ADDRESS
                                      </p>

                                      <p>
                                        {
                                          student.address ||
                                          "â€”"
                                        }
                                      </p>
                                    </div>

                                    <div className="id-card-back-grid">
                                      <div>
                                        <p className="id-card-label">
                                          DATE OF
                                          BIRTH
                                        </p>

                                        <p className="id-card-value">
                                          {formatDate(
                                            student.dob
                                          )}
                                        </p>
                                      </div>

                                      <div>
                                        <p className="id-card-label">
                                          GENDER
                                        </p>

                                        <p className="id-card-value">
                                          {
                                            student.gender ||
                                            "â€”"
                                          }
                                        </p>
                                      </div>
                                    </div>

                                    <div className="id-card-verify">
                                      <p className="id-card-label">
                                        VERIFICATION
                                      </p>

                                      <strong>
                                        {
                                          student.studentId
                                        }
                                      </strong>

                                      <span>
                                        Present this
                                        card to the
                                        institute
                                        office for
                                        verification.
                                      </span>
                                    </div>

                                    <div className="id-card-note">
                                      This card remains
                                      the property of
                                      Easylearn
                                      Institute.
                                      Carry this card
                                      during institute
                                      activities and
                                      report any loss
                                      to the institute
                                      office.
                                    </div>

                                    <div className="id-card-signatures">
                                      <span>
                                        Class Teacher
                                      </span>

                                      <span>
                                        Principal /
                                        Director
                                      </span>
                                    </div>
                                  </div>

                                  <div className="id-card-footer">
                                    <span>
                                      Hazibag Dhla,
                                      Near Tazuddin
                                      Ahmed Medical
                                      Collage
                                      Hospital,
                                      Joydebpur,
                                      Gazipur
                                    </span>

                                    <b>
                                      www.easylearninstitute.com
                                    </b>
                                  </div>
                                </section>
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
                  âœ•
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
                              : "ðŸ‘¤"}
                          </span>
                        )}
                      </div>

                      <div className="flex-1 w-full">
                        <label className="form-label">
                          Student Photo
                        </label>

                        <p className="text-xs text-slate-400 mb-3">
                          JPG, PNG or WEBP â€¢
                          Maximum 2 MB
                        </p>

                        <div className="flex flex-wrap gap-2">
                          <label className="btn btn-outline btn-sm cursor-pointer">
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
                            name:
                              e.target
                                .value,
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
                              e.target
                                .value,
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
                              e.target
                                .value,
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
                              e.target
                                .value,
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
                              e.target
                                .value,
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
                            dob: e.target
                              .value,
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
                              e.target
                                .value,
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
                              e.target
                                .value,
                          })
                        }
                      />
                    </div>

                    <div className="sm:col-span-2 rounded-2xl border border-blue-100 bg-blue-50/60 p-4">
                      <div className="mb-3">
                        <label className="form-label mb-1">Student Enrollment *</label>
                        <p className="text-xs text-slate-500">
                          Institute runs students by Course or Programme. Batch is kept only for older records.
                        </p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="form-label">Enrollment Type</label>
                          <select
                            className="form-select"
                            value={form.enrollmentType}
                            onChange={(e) => {
                              const type = e.target.value as "COURSE" | "PROGRAMME" | "BATCH";
                              setForm({
                                ...form,
                                enrollmentType: type,
                                courseId: "",
                                programmeId: "",
                                batchId: "",
                              });
                            }}
                          >
                            <option value="COURSE">Course</option>
                            <option value="PROGRAMME">Programme</option>
                            <option value="BATCH">Batch (legacy)</option>
                          </select>
                        </div>

                        {form.enrollmentType === "COURSE" ? (
                          <div className="sm:col-span-2">
                            <label className="form-label">Select Course *</label>
                            <select
                              className="form-select"
                              value={form.courseId}
                              onChange={(e) => setForm({
                                ...form,
                                courseId: e.target.value,
                                programmeId: "",
                                batchId: "",
                              })}
                            >
                              <option value="">Select a course</option>
                              {courses.map((course) => (
                                <option key={course.id} value={course.id}>
                                  {course.name}{course.courseNo ? " (#" + course.courseNo + ")" : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : form.enrollmentType === "PROGRAMME" ? (
                          <div className="sm:col-span-2">
                            <label className="form-label">Select Programme *</label>
                            <select
                              className="form-select"
                              value={form.programmeId}
                              onChange={(e) => setForm({
                                ...form,
                                programmeId: e.target.value,
                                courseId: "",
                                batchId: "",
                              })}
                            >
                              <option value="">Select a programme</option>
                              {programmes.map((programme) => (
                                <option key={programme.id} value={programme.id}>
                                  {programme.name}
                                  {programme.code ? " (" + programme.code + ")" : ""}
                                  {programme.programmeNo ? " #" + programme.programmeNo : ""}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <div className="sm:col-span-2">
                            <label className="form-label">Select Batch</label>
                            <select
                              className="form-select"
                              value={form.batchId}
                              onChange={(e) => setForm({
                                ...form,
                                batchId: e.target.value,
                                courseId: "",
                                programmeId: "",
                              })}
                            >
                              <option value="">Select a batch</option>
                              {batches.map((b) => (
                                <option key={b.batch.id} value={b.batch.id}>
                                  {b.batch.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="modal-footer">
                  <button
                    type="button"
                    onClick={
                      closeStudentModal
                    }
                    disabled={
                      submitting
                    }
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

        {/* Student Account Credentials */}
        {createdAccount && (
          <div
            className="modal-overlay"
            onClick={(e) => {
              if (
                e.target ===
                e.currentTarget
              ) {
                setCreatedAccount(
                  null
                );
                setCopyStatus("idle");
              }
            }}
          >
            <div className="modal-box max-w-md">
              <div className="modal-header">
                <div>
                  <h2 className="modal-title">
                    Student Account Created
                  </h2>

                  <p className="text-xs text-slate-400 mt-1">
                    Save these login credentials
                    before closing this window.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedAccount(
                      null
                    );
                    setCopyStatus("idle");
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  âœ•
                </button>
              </div>

              <div className="modal-body">
                <div className="rounded-2xl bg-emerald-50 border border-emerald-100 p-4">
                  <p className="text-sm font-semibold text-emerald-800">
                    Account successfully created
                  </p>

                  <p className="text-xs text-emerald-700 mt-1">
                    {createdAccount.studentName}
                  </p>
                </div>

                <div className="mt-5 space-y-4">
                  <div>
                    <p className="text-xs text-slate-400">
                      Student ID
                    </p>

                    <div className="mt-1 rounded-xl bg-slate-50 border p-3 font-semibold text-slate-800">
                      {
                        createdAccount.studentId
                      }
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Login Email
                    </p>

                    <div className="mt-1 rounded-xl bg-slate-50 border p-3 font-semibold text-slate-800 break-all">
                      {
                        createdAccount.loginEmail
                      }
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      Temporary Password
                    </p>

                    <div className="mt-1 rounded-xl bg-amber-50 border border-amber-200 p-3 font-bold text-slate-800 break-all">
                      {
                        createdAccount.temporaryPassword
                      }
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-slate-400">
                      App Login Link
                    </p>

                    <div className="mt-1 rounded-xl bg-slate-50 border p-3 font-semibold text-slate-800 break-all">
                      {
                        createdAccount.loginUrl
                      }
                    </div>
                  </div>

                  <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                    <p className="text-xs text-blue-700">
                      Please save or securely give these
                      credentials to the student. The
                      temporary password will not be shown
                      again after closing this window.
                    </p>
                  </div>

                  {copyStatus ===
                    "copied" && (
                    <div className="rounded-xl bg-emerald-50 border border-emerald-100 p-3">
                      <p className="text-xs font-semibold text-emerald-700">
                        âœ“ Credentials copied successfully.
                      </p>
                    </div>
                  )}

                  {copyStatus ===
                    "error" && (
                    <div className="rounded-xl bg-rose-50 border border-rose-100 p-3">
                      <p className="text-xs font-semibold text-rose-700">
                        Copy failed. You can select and copy the
                        credentials manually.
                      </p>
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={copyCredentials}
                  className="btn btn-outline"
                >
                  {copyStatus === "copied"
                    ? "âœ“ Copied"
                    : copyStatus === "error"
                      ? "Copy Failed"
                      : "Copy Credentials"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setCreatedAccount(
                      null
                    );
                    setCopyStatus("idle");
                  }}
                  className="btn btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <style jsx global>{`
        .print-id-card-overlay .modal-box {
          max-width: 1180px;
        }

        .print-id-card-overlay .modal-body {
          overflow-x: auto;
          overflow-y: auto;
        }

        .id-card-print-area {
          width: 100%;
          display: flex;
          justify-content: center;
          overflow: visible;
        }

        .id-card-print-grid {
          display: grid;
          grid-template-columns: repeat(
            2,
            362px
          );
          gap: 16px;
          justify-content: center;
          align-items: start;
          width: max-content;
          padding: 8px 4px 14px;
        }

        .student-id-card {
          zoom: 1.12;
          box-sizing: border-box;
          position: relative;
          width: 85.6mm;
          height: 54mm;
          overflow: hidden;
          border: 1px solid #dbe4e8;
          border-radius: 4mm;
          background: #ffffff;
          box-shadow: 0 8px 24px
            rgba(
              15,
              118,
              110,
              0.08
            );
          color: #0f172a;
          display: flex;
          flex-direction: column;
        }

        .id-card-topbar {
          height: 2.2mm;
          flex: 0 0 auto;
          background: linear-gradient(
            90deg,
            #0f766e 0 78%,
            #f59e0b 78% 100%
          );
        }

        .id-card-main {
          padding: 2.8mm 3.2mm 2.4mm;
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
        }

        .id-card-brand {
          display: flex;
          align-items: center;
          gap: 2.2mm;
        }

        .id-card-logo {
          width: 9.5mm;
          height: 9.5mm;
          border-radius: 1.6mm;
          object-fit: contain;
          background: #fff;
          flex: 0 0 auto;
        }

        .id-card-institute {
          margin: 0;
          font-size: 10.5px;
          line-height: 1.05;
          font-weight: 900;
          letter-spacing: 0.05em;
          color: #0f766e;
        }

        .id-card-subtitle,
        .id-card-label {
          margin: 0;
          font-size: 5.8px;
          line-height: 1.15;
          font-weight: 800;
          letter-spacing: 0.10em;
          text-transform: uppercase;
          color: #94a3b8;
        }

        .id-card-subtitle {
          margin-top: 1mm;
          color: #64748b;
        }

        .id-card-front-body {
          display: grid;
          grid-template-columns: 20mm minmax(0, 1fr);
          gap: 2.8mm;
          margin-top: 2.4mm;
        }

        .id-card-photo {
          width: 20mm;
          height: 23.5mm;
          border: 0.55mm solid #0f766e;
          border-radius: 2.4mm;
          overflow: hidden;
          background: #f0fdfa;
        }

        .id-card-initials {
          width: 100%;
          height: 100%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 17px;
          font-weight: 900;
          color: #0f766e;
        }

        .id-card-front-info {
          min-width: 0;
        }

        .id-card-name {
          margin: 0.6mm 0 1.8mm;
          font-size: 12px;
          line-height: 1.05;
          font-weight: 900;
          color: #0f172a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .id-card-meta-grid,
        .id-card-back-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 1.5mm 2.2mm;
        }

        .id-card-value {
          margin: 0.4mm 0 0;
          font-size: 7.2px;
          line-height: 1.1;
          font-weight: 800;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .id-card-green {
          color: #0f766e;
        }

        .id-card-contact-row {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 2.2mm;
          margin-top: 2.1mm;
          padding: 1.6mm 2mm;
          border-radius: 1.8mm;
          background: #f0fdfa;
        }

        .id-card-contact-row div {
          min-width: 0;
        }

        .id-card-contact-row strong {
          display: block;
          margin-top: 0.6mm;
          font-size: 7px;
          line-height: 1.05;
          font-weight: 800;
          color: #334155;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .id-card-sign-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 2mm;
          align-items: end;
          margin-top: 1.9mm;
        }

        .id-card-sign {
          border-top: 0.25mm solid #cbd5e1;
          padding-top: 0.9mm;
          font-size: 5.6px;
          font-weight: 800;
          color: #64748b;
          text-align: center;
        }

        .id-card-valid {
          text-align: right;
        }

        .id-card-valid strong {
          display: block;
          margin-top: 0.5mm;
          font-size: 5.9px;
          color: #334155;
        }

        .id-card-footer {
          padding: 1.35mm 3.2mm 1.7mm;
          border-top: 1px solid #e2e8f0;
          background: #f8fafc;
          font-size: 5.4px;
          line-height: 1.2;
          color: #64748b;
          text-align: center;
          flex: 0 0 8.4mm;
        }

        .id-card-footer b {
          display: block;
          margin-top: 0.5mm;
          color: #0f766e;
          font-weight: 900;
        }

        .id-card-back-main {
          padding-top: 2.6mm;
        }

        .id-card-back-title {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 2mm;
          padding-bottom: 1.6mm;
          border-bottom: 0.25mm solid #e2e8f0;
          font-size: 6.4px;
          font-weight: 900;
          letter-spacing: 0.08em;
          color: #0f766e;
        }

        .id-card-address {
          margin-top: 1.8mm;
          padding: 1.5mm 1.8mm;
          border: 0.25mm solid #e2e8f0;
          border-radius: 1.6mm;
        }

        .id-card-address p:last-child {
          margin: 0.6mm 0 0;
          font-size: 6.7px;
          line-height: 1.2;
          font-weight: 700;
          color: #475569;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .id-card-verify {
          margin-top: 1.8mm;
          padding: 1.6mm 2mm;
          border: 0.3mm dashed
            rgba(
              15,
              118,
              110,
              0.4
            );
          border-radius: 1.8mm;
          background: #f8fffd;
          text-align: center;
        }

        .id-card-verify strong {
          display: block;
          margin-top: 0.7mm;
          font-size: 11px;
          line-height: 1;
          font-weight: 950;
          letter-spacing: 0.16em;
          color: #0f172a;
        }

        .id-card-verify span {
          display: block;
          margin-top: 0.7mm;
          font-size: 5.5px;
          line-height: 1.15;
          color: #64748b;
        }

        .id-card-note {
          margin-top: 1.5mm;
          font-size: 5.5px;
          line-height: 1.25;
          color: #64748b;
        }

        .id-card-signatures {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 5mm;
          margin-top: 2.4mm;
        }

        .id-card-signatures span {
          border-top: 0.25mm solid #cbd5e1;
          padding-top: 0.9mm;
          font-size: 5.5px;
          font-weight: 800;
          color: #64748b;
          text-align: center;
        }

        .id-card-screen-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 5px;
          width: 362px;
        }

        .id-card-side-label {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          min-width: 54px;
          padding: 3px 9px;
          border-radius: 999px;
          background: #ecfdf5;
          color: #0f766e;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        @media print {
          @page {
            size: A4 landscape;
            margin: 10mm;
          }

          html,
          body {
            width: 100% !important;
            min-height: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #fff !important;
          }

          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
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
            display: block !important;
            width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: #fff !important;
            overflow: visible !important;
          }

          .print-id-card-overlay .modal-box,
          .print-id-card-overlay .modal-content,
          .print-id-card-overlay .modal-body {
            width: 100% !important;
            max-width: none !important;
            height: auto !important;
            max-height: none !important;
            margin: 0 !important;
            padding: 0 !important;
            border: 0 !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            overflow: visible !important;
            background: #fff !important;
          }

          .print-id-card-overlay button {
            display: none !important;
          }

          .id-card-print-grid {
            width: 181.2mm !important;
            max-width: none !important;
            margin: 0 auto !important;
            padding: 0 !important;
            display: grid !important;
            grid-template-columns: 85.6mm 85.6mm !important;
            grid-template-rows: 54mm !important;
            gap: 10mm !important;
            justify-content: center !important;
            align-items: start !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }

          .id-card-screen-wrap {
            display: contents !important;
          }

          .id-card-side-label {
            display: none !important;
          }

          .student-id-card {
            zoom: 1 !important;
            box-sizing: border-box !important;
            width: 85.6mm !important;
            height: 54mm !important;
            min-width: 85.6mm !important;
            min-height: 54mm !important;
            max-width: 85.6mm !important;
            max-height: 54mm !important;
            margin: 0 !important;
            padding: 0 !important;
            box-shadow: none !important;
            border: 0.3mm solid #cbd5e1 !important;
            border-radius: 3mm !important;
            overflow: hidden !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          .id-card-print-grid
            > .id-card-screen-wrap:nth-child(
              n + 3
            )
            .student-id-card {
            break-before: page !important;
            page-break-before: always !important;
          }

          .id-card-print-grid
            > .student-id-card:nth-child(
              n + 3
            ) {
            break-before: page !important;
            page-break-before: always !important;
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
        {value || "â€”"}
      </p>
    </div>
  );
}

"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { formatDate } from "@/lib/utils";
import PushNotificationSetup from "@/components/push-notification-setup";

interface StudentData {
  id: string;
  userId?: string | null;
  studentId: string;
  name: string;
  photoUrl?: string | null;
  phone?: string | null;
  guardianName?: string | null;
  guardianPhone?: string | null;
  address?: string | null;
  dob?: string | null;
  gender?: string | null;
  admissionDate: string;
  status: string;
  loginEmail?: string | null;
}

interface EnrollmentData {
  id: string;
  student_id: string;
  batch_id?: string | null;
  status: string;
  enrollment_date?: string | null;
  batch_name?: string | null;
  batch_no?: number | null;
  course_id?: string | null;
  course_name?: string | null;
  course_no?: number | null;
  programme_id?: string | null;
  programme_name?: string | null;
  programme_no?: number | null;
  semester_id?: string | null;
  semester_name?: string | null;
  semester_no?: number | null;
}

interface AttendanceRecord {
  id: string;
  date: string;
  status: string;
  note?: string | null;
  batchId?: string;
}

interface AttendanceSummary {
  total: number;
  present: number;
  absent: number;
  late: number;
  leave: number;
  percentage: number;
}

interface HomeworkItem {
  id: string;
  batchId: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  attachmentUrl?: string | null;
  createdAt: string;
  batchName?: string | null;
  courseName?: string | null;
  programmeName?: string | null;
  semesterName?: string | null;
  courseClassTitle?: string | null;
  programmeClassTitle?: string | null;
  targetType?: string | null;
  submission?: {
    id: string;
    answer?: string | null;
    attachmentUrl?: string | null;
    submittedAt?: string | null;
  } | null;
}

interface ResultItem {
  id: string;
  examId?: string | null;
  examSubjectId?: string | null;
  marks?: string | null;
  grade?: string | null;
  remarks?: string | null;
  createdAt: string;
  exam: {
    id: string;
    name: string;
    batchId: string;
    examDate?: string | null;
  } | null;
  subject: {
    id: string;
    subjectName: string;
    totalMarks: number;
  } | null;
}

interface FeeItem {
  id: string;
  feeType: string;
  amount: string;
  discount?: string | null;
  dueAmount: string;
  dueDate?: string | null;
  status: string;
  createdAt: string;
}

interface PaymentItem {
  id: string;
  feeId?: string | null;
  amount: string;
  method: string;
  transactionReference?: string | null;
  receiptNumber: string;
  paidAt: string;
}

interface StudentClass {
  enrollment_id: string;
  batch_id: string;
  batch_name: string;
  programme_id?: string | null;
  programme_name?: string | null;
  batch_semester_id?: string | null;
  semester_no?: number | null;
  semester_name?: string | null;
  class_id: string;
  class_no: number;
  title: string;
  description?: string | null;
  scheduled_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  syllabus_status: string;
  session_status: string;
  taken_at?: string | null;
  recording_id?: string | null;
  recording_title?: string | null;
  recording_url?: string | null;
  recording_duration?: string | null;
}

interface StudentRecording {
  id: string;
  recordingType: "PROGRAMME" | "COURSE";
  batchName?: string | null;
  programmeName?: string | null;
  semesterName?: string | null;
  classNo: number;
  classTitle: string;
  recordingTitle: string;
  videoUrl: string;
  duration?: string | null;
}

interface StudentNotification {
  id: string;
  title: string;
  body?: string | null;
  type: string;
  readAt?: string | null;
  createdAt: string;
}

interface StudentPortalData {
  student: StudentData;
  enrollments: EnrollmentData[];
  attendance:
    | {
        records: AttendanceRecord[];
        summary: AttendanceSummary;
      }
    | AttendanceRecord[];
  homework: HomeworkItem[];
  results: ResultItem[];
  fees: {
    records: FeeItem[];
    summary: {
      totalFees: number;
      totalDiscount: number;
      totalDue: number;
      totalPaid: number;
    };
  };
  payments: PaymentItem[];
  classes?: StudentClass[];
}

function currency(value: number | string | null | undefined) {
  const amount = Number(value || 0);

  return `৳${amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function statusClass(status?: string | null) {
  switch (status) {
    case "PRESENT":
    case "PAID":
    case "ACTIVE":
    case "PASS":
      return "bg-emerald-100 text-emerald-700";

    case "LATE":
    case "PARTIAL":
    case "LEAVE":
      return "bg-amber-100 text-amber-700";

    case "ABSENT":
    case "DUE":
    case "FAILED":
    case "INACTIVE":
      return "bg-red-100 text-red-700";

    default:
      return "bg-slate-100 text-slate-600";
  }
}

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export default function StudentPage() {
  const router = useRouter();

  const [data, setData] = useState<StudentPortalData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [recordings, setRecordings] = useState<StudentRecording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<
    "overview" | "classes" | "recordings" | "attendance" | "homework" | "results" | "fees" | "notifications"
  >("overview");
  const [notifications, setNotifications] = useState<StudentNotification[]>([]);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [selectedHomework, setSelectedHomework] = useState<HomeworkItem | null>(null);
  const [submissionAnswer, setSubmissionAnswer] = useState("");
  const [submissionLink, setSubmissionLink] = useState("");
  const [submissionLoading, setSubmissionLoading] = useState(false);
  const [submissionSaving, setSubmissionSaving] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [loggingOut, setLoggingOut] = useState(false);

  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const res = await fetch("/api/student/classes", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Failed to load student classes.");
      setClasses(body.classes || []);
    } catch (err) {
      console.error("Failed to load student classes:", err);
      setClasses([]);
    } finally {
      setClassesLoading(false);
    }
  }, []);

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Failed to load notifications.");
      setNotifications(body.notifications || []);
    } catch (err) {
      console.error("Failed to load notifications:", err);
      setNotifications([]);
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  const markNotificationRead = useCallback(async (notificationId: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId }),
      });
      setNotifications((current) =>
        current.map((item) =>
          item.id === notificationId
            ? { ...item, readAt: item.readAt || new Date().toISOString() }
            : item
        )
      );
    } catch (err) {
      console.error("Failed to mark notification as read:", err);
    }
  }, []);

  const loadRecordings = useCallback(async () => {
    setRecordingsLoading(true);
    try {
      const res = await fetch("/api/student/recordings", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body?.error || "Failed to load recordings.");
      setRecordings(body.recordings || []);
    } catch (err) {
      console.error("Failed to load recordings:", err);
      setRecordings([]);
    } finally {
      setRecordingsLoading(false);
    }
  }, []);

  const loadPortal = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/student/me", { cache: "no-store" });
      const body = await res.json();

      if (res.status === 401 || res.status === 403) {
        router.replace("/");
        return;
      }

      if (!res.ok) {
        throw new Error(body?.error || "Failed to load student portal.");
      }

      setData(body);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Failed to load student portal."
      );
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    loadPortal();
  }, [loadPortal]);

  useEffect(() => {
    if (activeTab === "classes") loadClasses();
    if (activeTab === "recordings") loadRecordings();
    if (activeTab === "notifications") loadNotifications();
  }, [activeTab, loadClasses, loadRecordings, loadNotifications]);

  async function handleLogout() {
    setLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      router.push("/");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="mt-4 text-sm text-slate-500">Loading student portal...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white border border-red-100 shadow-sm p-6 text-center">
          <div className="text-4xl mb-3">⚠️</div>
          <h1 className="text-lg font-bold text-slate-800">Unable to load portal</h1>
          <p className="mt-2 text-sm text-red-500">{error}</p>
          <button type="button" onClick={loadPortal} className="btn btn-primary mt-5">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const student = data.student;

  const attendanceData = Array.isArray(data.attendance)
    ? data.attendance
    : data.attendance?.records ?? [];

  const attendanceSummary: AttendanceSummary = Array.isArray(data.attendance)
    ? {
        present: data.attendance.filter(
          (item) => String(item.status ?? "").toUpperCase() === "PRESENT"
        ).length,
        absent: data.attendance.filter(
          (item) => String(item.status ?? "").toUpperCase() === "ABSENT"
        ).length,
        late: data.attendance.filter(
          (item) => String(item.status ?? "").toUpperCase() === "LATE"
        ).length,
        leave: data.attendance.filter(
          (item) => String(item.status ?? "").toUpperCase() === "LEAVE"
        ).length,
        total: data.attendance.length,
        percentage:
          data.attendance.length > 0
            ? Math.round(
                (data.attendance.filter(
                  (item) => String(item.status ?? "").toUpperCase() === "PRESENT"
                ).length /
                  data.attendance.length) *
                  100
              )
            : 0,
      }
    : data.attendance?.summary ?? {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        total: 0,
        percentage: 0,
      };

  const activeEnrollment =
    data.enrollments.find((item) => item.status === "ACTIVE") ||
    data.enrollments[0] ||
    null;

  const batchName = activeEnrollment?.batch_name || "No active batch";
  const courseName =
    activeEnrollment?.course_name ||
    activeEnrollment?.programme_name ||
    "No course";

  return (
    <div className="min-h-screen bg-slate-50">
      <PushNotificationSetup />
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                EL
              </div>
              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">Easylearn Institute</p>
                <p className="text-xs text-slate-400">Student Portal</p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setActiveTab("notifications");
                  loadNotifications();
                }}
                className="relative rounded-xl p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition"
                title="Notifications"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {notifications.some((item) => !item.readAt) && (
                  <span className="absolute right-1 top-1 h-2.5 w-2.5 rounded-full bg-red-500" />
                )}
              </button>

              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-700">{student.name}</p>
                <p className="text-xs text-slate-400">{student.studentId}</p>
              </div>
              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                {student.photoUrl ? (
                  <img src={student.photoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  initials(student.name)
                )}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                disabled={loggingOut}
                title="Logout"
                className="rounded-lg p-2 text-slate-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome Banner */}
        <section className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 sm:p-8 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-sm text-blue-100">Welcome back</p>
              <h1 className="mt-1 text-2xl sm:text-3xl font-black">{student.name}</h1>
              <p className="mt-2 text-sm text-blue-100">Student ID: {student.studentId}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {batchName}
                </span>
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">
                  {courseName}
                </span>
              </div>
            </div>

            <div className="rounded-2xl bg-white/10 border border-white/15 p-4 min-w-[220px]">
              <p className="text-xs text-blue-100">Attendance</p>
              <p className="mt-1 text-3xl font-black">{attendanceSummary.percentage}%</p>
              <p className="mt-1 text-xs text-blue-100">
                Present {attendanceSummary.present} of {attendanceSummary.total}
              </p>
            </div>
          </div>
        </section>

        {/* Navigation Tabs */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {[
            { key: "overview", label: "Overview" },
            { key: "classes", label: "My Classes" },
            { key: "recordings", label: "Recorded Classes" },
            { key: "attendance", label: "Attendance" },
            { key: "homework", label: "Homework" },
            { key: "results", label: "Exam & Result" },
            { key: "fees", label: "Fees" },
            { key: "notifications", label: "Notifications" },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`whitespace-nowrap rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  active
                    ? "bg-blue-600 text-white shadow"
                    : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Notifications Tab */}
        {activeTab === "notifications" && (
          <div className="mt-6 space-y-4">
            {notificationsLoading ? (
              <div className="card text-center py-12 text-sm text-slate-500">
                Loading notifications...
              </div>
            ) : notifications.length === 0 ? (
              <div className="card text-center py-12">
                <div className="text-4xl mb-3">🔔</div>
                <p className="text-slate-500">No notifications yet.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => !item.readAt && markNotificationRead(item.id)}
                  className={`card w-full text-left transition hover:shadow-md ${
                    item.readAt ? "" : "border-l-4 border-l-blue-500 bg-blue-50/40"
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center text-xl flex-shrink-0">
                      🔔
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-bold text-slate-800">{item.title}</p>
                          {item.body && (
                            <p className="mt-1 text-sm text-slate-600 whitespace-pre-wrap">
                              {item.body}
                            </p>
                          )}
                        </div>
                        {!item.readAt && (
                          <span className="rounded-full bg-blue-600 px-2.5 py-1 text-[11px] font-bold text-white">
                            New
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-3">
                        <span className="text-xs font-semibold text-slate-500">
                          {item.type.replaceAll("_", " ")}
                        </span>
                        <span className="text-xs text-slate-400">
                          {formatDate(item.createdAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* My Classes Tab */}
        {activeTab === "classes" && (
          <div className="mt-6 space-y-6">
            {classesLoading ? (
              <div className="card text-center py-12 text-sm text-slate-500">
                Loading your classes...
              </div>
            ) : classes.length === 0 ? (
              <div className="card">
                <EmptyState message="No syllabus classes found for your enrolled active batch." />
              </div>
            ) : (
              Object.entries(
                classes.reduce<Record<string, StudentClass[]>>((groups, item) => {
                  const key = item.batch_id || "default";
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(item);
                  return groups;
                }, {})
              ).map(([batchId, batchClasses]) => {
                const first = batchClasses[0];
                const groupedBySemester = batchClasses.reduce<
                  Record<string, StudentClass[]>
                >((groups, item) => {
                  const key = item.semester_name || "Semester";
                  if (!groups[key]) groups[key] = [];
                  groups[key].push(item);
                  return groups;
                }, {});

                return (
                  <div key={batchId} className="card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-slate-800">
                          {first.programme_name || "Programme"}
                        </h2>
                        <p className="text-xs text-blue-600 font-semibold mt-1">
                          Batch: {first.batch_name}
                        </p>
                      </div>
                      <span className="badge badge-blue">{batchClasses.length} Classes</span>
                    </div>

                    <div className="mt-5 space-y-5">
                      {Object.entries(groupedBySemester).map(
                        ([semester, semesterClasses]) => (
                          <div key={semester}>
                            <h3 className="font-bold text-slate-700 mb-3">{semester}</h3>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                              {semesterClasses.map((item) => {
                                const status =
                                  item.session_status === "COMPLETED"
                                    ? "COMPLETED"
                                    : item.scheduled_date &&
                                      item.scheduled_date <
                                        new Date().toISOString().slice(0, 10)
                                      ? "PENDING"
                                      : item.scheduled_date ===
                                        new Date().toISOString().slice(0, 10)
                                        ? "TODAY"
                                        : "UPCOMING";

                                const style =
                                  status === "COMPLETED"
                                    ? "border-emerald-200 bg-emerald-50"
                                    : status === "TODAY"
                                      ? "border-amber-200 bg-amber-50"
                                      : status === "PENDING"
                                        ? "border-slate-200 bg-slate-50"
                                        : "border-blue-200 bg-blue-50";

                                return (
                                  <div key={item.class_id} className={`rounded-2xl border p-4 ${style}`}>
                                    <div className="flex items-start justify-between gap-3">
                                      <div>
                                        <p className="text-xs font-bold text-slate-500">
                                          Class {item.class_no}
                                        </p>
                                        <h4 className="mt-1 font-bold text-slate-800">
                                          {item.title}
                                        </h4>
                                      </div>
                                      <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold">
                                        {status}
                                      </span>
                                    </div>

                                    {item.description && (
                                      <p className="mt-2 text-xs text-slate-500">
                                        {item.description}
                                      </p>
                                    )}

                                    {item.recording_id && item.recording_url && (
                                      <div className="mt-4 rounded-xl border border-blue-200 bg-white p-3">
                                        <div className="flex flex-wrap items-center justify-between gap-2">
                                          <div>
                                            <p className="text-xs font-bold text-blue-700">
                                              🎥 Class Recording
                                            </p>
                                            <p className="text-sm font-semibold text-slate-700">
                                              {item.recording_title || "Recorded Class"}
                                            </p>
                                            {item.recording_duration && (
                                              <p className="text-xs text-slate-400">
                                                {item.recording_duration}
                                              </p>
                                            )}
                                          </div>
                                          <a
                                            href={item.recording_url}
                                            target="_blank"
                                            rel="noreferrer"
                                            className="btn btn-primary btn-sm"
                                          >
                                            ▶ Watch Video
                                          </a>
                                        </div>
                                      </div>
                                    )}

                                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                      <span>
                                        📅{" "}
                                        {item.scheduled_date
                                          ? formatDate(item.scheduled_date)
                                          : "Date not set"}
                                      </span>
                                      {item.start_time && (
                                        <span>
                                          🕐 {item.start_time.slice(0, 5)}
                                          {item.end_time
                                            ? ` - ${item.end_time.slice(0, 5)}`
                                            : ""}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Recorded Classes Tab */}
        {activeTab === "recordings" && (
          <div className="mt-6 space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h2 className="font-bold text-slate-800">Recorded Classes</h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Video classes available for your enrolled course and batch
                  </p>
                </div>
                <span className="badge badge-blue">{recordings.length} videos</span>
              </div>

              {recordingsLoading ? (
                <div className="py-12 text-center text-sm text-slate-500">
                  Loading recorded classes...
                </div>
              ) : recordings.length === 0 ? (
                <EmptyState message="No recorded classes are available for your active enrollment yet." />
              ) : (
                <div className="space-y-6">
                  {Object.entries(
                    recordings.reduce<Record<string, StudentRecording[]>>(
                      (groups, item) => {
                        const key = item.batchName || "My Course";
                        if (!groups[key]) groups[key] = [];
                        groups[key].push(item);
                        return groups;
                      },
                      {}
                    )
                  ).map(([bName, batchRecordings]) => (
                    <div key={bName}>
                      <div className="mb-3">
                        <h3 className="font-bold text-slate-700">{bName}</h3>
                        <p className="text-xs text-blue-600 font-semibold mt-1">
                          {batchRecordings[0]?.programmeName || "Course"}
                        </p>
                      </div>

                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                        {batchRecordings.map((item) => (
                          <div
                            key={`${item.recordingType}-${item.id}`}
                            className="rounded-2xl border border-blue-200 bg-blue-50 p-4"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-bold text-blue-700">
                                  Class {item.classNo} · {item.semesterName || "Course"}
                                </p>
                                <h4 className="mt-1 font-bold text-slate-800">
                                  {item.recordingTitle || item.classTitle}
                                </h4>
                                <p className="mt-1 text-xs text-slate-500">{item.classTitle}</p>
                                {item.duration && (
                                  <p className="mt-2 text-xs text-slate-400">
                                    Duration: {item.duration}
                                  </p>
                                )}
                              </div>
                              <span className="shrink-0 text-lg">🎥</span>
                            </div>

                            <div className="mt-4">
                              <a
                                href={item.videoUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="btn btn-primary btn-sm"
                              >
                                ▶ Watch Video
                              </a>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Overview Tab */}
        {activeTab === "overview" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard
                title="Present"
                value={attendanceSummary.present}
                icon="✓"
                className="text-emerald-600"
              />
              <SummaryCard
                title="Absent"
                value={attendanceSummary.absent}
                icon="×"
                className="text-red-600"
              />
              <SummaryCard
                title="Homework"
                value={data.homework.length}
                icon="📚"
                className="text-blue-600"
              />
              <SummaryCard
                title="Results"
                value={data.results.length}
                icon="🏆"
                className="text-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile Card */}
              <div className="card lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-800">My Profile</h2>
                    <p className="text-xs text-slate-400 mt-1">Personal and guardian information</p>
                  </div>
                  <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(student.status)}`}>
                    {student.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ProfileItem label="Student ID" value={student.studentId} />
                  <ProfileItem label="Phone" value={student.phone} />
                  <ProfileItem
                    label="Date of Birth"
                    value={student.dob ? formatDate(student.dob) : "—"}
                  />
                  <ProfileItem label="Gender" value={student.gender} />
                  <ProfileItem
                    label="Admission Date"
                    value={formatDate(student.admissionDate)}
                  />
                  <ProfileItem label="Login Email" value={student.loginEmail} />
                  <ProfileItem label="Guardian" value={student.guardianName} />
                  <ProfileItem label="Guardian Phone" value={student.guardianPhone} />
                  <div className="sm:col-span-2">
                    <ProfileItem label="Address" value={student.address} />
                  </div>
                </div>
              </div>

              {/* Enrollment Card */}
              <div className="card">
                <h2 className="font-bold text-slate-800">Current Enrollment</h2>
                <p className="text-xs text-slate-400 mt-1">Your active programme / course enrollment</p>

                {activeEnrollment ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-400">Batch</p>
                      <p className="font-bold text-slate-700 mt-1">
                        {activeEnrollment.batch_name || activeEnrollment.batch_no || "No batch"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Programme / Course</p>
                      <p className="font-semibold text-slate-700 mt-1">
                        {activeEnrollment.programme_name || activeEnrollment.course_name || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Semester</p>
                      <p className="font-semibold text-slate-700 mt-1">
                        {activeEnrollment.semester_name ||
                          (activeEnrollment.semester_no
                            ? `Semester ${activeEnrollment.semester_no}`
                            : "—")}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Enrollment Status</p>
                      <p className="font-semibold text-slate-700 mt-1">
                        {activeEnrollment.status || "—"}
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">Enrolled</p>
                      <p className="font-semibold text-slate-700 mt-1">
                        {activeEnrollment.enrollment_date
                          ? formatDate(activeEnrollment.enrollment_date)
                          : "—"}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-400">No active enrollment found.</p>
                )}
              </div>
            </div>

            {/* Fee Overview */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-800">Fee Summary</h2>
                  <p className="text-xs text-slate-400 mt-1">Current financial status</p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("fees")}
                  className="btn btn-outline btn-sm"
                >
                  View Fees
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                <MoneyCard title="Total Fees" value={currency(data.fees.summary.totalFees)} />
                <MoneyCard title="Discount" value={currency(data.fees.summary.totalDiscount)} />
                <MoneyCard title="Paid" value={currency(data.fees.summary.totalPaid)} />
                <MoneyCard
                  title="Due"
                  value={currency(data.fees.summary.totalDue)}
                  danger={data.fees.summary.totalDue > 0}
                />
              </div>
            </div>
          </div>
        )}

        {/* Attendance Tab */}
        {activeTab === "attendance" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <AttendanceCard title="Total" value={attendanceSummary.total} />
              <AttendanceCard
                title="Present"
                value={attendanceSummary.present}
                color="text-emerald-600"
              />
              <AttendanceCard
                title="Absent"
                value={attendanceSummary.absent}
                color="text-red-600"
              />
              <AttendanceCard
                title="Late"
                value={attendanceSummary.late}
                color="text-amber-600"
              />
              <AttendanceCard
                title="Leave"
                value={attendanceSummary.leave}
                color="text-blue-600"
              />
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-800">Attendance History</h2>
                  <p className="text-xs text-slate-400 mt-1">Recent 100 records</p>
                </div>
                <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                  {attendanceSummary.percentage}%
                </div>
              </div>

              {attendanceData.length === 0 ? (
                <EmptyState message="No attendance records found." />
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
                      {attendanceData.map((row) => (
                        <tr key={row.id}>
                          <td>{formatDate(row.date)}</td>
                          <td>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(row.status)}`}>
                              {row.status}
                            </span>
                          </td>
                          <td className="text-slate-500">{row.note || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Homework Tab */}
        {activeTab === "homework" && (
          <div className="mt-6 card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-slate-800">Homework</h2>
                <p className="text-xs text-slate-400 mt-1">Homework from your enrolled courses and programmes</p>
              </div>
              <span className="badge badge-blue">{data.homework.length} items</span>
            </div>

            {data.homework.length === 0 ? (
              <EmptyState message="No homework has been assigned yet." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.homework.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-bold text-slate-800">{item.title}</h3>
                        <p className="text-xs text-blue-600 mt-1 font-semibold">
                          {item.programmeName || item.courseName || "Homework"}
                        </p>
                        {(item.semesterName || item.courseClassTitle || item.programmeClassTitle) && (
                          <p className="text-xs text-slate-400 mt-1">
                            {item.semesterName ? item.semesterName : ""}
                            {item.semesterName && (item.programmeClassTitle || item.courseClassTitle)
                              ? " • "
                              : ""}
                            {item.programmeClassTitle || item.courseClassTitle || ""}
                          </p>
                        )}
                      </div>
                      <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                    </div>

                    <p className="mt-3 text-sm text-slate-500 whitespace-pre-line">
                      {item.description || "No description."}
                    </p>

                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      {item.deadline && (
                        <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                          Deadline: {formatDate(item.deadline)}
                        </span>
                      )}

                      {item.attachmentUrl && (
                        <a
                          href={item.attachmentUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn btn-outline btn-sm"
                        >
                          Open Attachment
                        </a>
                      )}

                      <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={async () => {
                          setSelectedHomework(item);
                          setSubmissionAnswer("");
                          setSubmissionLink("");
                          setSubmissionError("");
                          setSubmissionLoading(true);

                          try {
                            const res = await fetch(
                              `/api/student/homework?homeworkId=${encodeURIComponent(item.id)}`,
                              { cache: "no-store" }
                            );
                            const body = await res.json();
                            if (!res.ok) throw new Error(body?.error || "Failed to load submission.");
                            setSubmissionAnswer(body.submission?.answer || "");
                            setSubmissionLink(body.submission?.attachmentUrl || "");
                          } catch (err) {
                            setSubmissionError(
                              err instanceof Error ? err.message : "Failed to load submission."
                            );
                          } finally {
                            setSubmissionLoading(false);
                          }
                        }}
                      >
                        Submit Homework
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Homework Submission Modal */}
        {selectedHomework && (
          <div className="fixed inset-0 z-50 bg-black/40 p-4 flex items-center justify-center">
            <div className="w-full max-w-2xl rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b border-slate-100 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-slate-800">Submit Homework</h2>
                  <p className="text-sm text-slate-500 mt-1">{selectedHomework.title}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedHomework(null)}
                  className="text-slate-400 hover:text-slate-700 text-xl"
                >
                  ✕
                </button>
              </div>

              <div className="p-6 space-y-5">
                {submissionLoading ? (
                  <div className="py-10 text-center text-sm text-slate-500">
                    Loading your previous submission...
                  </div>
                ) : (
                  <>
                    {selectedHomework.description && (
                      <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600 whitespace-pre-line">
                        {selectedHomework.description}
                      </div>
                    )}

                    {selectedHomework.deadline && (
                      <p className="text-xs font-semibold text-amber-700">
                        Deadline: {formatDate(selectedHomework.deadline)}
                      </p>
                    )}

                    <div>
                      <label className="text-sm font-semibold text-slate-700">Your Answer</label>
                      <textarea
                        value={submissionAnswer}
                        onChange={(e) => setSubmissionAnswer(e.target.value)}
                        rows={7}
                        placeholder="Write your answer here..."
                        className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-semibold text-slate-700">
                        Submission Link <span className="font-normal text-slate-400">(optional)</span>
                      </label>
                      <input
                        value={submissionLink}
                        onChange={(e) => setSubmissionLink(e.target.value)}
                        placeholder="Google Drive / OneDrive / other file link"
                        className="mt-2 w-full rounded-xl border border-slate-200 p-3 text-sm outline-none focus:border-blue-500"
                      />
                    </div>

                    {submissionError && <p className="text-sm text-red-600">{submissionError}</p>}

                    <div className="flex justify-end gap-3">
                      <button
                        type="button"
                        onClick={() => setSelectedHomework(null)}
                        className="btn btn-outline"
                      >
                        Cancel
                      </button>

                      <button
                        type="button"
                        disabled={submissionSaving}
                        onClick={async () => {
                          setSubmissionSaving(true);
                          setSubmissionError("");

                          try {
                            const res = await fetch("/api/student/homework", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({
                                homeworkId: selectedHomework.id,
                                answer: submissionAnswer,
                                attachmentUrl: submissionLink,
                              }),
                            });

                            const body = await res.json();
                            if (!res.ok) throw new Error(body?.error || "Failed to submit homework.");

                            setData((current) =>
                              current
                                ? {
                                    ...current,
                                    homework: current.homework.map((h) =>
                                      h.id === selectedHomework.id
                                        ? { ...h, submission: body.submission }
                                        : h
                                    ),
                                  }
                                : current
                            );

                            setSelectedHomework(null);
                          } catch (err) {
                            setSubmissionError(
                              err instanceof Error ? err.message : "Failed to submit homework."
                            );
                          } finally {
                            setSubmissionSaving(false);
                          }
                        }}
                        className="btn btn-primary"
                      >
                        {submissionSaving ? "Submitting..." : "Submit Homework"}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === "results" && (
          <div className="mt-6 card">
            <div className="mb-5">
              <h2 className="font-bold text-slate-800">Exam Results</h2>
              <p className="text-xs text-slate-400 mt-1">Your published examination results</p>
            </div>

            {data.results.length === 0 ? (
              <EmptyState message="No exam results found." />
            ) : (
              <div className="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Exam</th>
                      <th>Subject</th>
                      <th>Exam Date</th>
                      <th>Marks</th>
                      <th>Grade</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((row) => (
                      <tr key={row.id}>
                        <td className="font-semibold text-slate-700">{row.exam?.name}</td>
                        <td>{row.subject?.subjectName}</td>
                        <td className="text-slate-500">
                          {row.exam?.examDate ? formatDate(row.exam.examDate) : "—"}
                        </td>
                        <td>
                          <span className="font-bold text-slate-700">
                            {row.marks || "—"}/{row.subject?.totalMarks || "—"}
                          </span>
                        </td>
                        <td>
                          <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(row.grade)}`}>
                            {row.grade || "—"}
                          </span>
                        </td>
                        <td className="text-slate-500">{row.remarks || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Fees Tab */}
        {activeTab === "fees" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MoneyCard title="Total Fees" value={currency(data.fees.summary.totalFees)} />
              <MoneyCard title="Discount" value={currency(data.fees.summary.totalDiscount)} />
              <MoneyCard title="Paid" value={currency(data.fees.summary.totalPaid)} />
              <MoneyCard
                title="Due"
                value={currency(data.fees.summary.totalDue)}
                danger={data.fees.summary.totalDue > 0}
              />
            </div>

            <div className="card">
              <div className="mb-5">
                <h2 className="font-bold text-slate-800">Fee Records</h2>
              </div>

              {data.fees.records.length === 0 ? (
                <EmptyState message="No fee records found." />
              ) : (
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Type</th>
                        <th>Amount</th>
                        <th>Discount</th>
                        <th>Due</th>
                        <th>Due Date</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.fees.records.map((fee) => (
                        <tr key={fee.id}>
                          <td className="font-semibold">{fee.feeType}</td>
                          <td>{currency(fee.amount)}</td>
                          <td>{currency(fee.discount)}</td>
                          <td
                            className={
                              Number(fee.dueAmount || 0) > 0
                                ? "font-bold text-red-600"
                                : "font-bold text-emerald-600"
                            }
                          >
                            {currency(fee.dueAmount)}
                          </td>
                          <td className="text-slate-500">
                            {fee.dueDate ? formatDate(fee.dueDate) : "—"}
                          </td>
                          <td>
                            <span className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(fee.status)}`}>
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

            <div className="card">
              <div className="mb-5">
                <h2 className="font-bold text-slate-800">Payment History</h2>
              </div>

              {data.payments.length === 0 ? (
                <EmptyState message="No payment records found." />
              ) : (
                <div className="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>
                        <th>Receipt</th>
                        <th>Amount</th>
                        <th>Method</th>
                        <th>Transaction</th>
                        <th>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.payments.map((payment) => (
                        <tr key={payment.id}>
                          <td className="font-semibold">{payment.receiptNumber}</td>
                          <td className="font-bold text-emerald-600">{currency(payment.amount)}</td>
                          <td>{payment.method}</td>
                          <td className="text-slate-500">{payment.transactionReference || "—"}</td>
                          <td className="text-slate-500">{formatDate(payment.paidAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

function SummaryCard({
  title,
  value,
  icon,
  className = "",
}: {
  title: string;
  value: number;
  icon: string;
  className?: string;
}) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400">{title}</p>
        <span className={`text-lg font-black ${className}`}>{icon}</span>
      </div>
      <p className={`mt-2 text-2xl font-black ${className}`}>{value}</p>
    </div>
  );
}

function AttendanceCard({
  title,
  value,
  color = "text-slate-800",
}: {
  title: string;
  value: number;
  color?: string;
}) {
  return (
    <div className="card">
      <p className="text-xs text-slate-400">{title}</p>
      <p className={`mt-1 text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function MoneyCard({
  title,
  value,
  danger = false,
}: {
  title: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div className="card">
      <p className="text-xs text-slate-400">{title}</p>
      <p className={`mt-1 text-lg sm:text-xl font-black ${danger ? "text-red-600" : "text-slate-800"}`}>
        {value}
      </p>
    </div>
  );
}

function ProfileItem({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-700 break-words">{value || "—"}</p>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
      <div className="text-3xl">📭</div>
      <p className="mt-3 text-sm text-slate-500">{message}</p>
    </div>
  );
}

"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  formatDate,
} from "@/lib/utils";

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
  enrollment: {
    id: string;
    enrollmentDate: string;
    status: string;
  };
  batch: {
    id: string;
    name: string;
    room?: string | null;
    startDate?: string | null;
    endDate?: string | null;
    status: string;
  } | null;
  course: {
    id: string;
    name: string;
    duration?: string | null;
    fee?: string | null;
  } | null;
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

interface StudentPortalData {
  student: StudentData;

  enrollments: EnrollmentData[];

  attendance: {
    records: AttendanceRecord[];
    summary: AttendanceSummary;
    percentage: number;
  };

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

function currency(
  value: number | string | null | undefined,
) {
  const amount = Number(value || 0);

  return `৳${amount.toLocaleString(
    "en-BD",
    {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    },
  )}`;
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

  const [data, setData] =
    useState<StudentPortalData | null>(
      null,
    );

  const [loading, setLoading] =
    useState(true);

  const [error, setError] =
    useState("");

  const [classes, setClasses] = useState<StudentClass[]>([]);
  const [classesLoading, setClassesLoading] = useState(false);
  const [recordings, setRecordings] = useState<StudentRecording[]>([]);
  const [recordingsLoading, setRecordingsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "classes" | "recordings" | "attendance" | "homework" | "results" | "fees">("overview");

  const loadClasses = useCallback(async () => {
    setClassesLoading(true);
    try {
      const res = await fetch("/api/student/classes", {
        cache: "no-store",
      });
      const body = await res.json();

      if (!res.ok) {
        throw new Error(body?.error || "Failed to load student classes.");
      }

      setClasses(body.classes || []);
    } catch (err) {
      console.error("Failed to load student classes:", err);
      setClasses([]);
    } finally {
      setClassesLoading(false);
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
    } finally { setRecordingsLoading(false); }
  }, []);
  const loadPortal =
    useCallback(async () => {
      setLoading(true);
      setError("");

      try {
        const res = await fetch(
          "/api/student/me",
          {
            cache: "no-store",
          },
        );

        const body =
          await res.json();

        if (res.status === 401) {
          router.replace("/");
          return;
        }

        if (res.status === 403) {
          router.replace("/");
          return;
        }

        if (!res.ok) {
          throw new Error(
            body?.error ||
              "Failed to load student portal.",
          );
        }

        setData(body);
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load student portal.",
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
  }, [activeTab, loadClasses, loadRecordings]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="mx-auto w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />

          <p className="mt-4 text-sm text-slate-500">
            Loading student portal...
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-md rounded-2xl bg-white border border-red-100 shadow-sm p-6 text-center">
          <div className="text-4xl mb-3">
            ⚠️
          </div>

          <h1 className="text-lg font-bold text-slate-800">
            Unable to load portal
          </h1>

          <p className="mt-2 text-sm text-red-500">
            {error}
          </p>

          <button
            type="button"
            onClick={loadPortal}
            className="btn btn-primary mt-5"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) {
    return null;
  }

  const student =
    data.student;

  const activeEnrollment =
    data.enrollments.find(
      (item) =>
        item.enrollment.status ===
        "ACTIVE",
    ) ||
    data.enrollments[0] ||
    null;

  const batchName =
    activeEnrollment?.batch?.name ||
    "No active batch";

  const courseName =
    activeEnrollment?.course?.name ||
    "No course";

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex min-h-16 items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold">
                EL
              </div>

              <div className="min-w-0">
                <p className="font-bold text-slate-800 truncate">
                  Easylearn Institute
                </p>

                <p className="text-xs text-slate-400">
                  Student Portal
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="hidden sm:block text-right">
                <p className="text-sm font-semibold text-slate-700">
                  {student.name}
                </p>

                <p className="text-xs text-slate-400">
                  {student.studentId}
                </p>
              </div>

              <div className="w-10 h-10 rounded-full overflow-hidden border border-slate-200 bg-blue-100 text-blue-700 font-bold flex items-center justify-center">
                {student.photoUrl ? (
                  <img
                    src={student.photoUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  initials(
                    student.name,
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Welcome */}
        <section className="rounded-3xl bg-gradient-to-r from-blue-700 to-indigo-700 p-6 sm:p-8 text-white shadow-lg">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
            <div>
              <p className="text-sm text-blue-100">
                Welcome back
              </p>

              <h1 className="mt-1 text-2xl sm:text-3xl font-black">
                {student.name}
              </h1>

              <p className="mt-2 text-sm text-blue-100">
                Student ID:{" "}
                {student.studentId}
              </p>

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
              <p className="text-xs text-blue-100">
                Attendance
              </p>

              <p className="mt-1 text-3xl font-black">
                {
                  data.attendance
                    .percentage
                }
                %
              </p>

              <p className="mt-1 text-xs text-blue-100">
                Present{" "}
                {
                  data.attendance
                    .summary.present
                }{" "}
                of{" "}
                {
                  data.attendance
                    .summary.total
                }
              </p>
            </div>
          </div>
        </section>

        {/* Navigation */}
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          {[
            {
              key: "overview",
              label: "Overview",
            },
            {
      key: "classes",
              label: "My Classes",
            },
            {
              key: "recordings",
              label: "Recorded Classes",
            },
            {
              key: "attendance",
              label: "Attendance",
            },
            {
              key: "homework",
              label: "Homework",
            },
            {
              key: "results",
              label: "Exam & Result",
            },
            {
              key: "fees",
              label: "Fees",
            },
          ].map((tab) => {
            const active =
              activeTab ===
              tab.key;

            return (
              <button
                key={tab.key}
                type="button"
                onClick={() =>
                  setActiveTab(
                    tab.key as
                      typeof activeTab,
                  )
                }
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



        {/* My Classes */}
        {activeTab === "classes" && (
          <div className="mt-6 space-y-6">
            {classesLoading ? (
              <div className="card text-center py-12 text-sm text-slate-500">Loading your classes...</div>
            ) : classes.length === 0 ? (
              <div className="card"><EmptyState message="No syllabus classes found for your enrolled active batch." /></div>
            ) : (
              Object.values(
                classes.reduce<Record<string, StudentClass[]>>((groups, item) => {
                  const key = item.batch_id;
                  (groups[key] ||= []).push(item);
                  return groups;
                }, {}),
              ).map((batchClasses) => {
                const first = batchClasses[0];
                const grouped = batchClasses.reduce<Record<string, StudentClass[]>>((groups, item) => {
                  const key = item.semester_name || "Semester";
                  (groups[key] ||= []).push(item);
                  return groups;
                }, {});
                return (
                  <div key={first.batch_id} className="card">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <h2 className="font-bold text-slate-800">{first.programme_name || "Programme"}</h2>
                        <p className="text-xs text-blue-600 font-semibold mt-1">Batch: {first.batch_name}</p>
                      </div>
                      <span className="badge badge-blue">{batchClasses.length} Classes</span>
                    </div>
                    <div className="mt-5 space-y-5">
                      {Object.entries(grouped).map(([semester, semesterClasses]) => (
                        <div key={semester}>
                          <h3 className="font-bold text-slate-700 mb-3">{semester}</h3>
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                            {semesterClasses.map((item) => {
                              const status = item.session_status === "COMPLETED"
                                ? "COMPLETED"
                                : item.scheduled_date && item.scheduled_date < new Date().toISOString().slice(0, 10)
                                  ? "PENDING"
                                  : item.scheduled_date === new Date().toISOString().slice(0, 10)
                                    ? "TODAY"
                                    : "UPCOMING";
                              const style = status === "COMPLETED"
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
                                      <p className="text-xs font-bold text-slate-500">Class {item.class_no}</p>
                                      <h4 className="mt-1 font-bold text-slate-800">{item.title}</h4>
                                    </div>
                                    <span className="rounded-full bg-white/80 px-2.5 py-1 text-[11px] font-bold">{status}</span>
                                  </div>
                                  {item.description && <p className="mt-2 text-xs text-slate-500">{item.description}</p>}
                                  {item.recording_id && item.recording_url && (
                                    <div className="mt-4 rounded-xl border border-blue-200 bg-white p-3">
                                      <div className="flex flex-wrap items-center justify-between gap-2">
                                        <div>
                                          <p className="text-xs font-bold text-blue-700">🎥 Class Recording</p>
                                          <p className="text-sm font-semibold text-slate-700">{item.recording_title || "Recorded Class"}</p>
                                          {item.recording_duration && <p className="text-xs text-slate-400">{item.recording_duration}</p>}
                                        </div>
                                        <a href={item.recording_url} target="_blank" rel="noreferrer" className="btn btn-primary btn-sm">▶ Watch Video</a>
                                      </div>
                                    </div>
                                  )}
                                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-500">
                                    <span>📅 {item.scheduled_date ? formatDate(item.scheduled_date) : "Date not set"}</span>
                                    {item.start_time && <span>🕐 {item.start_time.slice(0,5)}{item.end_time ? ` - ${item.end_time.slice(0,5)}` : ""}</span>}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Recorded Classes */}
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
                    recordings.reduce<Record<string, StudentRecording[]>>((groups, item) => {
                      const key = item.batchName || "My Course";
                      (groups[key] ||= []).push(item);
                      return groups;
                    }, {}),
                  ).map(([batchName, batchRecordings]) => (
                    <div key={batchName}>
                      <div className="mb-3">
                        <h3 className="font-bold text-slate-700">{batchName}</h3>
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
                                <p className="mt-1 text-xs text-slate-500">
                                  {item.classTitle}
                                </p>
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

        {/* Overview */}
        {activeTab ===
          "overview" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              <SummaryCard
                title="Present"
                value={
                  data.attendance
                    .summary.present
                }
                icon="✓"
                className="text-emerald-600"
              />

              <SummaryCard
                title="Absent"
                value={
                  data.attendance
                    .summary.absent
                }
                icon="×"
                className="text-red-600"
              />

              <SummaryCard
                title="Homework"
                value={
                  data.homework
                    .length
                }
                icon="📝"
                className="text-blue-600"
              />

              <SummaryCard
                title="Results"
                value={
                  data.results
                    .length
                }
                icon="🏆"
                className="text-purple-600"
              />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Profile */}
              <div className="card lg:col-span-2">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-bold text-slate-800">
                      My Profile
                    </h2>

                    <p className="text-xs text-slate-400 mt-1">
                      Personal and guardian
                      information
                    </p>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                      student.status,
                    )}`}
                  >
                    {student.status}
                  </span>
                </div>

                <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <ProfileItem
                    label="Student ID"
                    value={
                      student.studentId
                    }
                  />

                  <ProfileItem
                    label="Phone"
                    value={
                      student.phone
                    }
                  />

                  <ProfileItem
                    label="Date of Birth"
                    value={
                      student.dob
                        ? formatDate(
                            student.dob,
                          )
                        : "—"
                    }
                  />

                  <ProfileItem
                    label="Gender"
                    value={
                      student.gender
                    }
                  />

                  <ProfileItem
                    label="Admission Date"
                    value={formatDate(
                      student.admissionDate,
                    )}
                  />

                  <ProfileItem
                    label="Login Email"
                    value={
                      student.loginEmail
                    }
                  />

                  <ProfileItem
                    label="Guardian"
                    value={
                      student.guardianName
                    }
                  />

                  <ProfileItem
                    label="Guardian Phone"
                    value={
                      student.guardianPhone
                    }
                  />

                  <div className="sm:col-span-2">
                    <ProfileItem
                      label="Address"
                      value={
                        student.address
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Batch */}
              <div className="card">
                <h2 className="font-bold text-slate-800">
                  Current Batch
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Your active enrollment
                </p>

                {activeEnrollment ? (
                  <div className="mt-5 space-y-4">
                    <div>
                      <p className="text-xs text-slate-400">
                        Batch
                      </p>

                      <p className="font-bold text-slate-700 mt-1">
                        {
                          activeEnrollment
                            .batch
                            ?.name
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Course
                      </p>

                      <p className="font-semibold text-slate-700 mt-1">
                        {
                          activeEnrollment
                            .course
                            ?.name
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Room
                      </p>

                      <p className="font-semibold text-slate-700 mt-1">
                        {
                          activeEnrollment
                            .batch
                            ?.room ||
                          "—"
                        }
                      </p>
                    </div>

                    <div>
                      <p className="text-xs text-slate-400">
                        Enrolled
                      </p>

                      <p className="font-semibold text-slate-700 mt-1">
                        {formatDate(
                          activeEnrollment
                            .enrollment
                            .enrollmentDate,
                        )}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="mt-5 text-sm text-slate-400">
                    No active batch
                    found.
                  </p>
                )}
              </div>
            </div>

            {/* Financial snapshot */}
            <div className="card">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-bold text-slate-800">
                    Fee Summary
                  </h2>

                  <p className="text-xs text-slate-400 mt-1">
                    Current financial status
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    setActiveTab(
                      "fees",
                    )
                  }
                  className="btn btn-outline btn-sm"
                >
                  View Fees
                </button>
              </div>

              <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                <MoneyCard
                  title="Total Fees"
                  value={currency(
                    data.fees
                      .summary
                      .totalFees,
                  )}
                />

                <MoneyCard
                  title="Discount"
                  value={currency(
                    data.fees
                      .summary
                      .totalDiscount,
                  )}
                />

                <MoneyCard
                  title="Paid"
                  value={currency(
                    data.fees
                      .summary
                      .totalPaid,
                  )}
                />

                <MoneyCard
                  title="Due"
                  value={currency(
                    data.fees
                      .summary
                      .totalDue,
                  )}
                  danger={
                    data.fees
                      .summary
                      .totalDue >
                    0
                  }
                />
              </div>
            </div>
          </div>
        )}

        {/* Attendance */}
        {activeTab ===
          "attendance" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <AttendanceCard
                title="Total"
                value={
                  data.attendance
                    .summary.total
                }
              />

              <AttendanceCard
                title="Present"
                value={
                  data.attendance
                    .summary.present
                }
                color="text-emerald-600"
              />

              <AttendanceCard
                title="Absent"
                value={
                  data.attendance
                    .summary.absent
                }
                color="text-red-600"
              />

              <AttendanceCard
                title="Late"
                value={
                  data.attendance
                    .summary.late
                }
                color="text-amber-600"
              />

              <AttendanceCard
                title="Leave"
                value={
                  data.attendance
                    .summary.leave
                }
                color="text-blue-600"
              />
            </div>

            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-bold text-slate-800">
                    Attendance History
                  </h2>

                  <p className="text-xs text-slate-400 mt-1">
                    Recent 100 records
                  </p>
                </div>

                <div className="rounded-full bg-blue-50 px-4 py-2 text-sm font-bold text-blue-700">
                  {
                    data.attendance
                      .percentage
                  }
                  %
                </div>
              </div>

              {data.attendance
                .records.length ===
              0 ? (
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
                      {data.attendance.records.map(
                        (row) => (
                          <tr
                            key={
                              row.id
                            }
                          >
                            <td>
                              {formatDate(
                                row.date,
                              )}
                            </td>

                            <td>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                  row.status,
                                )}`}
                              >
                                {
                                  row.status
                                }
                              </span>
                            </td>

                            <td className="text-slate-500">
                              {
                                row.note ||
                                "—"
                              }
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Homework */}
        {activeTab ===
          "homework" && (
          <div className="mt-6 card">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-bold text-slate-800">
                  Homework
                </h2>

                <p className="text-xs text-slate-400 mt-1">
                  Homework from your enrolled
                  batches
                </p>
              </div>

              <span className="badge badge-blue">
                {data.homework.length} items
              </span>
            </div>

            {data.homework
              .length === 0 ? (
              <EmptyState message="No homework has been assigned yet." />
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {data.homework.map(
                  (item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-5 hover:shadow-sm transition"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-slate-800">
                            {item.title}
                          </h3>

                          <p className="text-xs text-blue-600 mt-1 font-semibold">
                            {item.batchName ||
                              "Batch"}
                          </p>
                        </div>

                        <span className="text-xs text-slate-400">
                          {formatDate(
                            item.createdAt,
                          )}
                        </span>
                      </div>

                      <p className="mt-3 text-sm text-slate-500 whitespace-pre-line">
                        {
                          item.description ||
                          "No description."
                        }
                      </p>

                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        {item.deadline && (
                          <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
                            Deadline:{" "}
                            {formatDate(
                              item.deadline,
                            )}
                          </span>
                        )}

                        {item.attachmentUrl && (
                          <a
                            href={
                              item.attachmentUrl
                            }
                            target="_blank"
                            rel="noreferrer"
                            className="btn btn-outline btn-sm"
                          >
                            Open Attachment
                          </a>
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
            )}
          </div>
        )}

        {/* Results */}
        {activeTab ===
          "results" && (
          <div className="mt-6 card">
            <div className="mb-5">
              <h2 className="font-bold text-slate-800">
                Exam Results
              </h2>

              <p className="text-xs text-slate-400 mt-1">
                Your published examination results
              </p>
            </div>

            {data.results.length ===
            0 ? (
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
                    {data.results.map(
                      (row) => (
                        <tr
                          key={
                            row.id
                          }
                        >
                          <td className="font-semibold text-slate-700">
                            {
                              row.exam
                                ?.name
                            }
                          </td>

                          <td>
                            {
                              row.subject
                                ?.subjectName
                            }
                          </td>

                          <td className="text-slate-500">
                            {row.exam
                              ?.examDate
                              ? formatDate(
                                  row.exam
                                    .examDate,
                                )
                              : "—"}
                          </td>

                          <td>
                            <span className="font-bold text-slate-700">
                              {
                                row.marks ||
                                "—"
                              }
                              /
                              {
                                row.subject
                                  ?.totalMarks ||
                                "—"
                              }
                            </span>
                          </td>

                          <td>
                            <span
                              className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                row.grade,
                              )}`}
                            >
                              {
                                row.grade ||
                                "—"
                              }
                            </span>
                          </td>

                          <td className="text-slate-500">
                            {
                              row.remarks ||
                              "—"
                            }
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Fees */}
        {activeTab ===
          "fees" && (
          <div className="mt-6 space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MoneyCard
                title="Total Fees"
                value={currency(
                  data.fees
                    .summary
                    .totalFees,
                )}
              />

              <MoneyCard
                title="Discount"
                value={currency(
                  data.fees
                    .summary
                    .totalDiscount,
                )}
              />

              <MoneyCard
                title="Paid"
                value={currency(
                  data.fees
                    .summary
                    .totalPaid,
                )}
              />

              <MoneyCard
                title="Due"
                value={currency(
                  data.fees
                    .summary
                    .totalDue,
                )}
                danger={
                  data.fees
                    .summary
                    .totalDue >
                  0
                }
              />
            </div>

            <div className="card">
              <div className="mb-5">
                <h2 className="font-bold text-slate-800">
                  Fee Records
                </h2>
              </div>

              {data.fees
                .records.length ===
              0 ? (
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
                      {data.fees.records.map(
                        (fee) => (
                          <tr
                            key={
                              fee.id
                            }
                          >
                            <td className="font-semibold">
                              {
                                fee.feeType
                              }
                            </td>

                            <td>
                              {currency(
                                fee.amount,
                              )}
                            </td>

                            <td>
                              {currency(
                                fee.discount,
                              )}
                            </td>

                            <td
                              className={
                                Number(
                                  fee.dueAmount ||
                                    0,
                                ) >
                                0
                                  ? "font-bold text-red-600"
                                  : "font-bold text-emerald-600"
                              }
                            >
                              {currency(
                                fee.dueAmount,
                              )}
                            </td>

                            <td className="text-slate-500">
                              {fee.dueDate
                                ? formatDate(
                                    fee.dueDate,
                                  )
                                : "—"}
                            </td>

                            <td>
                              <span
                                className={`rounded-full px-3 py-1 text-xs font-bold ${statusClass(
                                  fee.status,
                                )}`}
                              >
                                {
                                  fee.status
                                }
                              </span>
                            </td>
                          </tr>
                        ),
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className="card">
              <div className="mb-5">
                <h2 className="font-bold text-slate-800">
                  Payment History
                </h2>
              </div>

              {data.payments
                .length === 0 ? (
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
                      {data.payments.map(
                        (payment) => (
                          <tr
                            key={
                              payment.id
                            }
                          >
                            <td className="font-semibold">
                              {
                                payment.receiptNumber
                              }
                            </td>

                            <td className="font-bold text-emerald-600">
                              {currency(
                                payment.amount,
                              )}
                            </td>

                            <td>
                              {
                                payment.method
                              }
                            </td>

                            <td className="text-slate-500">
                              {
                                payment.transactionReference ||
                                "—"
                              }
                            </td>

                            <td className="text-slate-500">
                              {formatDate(
                                payment.paidAt,
                              )}
                            </td>
                          </tr>
                        ),
                      )}
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
        <p className="text-xs text-slate-400">
          {title}
        </p>

        <span
          className={`text-lg font-black ${className}`}
        >
          {icon}
        </span>
      </div>

      <p
        className={`mt-2 text-2xl font-black ${className}`}
      >
        {value}
      </p>
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
      <p className="text-xs text-slate-400">
        {title}
      </p>

      <p
        className={`mt-1 text-2xl font-black ${color}`}
      >
        {value}
      </p>
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
      <p className="text-xs text-slate-400">
        {title}
      </p>

      <p
        className={`mt-1 text-lg sm:text-xl font-black ${
          danger
            ? "text-red-600"
            : "text-slate-800"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function ProfileItem({
  label,
  value,
}: {
  label: string;
  value?: string | null;
}) {
  return (
    <div className="rounded-xl bg-slate-50 p-3">
      <p className="text-xs text-slate-400">
        {label}
      </p>

      <p className="mt-1 text-sm font-semibold text-slate-700 break-words">
        {value || "—"}
      </p>
    </div>
  );
}

function EmptyState({
  message,
}: {
  message: string;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 py-12 text-center">
      <div className="text-3xl">
        📭
      </div>

      <p className="mt-3 text-sm text-slate-500">
        {message}
      </p>
    </div>
  );
}







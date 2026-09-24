"use client";

import { useState, useEffect, useCallback } from "react";
import { formatDateTime } from "@/lib/utils";

interface CourseOption {
  id: string;
  name: string;
  courseNo?: number | null;
}

interface SemesterOption {
  id: string;
  name: string;
  semesterNo?: number | null;
}

interface ProgrammeOption {
  id: string;
  name: string;
  code?: string | null;
  programmeNo?: number | null;
  semesters?: SemesterOption[];
}

interface Notification {
  id: string;
  title: string;
  body: string | null;
  type: string;
  readAt: string | null;
  createdAt: string;
}

const TYPE_ICONS: Record<string, string> = {
  FEE_DUE: "💰",
  PAYMENT_RECEIVED: "✅",
  ATTENDANCE: "📋",
  HOMEWORK: "📝",
  ASSIGNMENT: "📌",
  EXAM: "📄",
  RESULT: "🏆",
  ROUTINE_UPDATE: "📅",
  ANNOUNCEMENT: "📢",
  TRIAL_ENDING: "⚠️",
  SUBSCRIPTION_EXPIRY: "🔔",
  GENERAL: "ℹ️",
};

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    title: "",
    body: "",
    type: "ANNOUNCEMENT",
    targetType: "COURSE",
    courseId: "",
    programmeId: "",
    semesterId: "",
  });

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/notifications", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load notifications.");
      setNotifications(data.notifications || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    setOptionsLoading(true);
    try {
      const res = await fetch("/api/notifications?options=true", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to load notification targets.");
      setCourses(data.courses || []);
      setProgrammes(data.programmes || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load notification targets.");
    } finally {
      setOptionsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    fetchOptions();
  }, [fetchNotifications, fetchOptions]);

  function closeModal() {
    setShowModal(false);
    setError("");
    setForm({
      title: "",
      body: "",
      type: "ANNOUNCEMENT",
      targetType: "ALL",
      courseId: "",
      programmeId: "",
      semesterId: "",
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to send notification.");
      }

      closeModal();
      await fetchNotifications();
      window.alert(data.message || "Notification sent.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send notification.");
    } finally {
      setSubmitting(false);
    }
  }

  const unreadCount = notifications.filter((n) => !n.readAt).length;

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Notifications</h1>
          <p className="text-sm text-slate-500">{unreadCount} unread</p>
        </div>
        <button
          onClick={() => {
            setShowModal(true);
            fetchOptions();
          }}
          className="btn btn-primary"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Send Notice
        </button>
      </div>

      {error && !showModal && (
        <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="card text-center py-12">
          <div className="text-4xl mb-3">🔔</div>
          <p className="text-slate-500">No notifications yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`card hover:shadow-md transition-shadow ${!n.readAt ? "border-l-4 border-l-blue-500" : ""}`}
            >
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center text-xl flex-shrink-0">
                  {TYPE_ICONS[n.type] || "ℹ️"}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold text-slate-800">{n.title}</p>
                      {n.body && <p className="text-sm text-slate-500 mt-0.5">{n.body}</p>}
                    </div>
                    <span className="badge badge-blue">Saved</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="badge badge-blue">{n.type.replace("_", " ")}</span>
                    <span className="text-xs font-medium text-emerald-600">Saved in notification history</span>
                    <span className="text-xs text-slate-400">{formatDateTime(n.createdAt)}</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">Send Notice</h2>
                <p className="text-xs text-slate-400 mt-1">Choose exactly who should receive this notice.</p>
              </div>
              <button onClick={closeModal} className="btn btn-ghost btn-sm">✕</button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                {error && (
                  <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div>
                  <label className="form-label">Title *</label>
                  <input
                    className="form-input"
                    placeholder="Notice title"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Type</label>
                  <select
                    className="form-select"
                    value={form.type}
                    onChange={(e) => setForm({ ...form, type: e.target.value })}
                  >
                    <option value="ANNOUNCEMENT">Announcement</option>
                    <option value="FEE_DUE">Fee Due</option>
                    <option value="EXAM">Exam</option>
                    <option value="ROUTINE_UPDATE">Routine Update</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label className="form-label">Send To</label>
                  <select
                    className="form-select"
                    value={form.targetType}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        targetType: e.target.value,
                        courseId: "",
                        programmeId: "",
                        semesterId: "",
                      })
                    }
                  >
                    <option value="COURSE">Course</option>
                    <option value="PROGRAMME">Programme</option>
                  </select>
                </div>

                {form.targetType === "COURSE" && (
                  <div>
                    <label className="form-label">Course *</label>
                    <select
                      className="form-select"
                      value={form.courseId}
                      onChange={(e) => setForm({ ...form, courseId: e.target.value })}
                      required
                      disabled={optionsLoading}
                    >
                      <option value="">{optionsLoading ? "Loading courses..." : "Select Course"}</option>
                      {courses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.courseNo ? `Course ${course.courseNo} — ` : ""}{course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {(form.targetType === "PROGRAMME" || form.targetType === "PROGRAMME_SEMESTER") && (
                  <div>
                    <label className="form-label">Programme *</label>
                    <select
                      className="form-select"
                      value={form.programmeId}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          programmeId: e.target.value,
                        })
                      }
                      required
                      disabled={optionsLoading}
                    >
                      <option value="">
                        {optionsLoading ? "Loading programmes..." : "Select Programme"}
                      </option>
                      {programmes.map((programme) => (
                        <option key={programme.id} value={programme.id}>
                          {programme.programmeNo ? `Programme ${programme.programmeNo} — ` : ""}{programme.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {form.targetType === "PROGRAMME" && form.programmeId && (
                  <div>
                    <label className="form-label">Semester <span className="font-normal text-slate-400">(optional)</span></label>
                    <select
                      className="form-select"
                      value={form.semesterId}
                      onChange={(e) => setForm({ ...form, semesterId: e.target.value })}
                      disabled={optionsLoading}
                    >
                      <option value="">
                        {optionsLoading ? "Loading semesters..." : "All Semesters"}
                      </option>
                      {(programmes.find((p) => p.id === form.programmeId)?.semesters || []).map((semester) => (
                        <option key={semester.id} value={semester.id}>
                          {semester.semesterNo ? `Semester ${semester.semesterNo} — ` : ""}{semester.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-input"
                    rows={4}
                    placeholder="Notice content..."
                    value={form.body}
                    onChange={(e) => setForm({ ...form, body: e.target.value })}
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" onClick={closeModal} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
                  {submitting ? "Sending..." : "Send Notice"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
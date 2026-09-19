"use client";

import { useState, useEffect, useCallback } from "react";
import { getAttendanceColor } from "@/lib/utils";

interface BatchOption {
  batch: { id: string; name: string };
  studentCount: number;
}

interface EnrolledStudent {
  student: {
    id: string;
    name: string;
    studentId: string;
  } | null;
  enrollment: { id: string };
}

interface AttendanceRecord {
  attendance: {
    id: string;
    studentId: string;
    status: string;
    date: string;
  };
  studentName: string;
  studentId: string;
}

export default function AttendancePage() {
  const [batches, setBatches] = useState<BatchOption[]>([]);
  const [programmes, setProgrammes] = useState<ProgrammeOption[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedDate, setSelectedDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>(
    []
  );
  const [existing, setExisting] = useState<AttendanceRecord[]>([]);
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const filteredBatches = batches.filter((item) => {
    const matchesProgramme = !selectedProgramme || item.batch.programmeId === selectedProgramme;
    const matchesCourse = !selectedCourse || item.batch.courseId === selectedCourse;
    return matchesProgramme && matchesCourse;
  });

  useEffect(() => {
    Promise.all([
      fetch("/api/batches").then((r) => r.json()),
      fetch("/api/programmes").then((r) => r.json()),
      fetch("/api/courses").then((r) => r.json()),
    ]).then(([batchData, programmeData, courseData]) => {
      setBatches(batchData.batches || []);
      setProgrammes(programmeData.programmes || []);
      setCourses(courseData.courses || []);
    });
  }, []);

  useEffect(() => {
    if (selectedBatch && !filteredBatches.some((item) => item.batch.id === selectedBatch)) {
      setSelectedBatch("");
    }
  }, [selectedProgramme, selectedCourse, filteredBatches, selectedBatch]);

  const loadBatchData = useCallback(async () => {
    if (!selectedBatch) return;

    setLoading(true);

    try {
      const [batchRes, attRes] = await Promise.all([
        fetch(`/api/batches/${selectedBatch}`),
        fetch(
          `/api/attendance?batchId=${selectedBatch}&date=${selectedDate}`
        ),
      ]);

      const batchData = await batchRes.json();
      const attData = await attRes.json();

      const students: EnrolledStudent[] = batchData.students || [];
      setEnrolledStudents(students);

      const existingAtt: AttendanceRecord[] = attData.attendance || [];
      setExisting(existingAtt);

      const initialMarks: Record<string, string> = {};

      students.forEach((s) => {
        if (!s.student) return;

        const found = existingAtt.find(
          (a) => a.attendance.studentId === s.student!.id
        );

        initialMarks[s.student.id] = found
          ? found.attendance.status
          : "PRESENT";
      });

      setMarks(initialMarks);
    } finally {
      setLoading(false);
    }
  }, [selectedBatch, selectedDate]);

  useEffect(() => {
    loadBatchData();
  }, [loadBatchData]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const records = enrolledStudents
      .filter((s) => s.student)
      .map((s) => ({
        studentId: s.student!.id,
        batchId: selectedBatch,
        date: selectedDate,
        status: marks[s.student!.id] || "PRESENT",
      }));

    await fetch("/api/attendance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ records }),
    });

    setSaving(false);
    setSaved(true);

    setTimeout(() => setSaved(false), 3000);
  }

  const summary = {
    present: Object.values(marks).filter((v) => v === "PRESENT").length,
    absent: Object.values(marks).filter((v) => v === "ABSENT").length,
    late: Object.values(marks).filter((v) => v === "LATE").length,
    leave: Object.values(marks).filter((v) => v === "LEAVE").length,
  };

  const StatusBtn = ({
    status,
    current,
    studentId,
  }: {
    status: string;
    current: string;
    studentId: string;
  }) => {
    const colors: Record<string, string> = {
      PRESENT: "bg-green-100 text-green-700 border-green-300",
      ABSENT: "bg-red-100 text-red-700 border-red-300",
      LATE: "bg-yellow-100 text-yellow-700 border-yellow-300",
      LEAVE: "bg-blue-100 text-blue-700 border-blue-300",
    };

    const active = colors[status] + " border";
    const inactive =
      "bg-slate-50 text-slate-400 border border-slate-200";

    return (
      <button
        onClick={() =>
          setMarks((prev) => ({
            ...prev,
            [studentId]: status,
          }))
        }
        className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
          current === status ? active : inactive
        }`}
      >
        {status.charAt(0) + status.slice(1).toLowerCase()}
      </button>
    );
  };

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Attendance</h1>
          <p className="text-sm text-slate-500">
            Mark daily attendance for batches
          </p>
        </div>
      </div>

      {/* Controls */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="form-label">Select Programme</label>
            <select
              className="form-select"
              value={selectedProgramme}
              onChange={(e) => setSelectedProgramme(e.target.value)}
            >
              <option value="">All programmes</option>
              {programmes.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.code ? `${p.code} — ${p.name}` : p.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Select Course</label>
            <select
              className="form-select"
              value={selectedCourse}
              onChange={(e) => setSelectedCourse(e.target.value)}
            >
              <option value="">All courses</option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="form-label">Select Batch</label>
            <select
              className="form-select"
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
            >
              <option value="">Choose a batch...</option>
              {filteredBatches.map((b) => (
                <option key={b.batch.id} value={b.batch.id}>
                  {b.batch.name}
                  {b.batch.programmeName ? ` — ${b.batch.programmeName}` : ""}
                  {b.batch.courseName ? ` — ${b.batch.courseName}` : ""}
                </option>
              ))}
            </select>
            {selectedProgramme || selectedCourse ? (
              <p className="text-xs text-slate-400 mt-1">
                {filteredBatches.length} matching batch{filteredBatches.length === 1 ? "" : "es"}
              </p>
            ) : null}
          </div>

          <div>
            <label className="form-label">Date</label>

            <input
              type="date"
              className="form-input"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {selectedBatch && (
        <>
          {/* Summary */}
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Present",
                count: summary.present,
                color: "bg-green-50 text-green-700",
              },
              {
                label: "Absent",
                count: summary.absent,
                color: "bg-red-50 text-red-700",
              },
              {
                label: "Late",
                count: summary.late,
                color: "bg-yellow-50 text-yellow-700",
              },
              {
                label: "Leave",
                count: summary.leave,
                color: "bg-blue-50 text-blue-700",
              },
            ].map((s) => (
              <div
                key={s.label}
                className={`rounded-2xl p-3 text-center ${s.color}`}
              >
                <p className="text-2xl font-bold">{s.count}</p>
                <p className="text-xs font-medium">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Student List */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-700">
                Mark Attendance —{" "}
                {new Date(selectedDate).toLocaleDateString("en-BD", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              </h2>

              <div className="flex items-center gap-2">
                {saved && (
                  <span className="text-sm text-green-600 font-medium">
                    ✓ Saved!
                  </span>
                )}

                <button
                  onClick={handleSave}
                  disabled={saving || enrolledStudents.length === 0}
                  className="btn btn-primary"
                >
                  {saving ? "Saving..." : "Save Attendance"}
                </button>
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-8">
                <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : enrolledStudents.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p>No students enrolled in this batch</p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Quick mark all buttons */}
                <div className="flex gap-2 mb-4 p-3 bg-slate-50 rounded-xl">
                  <span className="text-xs text-slate-500 font-medium mr-2 self-center">
                    Mark all:
                  </span>

                  {["PRESENT", "ABSENT", "LATE", "LEAVE"].map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        const all: Record<string, string> = {};

                        enrolledStudents.forEach((es) => {
                          if (es.student) {
                            all[es.student.id] = s;
                          }
                        });

                        setMarks(all);
                      }}
                      className="btn btn-outline btn-sm"
                    >
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </button>
                  ))}
                </div>

                {enrolledStudents.map((es, idx) => {
                  if (!es.student) return null;

                  const s = es.student;
                  const currentStatus = marks[s.id] || "PRESENT";

                  return (
                    <div
                      key={s.id}
                      className="flex items-center justify-between py-3 border-b border-slate-50 last:border-0"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-slate-400 w-6">
                          {idx + 1}
                        </span>

                        <div
                          className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                            currentStatus === "PRESENT"
                              ? "bg-green-100 text-green-600"
                              : currentStatus === "ABSENT"
                              ? "bg-red-100 text-red-600"
                              : currentStatus === "LATE"
                              ? "bg-yellow-100 text-yellow-600"
                              : "bg-blue-100 text-blue-600"
                          }`}
                        >
                          {s.name.charAt(0).toUpperCase()}
                        </div>

                        <div>
                          <p className="font-medium text-slate-700">
                            {s.name}
                          </p>

                          <p className="text-xs text-slate-400">
                            {s.studentId}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-1">
                        <StatusBtn
                          status="PRESENT"
                          current={currentStatus}
                          studentId={s.id}
                        />

                        <StatusBtn
                          status="ABSENT"
                          current={currentStatus}
                          studentId={s.id}
                        />

                        <StatusBtn
                          status="LATE"
                          current={currentStatus}
                          studentId={s.id}
                        />

                        <StatusBtn
                          status="LEAVE"
                          current={currentStatus}
                          studentId={s.id}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {!selectedBatch && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">✅</div>

          <p className="text-slate-500 font-medium">
            Select a batch to take attendance
          </p>

          <p className="text-sm text-slate-400 mt-1">
            Choose a batch and date from the controls above
          </p>
        </div>
      )}
    </div>
  );
}
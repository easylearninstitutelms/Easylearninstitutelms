"use client";

import { useState, useEffect, useCallback } from "react";
import { getAttendanceColor } from "@/lib/utils";

interface ProgrammeOption {
  id: string;
  name: string;
  code?: string | null;
}

interface CourseOption {
  id: string;
  name: string;
}

interface SemesterOption {
  id: string;
  semesterNo: number;
  name: string;
}

interface ClassOption {
  id: string;
  classNo: number;
  title: string;
  semesterId?: string | null;
  semesterNo?: number | null;
  semesterName?: string | null;
  scheduledDate?: string | null;
}

interface BatchOption {
  batch: {
    id: string;
    name: string;
    programmeId?: string | null;
    programmeName?: string | null;
    courseId?: string | null;
    courseName?: string | null;
  };
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
  const [semesters, setSemesters] = useState<SemesterOption[]>([]);
  const [programmeClasses, setProgrammeClasses] = useState<ClassOption[]>([]);
  const [courseClasses, setCourseClasses] = useState<ClassOption[]>([]);
  const [selectedMode, setSelectedMode] = useState<"PROGRAMME" | "COURSE">("PROGRAMME");
  const [selectedProgramme, setSelectedProgramme] = useState("");
  const [selectedSemester, setSelectedSemester] = useState("");
  const [selectedProgrammeClass, setSelectedProgrammeClass] = useState("");
  const [selectedCourse, setSelectedCourse] = useState("");
  const [selectedCourseClass, setSelectedCourseClass] = useState("");
  const [selectedBatch, setSelectedBatch] = useState("");
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);
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

  const activeClassId = selectedMode === "PROGRAMME" ? selectedProgrammeClass : selectedCourseClass;
  const activeClass = (selectedMode === "PROGRAMME" ? programmeClasses : courseClasses)
    .find((item) => item.id === activeClassId);

  const filteredCourses = selectedMode === "PROGRAMME" ? courses : courses;

  const filteredBatches = batches.filter((item) => {
    const b = item.batch;
    const matchesProgramme = selectedMode === "COURSE"
      ? true
      : !selectedProgramme || b.programmeId === selectedProgramme;
    const matchesSemester = selectedMode === "PROGRAMME"
      ? !selectedSemester || b.semesterId === selectedSemester
      : true;
    const matchesCourse = selectedMode === "COURSE"
      ? !selectedCourse || b.courseId === selectedCourse
      : true;
    return matchesProgramme && matchesSemester && matchesCourse;
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
    if (!selectedProgramme) {
      setSemesters([]);
      setSelectedSemester("");
      setProgrammeClasses([]);
      setSelectedProgrammeClass("");
      return;
    }
    fetch(`/api/attendance/options?programmeId=${selectedProgramme}`)
      .then((r) => r.json())
      .then((data) => {
        setSemesters(data.semesters || []);
        setProgrammeClasses(data.classes || []);
      })
      .catch(() => {
        setSemesters([]);
        setProgrammeClasses([]);
      });
  }, [selectedProgramme]);

  useEffect(() => {
    if (!selectedCourse) {
      setCourseClasses([]);
      setSelectedCourseClass("");
      return;
    }
    fetch(`/api/attendance/options?courseId=${selectedCourse}`)
      .then((r) => r.json())
      .then((data) => setCourseClasses(data.classes || []))
      .catch(() => setCourseClasses([]));
  }, [selectedCourse]);

  useEffect(() => {
    if (selectedMode === "PROGRAMME") {
      setSelectedCourse("");
      setSelectedCourseClass("");
    } else {
      setSelectedProgramme("");
      setSelectedSemester("");
      setSelectedProgrammeClass("");
    }
  }, [selectedMode]);

  useEffect(() => {
    if (selectedMode === "PROGRAMME" && selectedSemester) {
      const valid = programmeClasses.some((item) => item.semesterId === selectedSemester);
      if (!valid) setSelectedProgrammeClass("");
    }
  }, [selectedMode, selectedSemester, programmeClasses]);

  const visibleProgrammeClasses = programmeClasses.filter(
    (item) => !selectedSemester || item.semesterId === selectedSemester
  );

  useEffect(() => {
    if (selectedBatch && !filteredBatches.some((item) => item.batch.id === selectedBatch)) {
      setSelectedBatch("");
    }
  }, [selectedProgramme, selectedSemester, selectedCourse, selectedMode, filteredBatches, selectedBatch]);

  const loadBatchData = useCallback(async () => {
    if (!selectedBatch) return;

    setLoading(true);

    try {
      const [batchRes, attRes] = await Promise.all([
        fetch(`/api/batches/${selectedBatch}`),
        fetch(
          `/api/attendance?batchId=${selectedBatch}&classId=${activeClassId}&date=${selectedDate}`
        ),
      ]);

      const batchData = await batchRes.json();
      const attData = await attRes.json();

      const students: EnrolledStudent[] = batchData.students || [];
      setEnrolledStudents(students);

      const existingAtt: AttendanceRecord[] = attData.attendance || [];
      setExisting(existingAtt);

      setSelectedStudents(students.filter((s) => s.student).map((s) => s.student!.id));

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
  }, [selectedBatch, selectedDate, activeClassId]);

  useEffect(() => {
    loadBatchData();
  }, [loadBatchData]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);

    const records = enrolledStudents
      .filter((s) => s.student && selectedStudents.includes(s.student.id))
      .map((s) => ({
        studentId: s.student!.id,
        batchId: selectedBatch,
        date: selectedDate,
        status: marks[s.student!.id] || "PRESENT",
        classId: activeClassId,
        classType: selectedMode,
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-4">
            <label className="form-label">Attendance Type</label>
            <div className="flex gap-2">
              <button type="button" onClick={() => setSelectedMode("PROGRAMME")} className={`btn ${selectedMode === "PROGRAMME" ? "btn-primary" : "btn-outline"}`}>Programme</button>
              <button type="button" onClick={() => setSelectedMode("COURSE")} className={`btn ${selectedMode === "COURSE" ? "btn-primary" : "btn-outline"}`}>Course</button>
            </div>
          </div>

          {selectedMode === "PROGRAMME" ? (
            <>
              <div>
                <label className="form-label">1. Select Programme</label>
                <select className="form-select" value={selectedProgramme} onChange={(e) => setSelectedProgramme(e.target.value)}>
                  <option value="">Choose programme...</option>
                  {programmes.map((p) => (
                    <option key={p.id} value={p.id}>{p.code ? `${p.code} — ${p.name}` : p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">2. Select Semester</label>
                <select className="form-select" value={selectedSemester} disabled={!selectedProgramme} onChange={(e) => {
                  setSelectedSemester(e.target.value);
                  setSelectedProgrammeClass("");
                  setSelectedBatch("");
                }}>
                  <option value="">Choose semester...</option>
                  {semesters.map((s) => (
                    <option key={s.id} value={s.id}>Semester {s.semesterNo} — {s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">3. Select Class</label>
                <select className="form-select" value={selectedProgrammeClass} disabled={!selectedSemester} onChange={(e) => {
                  setSelectedProgrammeClass(e.target.value);
                  setSelectedBatch("");
                }}>
                  <option value="">Choose class...</option>
                  {visibleProgrammeClasses.map((item) => (
                    <option key={item.id} value={item.id}>Class {item.classNo} — {item.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">4. Select Batch</label>
                <select className="form-select" value={selectedBatch} disabled={!selectedProgrammeClass} onChange={(e) => setSelectedBatch(e.target.value)}>
                  <option value="">Choose batch...</option>
                  {filteredBatches.map((b) => (
                    <option key={b.batch.id} value={b.batch.id}>
                      {b.batch.name}{b.batch.courseName ? ` — ${b.batch.courseName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <>
              <div>
                <label className="form-label">1. Select Course</label>
                <select className="form-select" value={selectedCourse} onChange={(e) => {
                  setSelectedCourse(e.target.value);
                  setSelectedCourseClass("");
                  setSelectedBatch("");
                }}>
                  <option value="">Choose course...</option>
                  {filteredCourses.map((course) => (
                    <option key={course.id} value={course.id}>{course.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">2. Select Class</label>
                <select className="form-select" value={selectedCourseClass} disabled={!selectedCourse} onChange={(e) => {
                  setSelectedCourseClass(e.target.value);
                  setSelectedBatch("");
                }}>
                  <option value="">Choose class...</option>
                  {courseClasses.map((item) => (
                    <option key={item.id} value={item.id}>Class {item.classNo} — {item.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label">3. Select Batch</label>
                <select className="form-select" value={selectedBatch} disabled={!selectedCourseClass} onChange={(e) => setSelectedBatch(e.target.value)}>
                  <option value="">Choose batch...</option>
                  {filteredBatches.map((b) => (
                    <option key={b.batch.id} value={b.batch.id}>
                      {b.batch.name}{b.batch.programmeName ? ` — ${b.batch.programmeName}` : ""}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          <div>
            <label className="form-label">{selectedMode === "PROGRAMME" ? "5. Date" : "4. Date"}</label>
            <input type="date" className="form-input" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} />
          </div>
        </div>
      </div>
      {selectedBatch && activeClassId && (
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
                  disabled={saving || selectedStudents.length === 0}
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
              <div className="mb-4 flex items-center justify-between rounded-xl bg-blue-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-blue-800">Class selected</p>
                  <p className="text-xs text-blue-600">
                    {selectedMode === "PROGRAMME" ? `Semester ${activeClass?.semesterNo ?? ""} — ` : ""}
                    Class {activeClass?.classNo ?? ""} — {activeClass?.title ?? ""}
                  </p>
                </div>
                <label className="text-xs font-medium text-blue-700 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedStudents.length === enrolledStudents.filter((s) => s.student).length && enrolledStudents.length > 0}
                    onChange={(e) => setSelectedStudents(e.target.checked
                      ? enrolledStudents.filter((s) => s.student).map((s) => s.student!.id)
                      : [])}
                  />
                  Select all students
                </label>
              </div>
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
                        <input
                          type="checkbox"
                          checked={selectedStudents.includes(s.id)}
                          onChange={(e) =>
                            setSelectedStudents((prev) =>
                              e.target.checked ? [...prev, s.id] : prev.filter((id) => id !== s.id)
                            )
                          }
                        />
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

      {(!selectedBatch || !activeClassId) && (
        <div className="card text-center py-16">
          <div className="text-5xl mb-4">✅</div>

          <p className="text-slate-500 font-medium">
            Select {selectedMode === "PROGRAMME" ? "programme → semester → class → batch" : "course → class → batch"} to take attendance
          </p>

          <p className="text-sm text-slate-400 mt-1">
            Then select the students who are present in this attendance session.
          </p>
        </div>
      )}
    </div>
  );
}
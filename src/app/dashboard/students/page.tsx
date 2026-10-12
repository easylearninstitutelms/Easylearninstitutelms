"use client";
import { useState, useEffect, useCallback } from "react";
import { getStatusColor, getInitials, formatDate } from "@/lib/utils";

interface Student {
  id: string;
  studentId: string;
  name: string;
  phone: string;
  guardianName: string;
  guardianPhone: string;
  gender: string;
  admissionDate: string;
  status: string;
  currentSemester?: number;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  // Modals state
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [showIdCardModal, setShowIdCardModal] = useState(false);
  const [showMarksheetModal, setShowMarksheetModal] = useState(false);

  // Promote states
  const [nextSemester, setNextSemester] = useState(2);
  const [semesterFee, setSemesterFee] = useState("");
  const [promoting, setPromoting] = useState(false);

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ search, status: statusFilter });
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

  async function handleArchive(id: string) {
    if (!confirm("Archive this student?")) return;
    await fetch(`/api/students/${id}`, { method: "DELETE" });
    fetchStudents();
  }

  function openPromote(student: Student) {
    setSelectedStudent(student);
    setNextSemester((student.currentSemester || 1) + 1);
    setSemesterFee("");
    setShowPromoteModal(true);
  }

  async function handlePromoteSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setPromoting(true);
    try {
      const res = await fetch("/api/students/promote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          studentId: selectedStudent.id,
          nextSemester: nextSemester,
          feeAmount: semesterFee || 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      alert(data.message || "প্রমোট সফল হয়েছে!");
      setShowPromoteModal(false);
      fetchStudents();
    } catch (err: any) {
      alert(err.message || "প্রমোট ব্যর্থ হয়েছে");
    } finally {
      setPromoting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Students</h1>
          <p className="text-sm text-slate-500">{total} students found</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <input
            className="form-input"
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
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Student</th>
                  <th>ID</th>
                  <th>Semester</th>
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
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600">
                          {getInitials(s.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.gender || "MALE"}</p>
                        </div>
                      </div>
                    </td>
                    <td><span className="badge badge-blue">{s.studentId}</span></td>
                    <td>
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold">
                        Sem {s.currentSemester || 1}
                      </span>
                    </td>
                    <td className="text-slate-500">{s.phone || "-"}</td>
                    <td>
                      <div>
                        <p className="text-sm text-slate-600">{s.guardianName || "-"}</p>
                        <p className="text-xs text-slate-400">{s.guardianPhone || ""}</p>
                      </div>
                    </td>
                    <td className="text-slate-500">{formatDate(s.admissionDate)}</td>
                    <td><span className={`badge ${getStatusColor(s.status)}`}>{s.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Promote Button */}
                        <button
                          onClick={() => openPromote(s)}
                          className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold"
                          title="Promote Semester"
                        >
                          🎓 Promote
                        </button>

                        {/* ID Card Button */}
                        <button
                          onClick={() => { setSelectedStudent(s); setShowIdCardModal(true); }}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold"
                          title="View Student ID Card"
                        >
                          🪪 ID Card
                        </button>

                        {/* Marksheet Button */}
                        <button
                          onClick={() => { setSelectedStudent(s); setShowMarksheetModal(true); }}
                          className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold"
                          title="View Marksheet"
                        >
                          📊 Marksheet
                        </button>

                        {/* Archive Button */}
                        {s.status !== "ARCHIVED" && (
                          <button
                            onClick={() => handleArchive(s.id)}
                            className="p-1 text-red-500 hover:text-red-700"
                            title="Archive"
                          >
                            🗑️
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

      {/* 1. PROMOTE SEMESTER MODAL */}
      {showPromoteModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title font-bold text-slate-800">সেমিস্টার প্রমোট করুন</h2>
              <button onClick={() => setShowPromoteModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handlePromoteSubmit}>
              <div className="modal-body space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                  <p><strong>শিক্ষার্থী:</strong> {selectedStudent.name}</p>
                  <p><strong>বর্তমান সেমিস্টার:</strong> Semester {selectedStudent.currentSemester || 1}</p>
                </div>
                <div>
                  <label className="form-label text-xs font-semibold">নতুন সেমিস্টার নম্বর *</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={nextSemester}
                    onChange={(e) => setNextSemester(Number(e.target.value))}
                    className="form-input"
                  />
                </div>
                <div>
                  <label className="form-label text-xs font-semibold">নতুন সেমিস্টার ফি (৳)</label>
                  <input
                    type="number"
                    placeholder="টাকা লিখুন"
                    value={semesterFee}
                    onChange={(e) => setSemesterFee(e.target.value)}
                    className="form-input"
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowPromoteModal(false)} className="btn btn-outline text-xs">বাতিল</button>
                <button type="submit" disabled={promoting} className="btn btn-primary text-xs">
                  {promoting ? "প্রমোট হচ্ছে..." : "কনফার্ম প্রমোট"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. STUDENT ID CARD MODAL */}
      {showIdCardModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title font-bold text-slate-800">Student Identity Card</h2>
              <button onClick={() => setShowIdCardModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="modal-body p-6">
              {/* ID Card Front Frame */}
              <div id="printable-id-card" className="border-2 border-blue-600 rounded-2xl overflow-hidden shadow-lg bg-white">
                <div className="bg-blue-600 text-white text-center py-3 px-2">
                  <h3 className="font-extrabold text-sm tracking-wide uppercase">Easylearn Institute</h3>
                  <p className="text-[10px] text-blue-100">STUDENT IDENTITY CARD</p>
                </div>
                <div className="p-4 flex flex-col items-center text-center">
                  <div className="w-20 h-20 bg-blue-100 border-2 border-blue-500 rounded-full flex items-center justify-center text-2xl font-black text-blue-700 mb-3 shadow-inner">
                    {getInitials(selectedStudent.name)}
                  </div>
                  <h4 className="font-bold text-slate-800 text-base">{selectedStudent.name}</h4>
                  <span className="px-3 py-0.5 bg-blue-50 text-blue-700 text-xs font-mono font-bold rounded-full mt-1 border border-blue-200">
                    ID: {selectedStudent.studentId}
                  </span>

                  <div className="w-full mt-4 space-y-1.5 text-left text-xs border-t border-slate-100 pt-3 text-slate-600">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Semester:</span>
                      <span className="font-bold text-purple-700">Semester {selectedStudent.currentSemester || 1}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Phone:</span>
                      <span className="font-medium text-slate-700">{selectedStudent.phone || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Guardian:</span>
                      <span className="font-medium text-slate-700">{selectedStudent.guardianName || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Admitted:</span>
                      <span className="font-medium text-slate-700">{formatDate(selectedStudent.admissionDate)}</span>
                    </div>
                  </div>

                  <div className="w-full mt-5 pt-3 border-t border-dashed border-slate-200 flex justify-between items-center text-[10px] text-slate-400">
                    <span>Valid Student</span>
                    <span className="font-serif italic border-b border-slate-400 pb-0.5">Principal Sign</span>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowIdCardModal(false)} className="btn btn-outline text-xs">বন্ধ করুন</button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary text-xs"
              >
                🖨️ Print ID Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. MARKSHEET MODAL */}
      {showMarksheetModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-box max-w-lg">
            <div className="modal-header">
              <h2 className="modal-title font-bold text-slate-800">Academic Marksheet</h2>
              <button onClick={() => setShowMarksheetModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <div className="modal-body p-6">
              <div className="border border-slate-200 rounded-xl p-5 bg-white shadow-sm">
                <div className="text-center border-b pb-3 mb-4">
                  <h3 className="font-black text-base text-slate-800 uppercase">Easylearn Institute</h3>
                  <p className="text-xs text-slate-500">Progress Report & Academic Transcript</p>
                  <p className="text-[11px] font-bold text-blue-600 mt-1">
                    Semester {selectedStudent.currentSemester || 1} Examination
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs mb-4 p-2.5 bg-slate-50 rounded-lg">
                  <div>
                    <span className="text-slate-400">Student Name: </span>
                    <strong className="text-slate-700">{selectedStudent.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Student ID: </span>
                    <strong className="font-mono text-slate-700">{selectedStudent.studentId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Session: </span>
                    <strong className="text-slate-700">2026</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Current Semester: </span>
                    <strong className="text-purple-700">Sem {selectedStudent.currentSemester || 1}</strong>
                  </div>
                </div>

                {/* Marksheet Table */}
                <table className="w-full text-xs text-left border border-slate-200">
                  <thead className="bg-slate-100 font-bold text-slate-700">
                    <tr>
                      <th className="p-2 border">Subject</th>
                      <th className="p-2 border text-center">Total Marks</th>
                      <th className="p-2 border text-center">Obtained</th>
                      <th className="p-2 border text-center">Grade</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border font-medium">Programming Fundamentals</td>
                      <td className="p-2 border text-center">100</td>
                      <td className="p-2 border text-center font-bold text-blue-600">88</td>
                      <td className="p-2 border text-center font-bold text-emerald-600">A+</td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">Database Management</td>
                      <td className="p-2 border text-center">100</td>
                      <td className="p-2 border text-center font-bold text-blue-600">82</td>
                      <td className="p-2 border text-center font-bold text-emerald-600">A+</td>
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium">Web Development with AI</td>
                      <td className="p-2 border text-center">100</td>
                      <td className="p-2 border text-center font-bold text-blue-600">91</td>
                      <td className="p-2 border text-center font-bold text-emerald-600">A+</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-slate-50 font-bold">
                    <tr>
                      <td className="p-2 border">Cumulative Result (GPA)</td>
                      <td colSpan={3} className="p-2 border text-center text-emerald-700">
                        GPA 5.00 / 5.00 (Passed with Distinction)
                      </td>
                    </tr>
                  </tfoot>
                </table>

                <div className="flex justify-between items-end mt-8 pt-4 text-[11px] text-slate-500">
                  <div>
                    <p>Date of Issue: {new Date().toLocaleDateString("en-BD")}</p>
                  </div>
                  <div className="text-center border-t border-slate-400 px-4 pt-1 font-semibold text-slate-700">
                    Controller of Examination
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" onClick={() => setShowMarksheetModal(false)} className="btn btn-outline text-xs">বন্ধ করুন</button>
              <button
                type="button"
                onClick={() => window.print()}
                className="btn btn-primary text-xs"
              >
                🖨️ Print Marksheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
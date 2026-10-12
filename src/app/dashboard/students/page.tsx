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
  enrolledTrack?: string;
  trackType?: "COURSE" | "PROGRAMME";
}

interface InstituteInfo {
  name: string;
  address: string;
  phone: string;
}

export default function StudentsPage() {
  const [students, setStudents] = useState<Student[]>([]);
  const [institute, setInstitute] = useState<InstituteInfo>({
    name: "Easylearn Institute",
    address: "Gazipur / Dhaka, Bangladesh",
    phone: "01345064696",
  });
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
      if (data.institute) setInstitute(data.institute);
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
                  <th>Course / Programme</th>
                  <th>Semester</th>
                  <th>Phone</th>
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
                    <td><span className="badge badge-blue font-mono">{s.studentId}</span></td>
                    <td>
                      <div>
                        <p className="font-medium text-xs text-slate-800">{s.enrolledTrack || "Web Design With AI 212"}</p>
                        <span className="text-[10px] text-blue-600 font-semibold">{s.trackType === "PROGRAMME" ? "Programme" : "Course"}</span>
                      </div>
                    </td>
                    <td>
                      <span className="px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded text-xs font-bold">
                        Sem {s.currentSemester || 1}
                      </span>
                    </td>
                    <td className="text-slate-500 text-xs">{s.phone || "-"}</td>
                    <td className="text-slate-500 text-xs">{formatDate(s.admissionDate)}</td>
                    <td><span className={`badge ${getStatusColor(s.status)}`}>{s.status}</span></td>
                    <td>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {/* Promote */}
                        <button
                          onClick={() => openPromote(s)}
                          className="px-2 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold"
                          title="Promote Semester"
                        >
                          🎓 Promote
                        </button>

                        {/* ID Card (2-Parts) */}
                        <button
                          onClick={() => { setSelectedStudent(s); setShowIdCardModal(true); }}
                          className="px-2 py-1 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 rounded-lg text-xs font-semibold"
                          title="2-Part ID Card"
                        >
                          🪪 ID Card
                        </button>

                        {/* Marksheet (Course or Programme Semester) */}
                        <button
                          onClick={() => { setSelectedStudent(s); setShowMarksheetModal(true); }}
                          className="px-2 py-1 bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200 rounded-lg text-xs font-semibold"
                          title="Official Marksheet"
                        >
                          📊 Marksheet
                        </button>

                        {/* Archive */}
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
                  <label className="form-label text-xs font-semibold">পরবর্তী সেমিস্টার নম্বর *</label>
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
                    placeholder="টাকার পরিমাণ লিখুন"
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

      {/* 2. TWO-PART ID CARD MODAL (FRONT & BACK SIDE) */}
      {showIdCardModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-box max-w-2xl">
            <div className="modal-header">
              <div>
                <h2 className="modal-title font-bold text-slate-800">Student Identity Card (Front & Back)</h2>
                <p className="text-xs text-slate-500">অফিসিয়াল দুই পাশের পিভিসি আইডি কার্ড</p>
              </div>
              <button onClick={() => setShowIdCardModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="modal-body p-6">
              <div id="printable-id-card" className="grid grid-cols-1 md:grid-cols-2 gap-6 justify-center">
                
                {/* --- FRONT PART --- */}
                <div className="border-2 border-blue-600 rounded-2xl overflow-hidden shadow-md bg-white flex flex-col justify-between h-[360px]">
                  <div className="bg-gradient-to-r from-blue-700 to-blue-600 text-white text-center py-3 px-2 shadow">
                    <h3 className="font-black text-sm tracking-wide uppercase">{institute.name}</h3>
                    <p className="text-[10px] text-blue-100 font-semibold">STUDENT IDENTITY CARD</p>
                  </div>

                  <div className="p-4 flex flex-col items-center text-center">
                    <div className="w-20 h-20 bg-blue-50 border-2 border-blue-500 rounded-full flex items-center justify-center text-2xl font-black text-blue-700 shadow-inner mb-2">
                      {getInitials(selectedStudent.name)}
                    </div>
                    <h4 className="font-bold text-slate-800 text-base">{selectedStudent.name}</h4>
                    <span className="px-2.5 py-0.5 bg-blue-100 text-blue-800 text-xs font-mono font-bold rounded-full mt-1 border border-blue-300">
                      ID: {selectedStudent.studentId}
                    </span>

                    <div className="w-full mt-3 space-y-1 text-left text-xs border-t border-slate-100 pt-2 text-slate-600">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Enrolled:</span>
                        <span className="font-bold text-blue-700 truncate max-w-[150px]">
                          {selectedStudent.enrolledTrack || "Web Design With AI 212"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Track Type:</span>
                        <span className="font-semibold text-slate-700">
                          {selectedStudent.trackType === "PROGRAMME" ? "Programme" : "Certificate Course"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Semester:</span>
                        <span className="font-bold text-purple-700">Semester {selectedStudent.currentSemester || 1}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Admitted:</span>
                        <span className="font-medium text-slate-700">{formatDate(selectedStudent.admissionDate)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 text-center text-[10px] text-blue-700 font-bold uppercase tracking-wider">
                    Front Side • কার্ডের সামনের অংশ
                  </div>
                </div>

                {/* --- BACK PART --- */}
                <div className="border-2 border-slate-400 rounded-2xl overflow-hidden shadow-md bg-white flex flex-col justify-between h-[360px]">
                  <div className="bg-slate-800 text-white text-center py-2 px-2">
                    <h3 className="font-bold text-xs uppercase tracking-wider">Terms & Instructions</h3>
                    <p className="text-[9px] text-slate-300">নির্দেশনাবলী ও শর্তাবলী</p>
                  </div>

                  <div className="p-4 flex flex-col justify-between flex-1 text-xs text-slate-600 space-y-2">
                    <ul className="list-disc pl-4 space-y-1.5 text-[11px] leading-tight text-slate-600">
                      <li>এই কার্ডটি হস্তান্তরযোগ্য নহে এবং ক্যাম্পাসে সর্বদা সাথে রাখা বাধ্যতামূলক।</li>
                      <li>কার্ড হারিয়ে গেলে তাৎক্ষণিকভাবে কর্তৃপক্ষকে অবহিত করতে হবে।</li>
                      <li>কার্ডটি পাওয়া গেলে নিচের ঠিকানায় জমা দেওয়ার অনুরোধ করা যাচ্ছে।</li>
                    </ul>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-[11px] space-y-1">
                      <p className="font-bold text-slate-800">{institute.name}</p>
                      <p className="text-slate-500">📍 {institute.address}</p>
                      <p className="text-slate-600 font-mono font-semibold">📞 Helpline: {institute.phone}</p>
                    </div>

                    <div className="flex justify-between items-end pt-2 border-t border-dashed border-slate-300 text-[10px]">
                      <div>
                        <span className="font-mono text-slate-400">||| ||||| |||| ||</span>
                        <p className="text-[9px] text-slate-400">System Verified</p>
                      </div>
                      <div className="text-center">
                        <span className="font-serif italic text-slate-800 border-b border-slate-600 pb-0.5 block px-2">
                          M. A. Kaiyum
                        </span>
                        <span className="text-[9px] text-slate-500">Authorized Signature</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-50 px-3 py-1.5 border-t border-slate-200 text-center text-[10px] text-slate-600 font-bold uppercase tracking-wider">
                    Back Side • কার্ডের পেছনের অংশ
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
                🖨️ Print 2-Part ID Card
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. OFFICIAL MARKSHEET (COURSE OR PROGRAMME SEMESTER WISE) */}
      {showMarksheetModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-box max-w-2xl">
            <div className="modal-header">
              <div>
                <h2 className="modal-title font-bold text-slate-800">Student Academic Marksheet</h2>
                <p className="text-xs text-slate-500">অফিসিয়াল ট্রান্সক্রিপ্ট ও গ্রেডশীট</p>
              </div>
              <button onClick={() => setShowMarksheetModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            <div className="modal-body p-6">
              <div id="printable-marksheet" className="border-2 border-slate-300 rounded-2xl p-6 bg-white shadow-sm space-y-5">
                
                {/* Header with Logo and Address */}
                <div className="text-center border-b-2 border-slate-800 pb-4">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl text-white font-black text-xl mb-1 shadow-md">
                    E
                  </div>
                  <h3 className="font-black text-xl text-slate-800 uppercase tracking-wide">{institute.name}</h3>
                  <p className="text-xs text-slate-600 font-medium">📍 {institute.address} • Helpline: {institute.phone}</p>
                  <div className="mt-2 inline-block px-4 py-1 bg-blue-50 border border-blue-200 rounded-full">
                    <span className="text-xs font-black text-blue-800 uppercase tracking-widest">
                      ACADEMIC TRANSCRIPT & MARKSHEET
                    </span>
                  </div>
                </div>

                {/* Track Details: Course or Programme with Semester */}
                <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400">Student Name: </span>
                    <strong className="text-slate-800 text-sm block">{selectedStudent.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Student ID: </span>
                    <strong className="text-blue-700 font-mono text-sm block">{selectedStudent.studentId}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Curriculum: </span>
                    <strong className="text-slate-800 block">
                      {selectedStudent.trackType === "PROGRAMME"
                        ? `Programme: ${selectedStudent.enrolledTrack || "Web Development with AI"}`
                        : `Course: ${selectedStudent.enrolledTrack || "Web Design With AI 212"}`}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Evaluation Term: </span>
                    <strong className="text-purple-700 font-bold block">
                      {selectedStudent.trackType === "PROGRAMME"
                        ? `Semester ${selectedStudent.currentSemester || 1} Final Examination`
                        : "Course Final Evaluation"}
                    </strong>
                  </div>
                </div>

                {/* Subjects & Marks Table */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 font-bold text-slate-700 border-b">
                      <tr>
                        <th className="p-2.5">Subject / Module</th>
                        <th className="p-2.5 text-center">Total Marks</th>
                        <th className="p-2.5 text-center">Obtained Marks</th>
                        <th className="p-2.5 text-center">Letter Grade</th>
                        <th className="p-2.5 text-center">Grade Point</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="p-2.5 font-medium text-slate-700">UI/UX Design & AI Prompt Engineering</td>
                        <td className="p-2.5 text-center">100</td>
                        <td className="p-2.5 text-center font-bold text-blue-600">89</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">A+</td>
                        <td className="p-2.5 text-center font-bold">4.00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-700">Frontend Development (React & Tailwind)</td>
                        <td className="p-2.5 text-center">100</td>
                        <td className="p-2.5 text-center font-bold text-blue-600">84</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">A+</td>
                        <td className="p-2.5 text-center font-bold">4.00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-700">Database & API Integration Architecture</td>
                        <td className="p-2.5 text-center">100</td>
                        <td className="p-2.5 text-center font-bold text-blue-600">92</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">A+</td>
                        <td className="p-2.5 text-center font-bold">4.00</td>
                      </tr>
                      <tr>
                        <td className="p-2.5 font-medium text-slate-700">Final Capstone Project & Viva</td>
                        <td className="p-2.5 text-center">100</td>
                        <td className="p-2.5 text-center font-bold text-blue-600">88</td>
                        <td className="p-2.5 text-center font-bold text-emerald-600">A+</td>
                        <td className="p-2.5 text-center font-bold">4.00</td>
                      </tr>
                    </tbody>
                    <tfoot className="bg-slate-50 font-bold border-t">
                      <tr>
                        <td className="p-2.5">Cumulative Evaluation (GPA)</td>
                        <td className="p-2.5 text-center">400</td>
                        <td className="p-2.5 text-center text-blue-700">353</td>
                        <td colSpan={2} className="p-2.5 text-center text-emerald-700 font-extrabold text-sm">
                          GPA 4.00 / 4.00 (Passed with Distinction)
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Signatures & Footer */}
                <div className="flex justify-between items-end pt-8 text-[11px] text-slate-500">
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 border-t border-slate-400 pt-1 px-3">Course Coordinator</p>
                    <p className="text-[10px]">Academic Wing</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 border-t border-slate-400 pt-1 px-3">Controller of Examination</p>
                    <p className="text-[10px]">Easylearn Institute</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-slate-700 border-t border-slate-400 pt-1 px-3">Principal / Director</p>
                    <p className="text-[10px]">Head of Institute</p>
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
                🖨️ Print Marksheet (A4)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
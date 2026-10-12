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
  current_semester?: number;
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

  // Promote Semester States
  const [showPromoteModal, setShowPromoteModal] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
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

  useEffect(() => {
    fetch("/api/batches")
      .then((r) => r.json())
      .then((d) => setBatches(d.batches || []));
  }, []);

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
    await fetch(`/api/students/${id}`, { method: "DELETE" });
    fetchStudents();
  }

  function openPromoteModal(student: Student) {
    setSelectedStudent(student);
    const curr = student.current_semester || 1;
    setNextSemester(curr + 1);
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

      alert(data.message || "শিক্ষার্থীকে নতুন সেমিস্টারে প্রমোট করা হয়েছে!");
      setShowPromoteModal(false);
      fetchStudents();
    } catch (err: any) {
      alert(err.message || "প্রমোট করতে সমস্যা হয়েছে");
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
        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
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
            <p className="text-slate-500 font-medium">No students found</p>
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
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-xs font-bold text-blue-600 flex-shrink-0">
                          {getInitials(s.name)}
                        </div>
                        <div>
                          <p className="font-semibold text-slate-700">{s.name}</p>
                          <p className="text-xs text-slate-400">{s.gender || " "}</p>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span className="badge badge-blue">{s.studentId}</span>
                    </td>
                    <td>
                      <span className="px-2.5 py-1 bg-purple-50 text-purple-700 border border-purple-200 rounded-lg text-xs font-bold">
                        Sem {s.current_semester || 1}
                      </span>
                    </td>
                    <td className="text-slate-500">{s.phone || " "}</td>
                    <td>
                      <div>
                        <p className="text-sm text-slate-600">{s.guardianName || " "}</p>
                        <p className="text-xs text-slate-400">{s.guardianPhone || ""}</p>
                      </div>
                    </td>
                    <td className="text-slate-500">{formatDate(s.admissionDate)}</td>
                    <td>
                      <span className={`badge ${getStatusColor(s.status)}`}>{s.status}</span>
                    </td>
                    <td>
                      <div className="flex items-center gap-1.5">
                        {/* Promote Button */}
                        <button
                          onClick={() => openPromoteModal(s)}
                          className="px-2.5 py-1 bg-blue-50 text-blue-600 hover:bg-blue-100 border border-blue-200 rounded-lg text-xs font-semibold transition"
                          title="Promote Semester"
                        >
                          🎓 Promote
                        </button>

                        {/* Archive Button */}
                        {s.status !== "ARCHIVED" && (
                          <button
                            onClick={() => handleArchive(s.id)}
                            className="p-1 text-red-500 hover:text-red-700 transition"
                            title="Archive"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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

      {/* Promote Semester Modal */}
      {showPromoteModal && selectedStudent && (
        <div className="modal-overlay">
          <div className="modal-box max-w-sm">
            <div className="modal-header">
              <h2 className="modal-title font-bold text-slate-800">সেমিস্টার প্রমোট করুন</h2>
              <button onClick={() => setShowPromoteModal(false)} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>
            <form onSubmit={handlePromoteSubmit}>
              <div className="modal-body space-y-4">
                <div className="p-3 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800 space-y-1">
                  <p><strong>শিক্ষার্থীর নাম:</strong> {selectedStudent.name}</p>
                  <p><strong>বর্তমান সেমিস্টার:</strong> Semester {selectedStudent.current_semester || 1}</p>
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
                  <label className="form-label text-xs font-semibold">নতুন সেমিস্টারের ফি (৳) (ঐচ্ছিক)</label>
                  <input
                    type="number"
                    placeholder="টাকার পরিমাণ লিখুন (যেমন: ৩০০০)"
                    value={semesterFee}
                    onChange={(e) => setSemesterFee(e.target.value)}
                    className="form-input"
                  />
                  <p className="text-[11px] text-slate-400 mt-1">ফি লিখলে ছাত্রের অ্যাকাউন্টে স্বয়ংক্রিয়ভাবে বকেয়া যুক্ত হবে।</p>
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

      {/* Add Student Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">Add New Student</h2>
              <button onClick={() => setShowModal(false)} className="btn btn-ghost btn-sm">✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm">{error}</div>}
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="form-label">Full Name *</label>
                    <input className="form-input" placeholder="Student name" value={form.name} onChange={e => setForm({...form, name: e.target.value})} required />
                  </div>
                  <div>
                    <label className="form-label">Phone</label>
                    <input className="form-input" placeholder="01XXXXXXXXX" value={form.phone} onChange={e => setForm({...form, phone: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Gender</label>
                    <select className="form-select" value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}>
                      <option value="">Select</option>
                      <option value="MALE">Male</option>
                      <option value="FEMALE">Female</option>
                      <option value="OTHER">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="form-label">Guardian Name</label>
                    <input className="form-input" placeholder="Parent/Guardian" value={form.guardianName} onChange={e => setForm({...form, guardianName: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Guardian Phone</label>
                    <input className="form-input" placeholder="01XXXXXXXXX" value={form.guardianPhone} onChange={e => setForm({...form, guardianPhone: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Date of Birth</label>
                    <input type="date" className="form-input" value={form.dob} onChange={e => setForm({...form, dob: e.target.value})} />
                  </div>
                  <div>
                    <label className="form-label">Admission Date *</label>
                    <input type="date" className="form-input" value={form.admissionDate} onChange={e => setForm({...form, admissionDate: e.target.value})} required />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Address</label>
                    <input className="form-input" placeholder="Full address" value={form.address} onChange={e => setForm({...form, address: e.target.value})} />
                  </div>
                  <div className="col-span-2">
                    <label className="form-label">Enroll in Batch (optional)</label>
                    <select className="form-select" value={form.batchId} onChange={e => setForm({...form, batchId: e.target.value})}>
                      <option value="">No batch</option>
                      {batches.map(b => (
                        <option key={b.batch.id} value={b.batch.id}>{b.batch.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-outline">Cancel</button>
                <button type="submit" disabled={submitting} className="btn btn-primary">
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
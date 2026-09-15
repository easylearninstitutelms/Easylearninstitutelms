"use client";

import { useState, useEffect, useCallback } from "react";
import {
  getStatusColor,
  formatCurrency,
  formatDate,
} from "@/lib/utils";

interface ProgrammeSemester {
  id: string;
  semesterNo: number;
  name: string;
}

interface Programme {
  id: string;
  name: string;
  code?: string | null;
  semesters: ProgrammeSemester[];
}

interface BatchRow {
  batch: {
    id: string;
    name: string;
    room: string;
    startDate: string;
    endDate: string;
    fee: string;
    status: string;
    programmeId?: string | null;
    semesterId?: string | null;
  };
  courseName: string;
  teacherName: string;
  studentCount: number;
  programmeName?: string | null;
  semesterName?: string | null;
}

export default function BatchesPage() {
  const [batches, setBatches] = useState<BatchRow[]>([]);
  const [loading, setLoading] = useState(true);

  const [showModal, setShowModal] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] = useState("");

  const [courses, setCourses] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [staffList, setStaffList] = useState<
    Array<{ id: string; name: string }>
  >([]);

  const [programmes, setProgrammes] =
    useState<Programme[]>([]);

  const [form, setForm] = useState({
    name: "",
    courseId: "",
    programmeId: "",
    semesterId: "",
    teacherId: "",
    room: "",
    startDate: "",
    endDate: "",
    fee: "",
  });

  const fetchBatches = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/batches");

      if (!res.ok) {
        throw new Error("Failed to load batches");
      }

      const data = await res.json();

      setBatches(data.batches || []);
    } catch (err) {
      console.error(err);
      setBatches([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBatches();
  }, [fetchBatches]);

  useEffect(() => {
    async function loadOptions() {
      try {
        const [
          coursesRes,
          staffRes,
          programmesRes,
        ] = await Promise.all([
          fetch("/api/courses"),
          fetch("/api/staff"),
          fetch("/api/programmes"),
        ]);

        const coursesData =
          await coursesRes.json();

        const staffData =
          await staffRes.json();

        const programmesData =
          await programmesRes.json();

        setCourses(
          coursesData.courses?.map(
            (c: {
              id: string;
              name: string;
            }) => ({
              id: c.id,
              name: c.name,
            })
          ) || []
        );

        setStaffList(
          staffData.staff?.map(
            (s: {
              id: string;
              name: string;
            }) => ({
              id: s.id,
              name: s.name,
            })
          ) || []
        );

        setProgrammes(
          Array.isArray(programmesData)
            ? programmesData
            : programmesData.programmes || []
        );
      } catch (err) {
        console.error(
          "Failed to load batch options:",
          err
        );
      }
    }

    loadOptions();
  }, []);

  const selectedProgramme =
    programmes.find(
      (p) => p.id === form.programmeId
    );

  const semesters =
    selectedProgramme?.semesters || [];

  function handleProgrammeChange(
    programmeId: string
  ) {
    setForm((prev) => ({
      ...prev,
      programmeId,
      semesterId: "",
    }));

    setError("");
  }

  function handleSemesterChange(
    semesterId: string
  ) {
    setForm((prev) => ({
      ...prev,
      semesterId,
    }));

    setError("");
  }

  function resetForm() {
    setForm({
      name: "",
      courseId: "",
      programmeId: "",
      semesterId: "",
      teacherId: "",
      room: "",
      startDate: "",
      endDate: "",
      fee: "",
    });

    setError("");
  }

  async function handleSubmit(
    e: React.FormEvent
  ) {
    e.preventDefault();

    setSubmitting(true);
    setError("");

    try {
      if (!form.programmeId) {
        setError(
          "Please select a Programme."
        );
        setSubmitting(false);
        return;
      }

      if (!form.semesterId) {
        setError(
          "Please select a Semester."
        );
        setSubmitting(false);
        return;
      }

      const res = await fetch(
        "/api/batches",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(form),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        setError(
          data.error ||
            "Failed to create batch."
        );
        setSubmitting(false);
        return;
      }

      setShowModal(false);
      resetForm();

      await fetchBatches();
    } catch (err) {
      console.error(err);

      setError(
        "Something went wrong. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleArchive(id: string) {
    if (
      !confirm(
        "Archive this batch?"
      )
    ) {
      return;
    }

    try {
      await fetch(
        `/api/batches/${id}`,
        {
          method: "DELETE",
        }
      );

      await fetchBatches();
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Batches
          </h1>

          <p className="text-sm text-slate-500">
            {batches.length} batches
          </p>
        </div>

        <button
          onClick={() => {
            resetForm();
            setShowModal(true);
          }}
          className="btn btn-primary"
        >
          <svg
            className="h-4 w-4"
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

          Add Batch
        </button>
      </div>

      {/* Batch list */}
      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.length === 0 ? (
            <div className="col-span-full py-12 text-center">
              <div className="mb-3 text-4xl">
                🏫
              </div>

              <p className="text-slate-500">
                No batches yet
              </p>

              <button
                onClick={() => {
                  resetForm();
                  setShowModal(true);
                }}
                className="btn btn-primary btn-sm mt-4"
              >
                Create Batch
              </button>
            </div>
          ) : (
            batches.map((row) => (
              <div
                key={row.batch.id}
                className="card transition-shadow hover:shadow-md"
              >
                {/* Batch heading */}
                <div className="mb-3 flex items-start justify-between">
                  <div className="min-w-0">
                    <h3 className="truncate font-bold text-slate-800">
                      {row.batch.name}
                    </h3>

                    {/* Programme */}
                    {row.programmeName ? (
                      <p className="mt-0.5 truncate text-sm font-semibold text-blue-600">
                        {row.programmeName}
                      </p>
                    ) : (
                      <p className="mt-0.5 text-sm text-slate-400">
                        No programme
                      </p>
                    )}

                    {/* Semester */}
                    {row.semesterName && (
                      <span className="mt-1 inline-flex rounded-lg bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-700">
                        {row.semesterName}
                      </span>
                    )}

                    {/* Existing Course */}
                    {row.courseName && (
                      <p className="mt-1 text-xs text-slate-400">
                        Course: {row.courseName}
                      </p>
                    )}
                  </div>

                  <span
                    className={`badge ml-2 flex-shrink-0 ${getStatusColor(
                      row.batch.status
                    )}`}
                  >
                    {row.batch.status}
                  </span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Teacher
                    </span>

                    <span className="font-medium text-slate-700">
                      {row.teacherName || "—"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Room
                    </span>

                    <span className="text-slate-700">
                      {row.batch.room || "—"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Students
                    </span>

                    <span className="font-semibold text-blue-600">
                      {row.studentCount || 0}
                    </span>
                  </div>

                  <div className="flex justify-between gap-3">
                    <span className="text-slate-500">
                      Fee/Month
                    </span>

                    <span className="font-semibold text-slate-700">
                      {row.batch.fee
                        ? formatCurrency(
                            row.batch.fee
                          )
                        : "—"}
                    </span>
                  </div>

                  {row.batch.startDate && (
                    <div className="flex justify-between gap-3">
                      <span className="text-slate-500">
                        Period
                      </span>

                      <span className="text-right text-xs text-slate-600">
                        {formatDate(
                          row.batch.startDate
                        )}{" "}
                        –{" "}
                        {row.batch.endDate
                          ? formatDate(
                              row.batch.endDate
                            )
                          : "—"}
                      </span>
                    </div>
                  )}
                </div>

                {/* Archive */}
                {row.batch.status !==
                  "ARCHIVED" && (
                  <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                    <button
                      onClick={() =>
                        handleArchive(
                          row.batch.id
                        )
                      }
                      className="text-xs text-red-500 transition hover:text-red-700"
                    >
                      Archive
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Add Batch Modal */}
      {showModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (
              e.target === e.currentTarget
            ) {
              setShowModal(false);
            }
          }}
        >
          <div className="modal-box">
            {/* Modal header */}
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Add Batch
                </h2>

                <p className="mt-0.5 text-xs text-slate-400">
                  Assign this batch to a Programme
                  and Semester
                </p>
              </div>

              <button
                onClick={() =>
                  setShowModal(false)
                }
                className="btn btn-ghost btn-sm"
              >
                ✕
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
            >
              <div className="modal-body">
                {/* Error */}
                {error && (
                  <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Batch Name */}
                  <div className="col-span-2">
                    <label className="form-label">
                      Batch Name *
                    </label>

                    <input
                      className="form-input"
                      placeholder="e.g. CSE 1st Semester Batch A"
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

                  {/* Programme */}
                  <div className="col-span-2">
                    <label className="form-label">
                      Programme *
                    </label>

                    <select
                      className="form-select"
                      value={
                        form.programmeId
                      }
                      onChange={(e) =>
                        handleProgrammeChange(
                          e.target.value
                        )
                      }
                      required
                    >
                      <option value="">
                        Select Programme
                      </option>

                      {programmes.map(
                        (programme) => (
                          <option
                            key={
                              programme.id
                            }
                            value={
                              programme.id
                            }
                          >
                            {programme.name}
                            {programme.code
                              ? ` (${programme.code})`
                              : ""}
                          </option>
                        )
                      )}
                    </select>

                    {programmes.length ===
                      0 && (
                      <p className="mt-1 text-xs text-amber-600">
                        No Programme found. Create
                        a Programme first.
                      </p>
                    )}
                  </div>

                  {/* Semester */}
                  <div className="col-span-2">
                    <label className="form-label">
                      Semester *
                    </label>

                    <select
                      className="form-select"
                      value={
                        form.semesterId
                      }
                      onChange={(e) =>
                        handleSemesterChange(
                          e.target.value
                        )
                      }
                      disabled={
                        !form.programmeId
                      }
                      required
                    >
                      <option value="">
                        {!form.programmeId
                          ? "Select Programme first"
                          : "Select Semester"}
                      </option>

                      {semesters.map(
                        (semester) => (
                          <option
                            key={
                              semester.id
                            }
                            value={
                              semester.id
                            }
                          >
                            {semester.name}
                          </option>
                        )
                      )}
                    </select>

                    {selectedProgramme &&
                      semesters.length ===
                        0 && (
                        <p className="mt-1 text-xs text-red-500">
                          This Programme has no
                          semesters.
                        </p>
                      )}
                  </div>

                  {/* Existing Course */}
                  <div>
                    <label className="form-label">
                      Course
                    </label>

                    <select
                      className="form-select"
                      value={
                        form.courseId
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          courseId:
                            e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select course
                      </option>

                      {courses.map(
                        (course) => (
                          <option
                            key={course.id}
                            value={course.id}
                          >
                            {course.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Teacher */}
                  <div>
                    <label className="form-label">
                      Teacher
                    </label>

                    <select
                      className="form-select"
                      value={
                        form.teacherId
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          teacherId:
                            e.target.value,
                        })
                      }
                    >
                      <option value="">
                        Select teacher
                      </option>

                      {staffList.map(
                        (staff) => (
                          <option
                            key={staff.id}
                            value={staff.id}
                          >
                            {staff.name}
                          </option>
                        )
                      )}
                    </select>
                  </div>

                  {/* Room */}
                  <div>
                    <label className="form-label">
                      Room
                    </label>

                    <input
                      className="form-input"
                      placeholder="Room 101"
                      value={form.room}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          room: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Monthly Fee */}
                  <div>
                    <label className="form-label">
                      Monthly Fee (৳)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input"
                      placeholder="0"
                      value={form.fee}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          fee: e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* Start Date */}
                  <div>
                    <label className="form-label">
                      Start Date
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={
                        form.startDate
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          startDate:
                            e.target.value,
                        })
                      }
                    />
                  </div>

                  {/* End Date */}
                  <div>
                    <label className="form-label">
                      End Date
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={
                        form.endDate
                      }
                      onChange={(e) =>
                        setForm({
                          ...form,
                          endDate:
                            e.target.value,
                        })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Footer */}
              <div className="modal-footer">
                <button
                  type="button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  className="btn btn-outline"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !form.programmeId ||
                    !form.semesterId
                  }
                  className="btn btn-primary"
                >
                  {submitting
                    ? "Creating..."
                    : "Create Batch"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
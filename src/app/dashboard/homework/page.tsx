"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { formatDate } from "@/lib/utils";

interface HomeworkItem {
  id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  createdAt?: string | null;
}

interface HwRow {
  homework: HomeworkItem;
  batchName?: string | null;
  courseName?: string | null;
  programmeName?: string | null;
  semesterName?: string | null;
  teacherName?: string | null;
}

interface Course {
  id: string;
  name: string;
  code?: string | null;
}

interface ProgrammeSemester {
  id: string;
  name: string;
  semesterNo?: number | null;
}

interface Programme {
  id: string;
  name: string;
  code?: string | null;
  semesters?: ProgrammeSemester[];
}

interface Semester {
  id: string;
  name: string;
  programmeId?: string | null;
  programme_id?: string | null;
  semesterNo?: number | null;
}

interface Batch {
  id: string;
  name: string;
  programmeId?: string | null;
  semesterId?: string | null;
  courseId?: string | null;
  programmeName?: string | null;
  semesterName?: string | null;
  courseName?: string | null;
}

interface Staff {
  id: string;
  name: string;
}

type TargetType = "course" | "programme" | "batch";

interface FormState {
  courseId: string;
  programmeId: string;
  semesterId: string;
  batchId: string;
  teacherId: string;
  title: string;
  description: string;
  deadline: string;
}

const initialForm: FormState = {
  courseId: "",
  programmeId: "",
  semesterId: "",
  batchId: "",
  teacherId: "",
  title: "",
  description: "",
  deadline: "",
};

export default function HomeworkPage() {
  const [hwList, setHwList] = useState<HwRow[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [staffList, setStaffList] = useState<Staff[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [targetType, setTargetType] =
    useState<TargetType>("course");

  const [form, setForm] =
    useState<FormState>(initialForm);

  const fetchHw = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch("/api/homework", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to load homework"
        );
      }

      setHwList(data.homework || []);
    } catch (err) {
      console.error(err);
      setError("Homework load failed.");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchOptions = useCallback(async () => {
    try {
      setLoadingOptions(true);
      setError("");

      const results = await Promise.all([
        fetch("/api/courses", {
          cache: "no-store",
        }),
        fetch("/api/programmes", {
          cache: "no-store",
        }),
        fetch("/api/batches", {
          cache: "no-store",
        }),
        fetch("/api/staff", {
          cache: "no-store",
        }),
      ]);

      const courseData = await results[0].json();
      const programmeData = await results[1].json();
      const batchData = await results[2].json();
      const staffData = await results[3].json();

      if (!results[0].ok) {
        throw new Error(
          courseData?.error || "Failed to load courses"
        );
      }

      if (!results[1].ok) {
        throw new Error(
          programmeData?.error ||
            "Failed to load programmes"
        );
      }

      if (!results[2].ok) {
        throw new Error(
          batchData?.error || "Failed to load batches"
        );
      }

      if (!results[3].ok) {
        throw new Error(
          staffData?.error || "Failed to load staff"
        );
      }

      const courseRows: Course[] =
        courseData.courses || [];

      const programmeRows: Programme[] =
        programmeData.programmes || [];

      const batchRows = batchData.batches || [];

      const staffRows: Staff[] =
        staffData.staff || [];

      setCourses(courseRows);
      setProgrammes(programmeRows);
      setStaffList(staffRows);

      const semesterRows: Semester[] =
        programmeRows.flatMap((programme) =>
          (programme.semesters || []).map(
            (semester) => ({
              id: semester.id,
              name: semester.name,
              semesterNo:
                semester.semesterNo ?? null,
              programmeId: programme.id,
            })
          )
        );

      setSemesters(semesterRows);

      const normalizedBatches: Batch[] =
        batchRows.map(
          (
            item:
              | Batch
              | {
                  batch: Batch;
                }
          ) => {
            if ("batch" in item && item.batch) {
              return item.batch;
            }

            return item as Batch;
          }
        );

      setBatches(normalizedBatches);
    } catch (err) {
      console.error(
        "Homework options load error:",
        err
      );

      if (err instanceof Error) {
        setError(
          err.message ||
            "Failed to load Course, Programme, Semester or Batch data."
        );
      } else {
        setError(
          "Failed to load Course, Programme, Semester or Batch data."
        );
      }
    } finally {
      setLoadingOptions(false);
    }
  }, []);

  useEffect(() => {
    fetchHw();
  }, [fetchHw]);

  useEffect(() => {
    fetchOptions();
  }, [fetchOptions]);

  const filteredSemesters = useMemo(() => {
    if (!form.programmeId) {
      return [];
    }

    return semesters
      .filter((semester) => {
        const programmeId =
          semester.programmeId ||
          semester.programme_id ||
          "";

        return programmeId === form.programmeId;
      })
      .sort((a, b) => {
        const aNo =
          a.semesterNo ?? Number.MAX_SAFE_INTEGER;

        const bNo =
          b.semesterNo ?? Number.MAX_SAFE_INTEGER;

        return aNo - bNo;
      });
  }, [semesters, form.programmeId]);

  const filteredBatches = useMemo(() => {
    if (targetType === "course") {
      if (!form.courseId) {
        return [];
      }

      return batches.filter(
        (batch) =>
          String(batch.courseId || "") ===
          form.courseId
      );
    }

    if (targetType === "programme") {
      if (
        !form.programmeId ||
        !form.semesterId
      ) {
        return [];
      }

      return batches.filter(
        (batch) =>
          String(batch.programmeId || "") ===
            form.programmeId &&
          String(batch.semesterId || "") ===
            form.semesterId
      );
    }

    return batches;
  }, [
    batches,
    targetType,
    form.courseId,
    form.programmeId,
    form.semesterId,
  ]);

  function openModal() {
    setError("");
    setForm({ ...initialForm });
    setTargetType("course");
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setShowModal(false);
    setError("");
  }

  function changeTargetType(type: TargetType) {
    setTargetType(type);

    setForm((previous) => ({
      ...previous,
      courseId: "",
      programmeId: "",
      semesterId: "",
      batchId: "",
    }));

    setError("");
  }

  function changeCourse(courseId: string) {
    setForm((previous) => ({
      ...previous,
      courseId,
      batchId: "",
    }));

    setError("");
  }

  function changeProgramme(programmeId: string) {
    setForm((previous) => ({
      ...previous,
      programmeId,
      semesterId: "",
      batchId: "",
    }));

    setError("");
  }

  function changeSemester(semesterId: string) {
    setForm((previous) => ({
      ...previous,
      semesterId,
      batchId: "",
    }));

    setError("");
  }

  function getTargetLabel(row: HwRow) {
    if (row.courseName) {
      let label = "Course: " + row.courseName;

      if (row.batchName) {
        label += " | Class: " + row.batchName;
      }

      return label;
    }

    if (row.programmeName) {
      let label =
        "Programme: " + row.programmeName;

      if (row.semesterName) {
        label +=
          " | Semester: " + row.semesterName;
      }

      if (row.batchName) {
        label +=
          " | Class: " + row.batchName;
      }

      return label;
    }

    if (row.batchName) {
      return "Batch: " + row.batchName;
    }

    return "General";
  }

  function getTargetIcon(row: HwRow) {
    if (row.courseName) {
      return "BOOK";
    }

    if (row.programmeName) {
      return "PROGRAMME";
    }

    if (row.batchName) {
      return "BATCH";
    }

    return "HW";
  }

  async function handleSubmit(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");

    if (!form.title.trim()) {
      setError("Homework title is required.");
      return;
    }

    if (targetType === "course") {
      if (!form.courseId) {
        setError("Please select a Course.");
        return;
      }

      if (!form.batchId) {
        setError(
          "Please select a Class / Batch for the selected Course."
        );
        return;
      }
    }

    if (targetType === "programme") {
      if (!form.programmeId) {
        setError("Please select a Programme.");
        return;
      }

      if (!form.semesterId) {
        setError("Please select a Semester.");
        return;
      }

      if (!form.batchId) {
        setError(
          "Please select a Class / Batch for the selected Programme and Semester."
        );
        return;
      }
    }

    if (
      targetType === "batch" &&
      !form.batchId
    ) {
      setError("Please select a Batch.");
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        targetType,

        courseId:
          targetType === "course"
            ? form.courseId
            : null,

        programmeId:
          targetType === "programme"
            ? form.programmeId
            : null,

        semesterId:
          targetType === "programme"
            ? form.semesterId
            : null,

        batchId: form.batchId || null,

        teacherId: form.teacherId || null,

        title: form.title.trim(),

        description:
          form.description.trim(),

        deadline:
          form.deadline || null,
      };

      const res = await fetch(
        "/api/homework",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to assign homework"
        );
      }

      setShowModal(false);
      setForm({ ...initialForm });
      setTargetType("course");

      await fetchHw();
    } catch (err) {
      console.error(err);

      if (err instanceof Error) {
        setError(
          err.message ||
            "Homework assignment failed."
        );
      } else {
        setError(
          "Homework assignment failed."
        );
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Homework
          </h1>

          <p className="text-sm text-slate-500">
            {hwList.length} assignments
          </p>
        </div>

        <button
          type="button"
          onClick={openModal}
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

          Assign Homework
        </button>
      </div>

      {error && !showModal && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-7 h-7 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {hwList.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <div className="text-4xl mb-3">
                HW
              </div>

              <p className="text-slate-500">
                No homework assigned yet
              </p>

              <button
                type="button"
                onClick={openModal}
                className="btn btn-primary btn-sm mt-4"
              >
                Assign Homework
              </button>
            </div>
          ) : (
            hwList.map((row) => (
              <div
                key={row.homework.id}
                className="card hover:shadow-md transition-shadow"
              >
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-xs font-bold text-orange-600 flex-shrink-0">
                    {getTargetIcon(row)}
                  </div>

                  <div className="min-w-0">
                    <h3 className="font-bold text-slate-800">
                      {row.homework.title}
                    </h3>

                    <p className="text-xs text-blue-600 mt-1">
                      {getTargetLabel(row)}
                    </p>
                  </div>
                </div>

                {row.homework.description && (
                  <p className="text-sm text-slate-500 mb-3 line-clamp-2">
                    {row.homework.description}
                  </p>
                )}

                <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                  <span>
                    Teacher:{" "}
                    {row.teacherName || "-"}
                  </span>

                  {row.homework.deadline && (
                    <span
                      className={
                        new Date(
                          row.homework.deadline
                        ) < new Date()
                          ? "font-medium text-red-500"
                          : "font-medium text-orange-500"
                      }
                    >
                      Deadline:{" "}
                      {formatDate(
                        row.homework.deadline
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {showModal && (
        <div
          className="modal-overlay"
          onClick={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <h2 className="modal-title">
                Assign Homework
              </h2>

              <button
                type="button"
                onClick={closeModal}
                className="btn btn-ghost btn-sm"
                disabled={submitting}
              >
                X
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-100 text-red-600 rounded-xl text-sm">
                    {error}
                  </div>
                )}

                <div>
                  <label className="form-label">
                    Title *
                  </label>

                  <input
                    className="form-input"
                    placeholder="Homework title"
                    value={form.title}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        title:
                          event.target.value,
                      })
                    }
                    required
                  />
                </div>

                <div>
                  <label className="form-label">
                    Assign To *
                  </label>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        changeTargetType(
                          "course"
                        )
                      }
                      className={
                        targetType === "course"
                          ? "px-3 py-2 rounded-xl border-2 border-blue-600 bg-blue-50 text-blue-700 text-sm font-semibold"
                          : "px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50"
                      }
                    >
                      Course
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changeTargetType(
                          "programme"
                        )
                      }
                      className={
                        targetType === "programme"
                          ? "px-3 py-2 rounded-xl border-2 border-blue-600 bg-blue-50 text-blue-700 text-sm font-semibold"
                          : "px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50"
                      }
                    >
                      Programme
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        changeTargetType(
                          "batch"
                        )
                      }
                      className={
                        targetType === "batch"
                          ? "px-3 py-2 rounded-xl border-2 border-blue-600 bg-blue-50 text-blue-700 text-sm font-semibold"
                          : "px-3 py-2 rounded-xl border border-slate-200 bg-white text-slate-600 text-sm font-medium hover:bg-slate-50"
                      }
                    >
                      Batch
                    </button>
                  </div>
                </div>

                {targetType === "course" && (
                  <>
                    <div>
                      <label className="form-label">
                        Course *
                      </label>

                      <select
                        className="form-select"
                        value={form.courseId}
                        onChange={(event) =>
                          changeCourse(
                            event.target.value
                          )
                        }
                        required
                        disabled={
                          loadingOptions
                        }
                      >
                        <option value="">
                          {loadingOptions
                            ? "Loading courses..."
                            : "Select course"}
                        </option>

                        {courses.map(
                          (course) => (
                            <option
                              key={
                                course.id
                              }
                              value={
                                course.id
                              }
                            >
                              {course.name}
                              {course.code
                                ? " (" +
                                  course.code +
                                  ")"
                                : ""}
                            </option>
                          )
                        )}
                      </select>

                      {!loadingOptions &&
                        courses.length ===
                          0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No course found.
                          </p>
                        )}
                    </div>

                    <div>
                      <label className="form-label">
                        Class / Batch *
                      </label>

                      <select
                        className="form-select"
                        value={form.batchId}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            batchId:
                              event.target.value,
                          })
                        }
                        required
                        disabled={
                          loadingOptions ||
                          !form.courseId
                        }
                      >
                        <option value="">
                          {!form.courseId
                            ? "Select course first"
                            : loadingOptions
                            ? "Loading classes..."
                            : "Select class / batch"}
                        </option>

                        {filteredBatches.map(
                          (batch) => (
                            <option
                              key={
                                batch.id
                              }
                              value={
                                batch.id
                              }
                            >
                              {batch.name}
                            </option>
                          )
                        )}
                      </select>

                      {form.courseId &&
                        !loadingOptions &&
                        filteredBatches.length ===
                          0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No active Class / Batch found for this Course.
                          </p>
                        )}
                    </div>
                  </>
                )}

                {targetType === "programme" && (
                  <div className="space-y-3">
                    <div>
                      <label className="form-label">
                        Programme *
                      </label>

                      <select
                        className="form-select"
                        value={
                          form.programmeId
                        }
                        onChange={(event) =>
                          changeProgramme(
                            event.target.value
                          )
                        }
                        required
                        disabled={
                          loadingOptions
                        }
                      >
                        <option value="">
                          {loadingOptions
                            ? "Loading programmes..."
                            : "Select programme"}
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
                                ? " (" +
                                  programme.code +
                                  ")"
                                : ""}
                            </option>
                          )
                        )}
                      </select>

                      {!loadingOptions &&
                        programmes.length ===
                          0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No programme found.
                          </p>
                        )}
                    </div>

                    <div>
                      <label className="form-label">
                        Semester *
                      </label>

                      <select
                        className="form-select"
                        value={
                          form.semesterId
                        }
                        onChange={(event) =>
                          changeSemester(
                            event.target.value
                          )
                        }
                        required
                        disabled={
                          !form.programmeId ||
                          loadingOptions
                        }
                      >
                        <option value="">
                          {!form.programmeId
                            ? "Select programme first"
                            : "Select semester"}
                        </option>

                        {filteredSemesters.map(
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

                      {form.programmeId &&
                        filteredSemesters.length ===
                          0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No Semester found for this Programme.
                          </p>
                        )}
                    </div>

                    <div>
                      <label className="form-label">
                        Class / Batch *
                      </label>

                      <select
                        className="form-select"
                        value={form.batchId}
                        onChange={(event) =>
                          setForm({
                            ...form,
                            batchId:
                              event.target.value,
                          })
                        }
                        required
                        disabled={
                          loadingOptions ||
                          !form.programmeId ||
                          !form.semesterId
                        }
                      >
                        <option value="">
                          {!form.programmeId
                            ? "Select programme first"
                            : !form.semesterId
                            ? "Select semester first"
                            : loadingOptions
                            ? "Loading classes..."
                            : "Select class / batch"}
                        </option>

                        {filteredBatches.map(
                          (batch) => (
                            <option
                              key={
                                batch.id
                              }
                              value={
                                batch.id
                              }
                            >
                              {batch.name}
                            </option>
                          )
                        )}
                      </select>

                      {form.programmeId &&
                        form.semesterId &&
                        !loadingOptions &&
                        filteredBatches.length ===
                          0 && (
                          <p className="text-xs text-amber-600 mt-1">
                            No active Class / Batch found for this Programme and Semester.
                          </p>
                        )}
                    </div>
                  </div>
                )}

                {targetType === "batch" && (
                  <div>
                    <label className="form-label">
                      Batch *
                    </label>

                    <select
                      className="form-select"
                      value={form.batchId}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          batchId:
                            event.target.value,
                        })
                      }
                      required
                      disabled={
                        loadingOptions
                      }
                    >
                      <option value="">
                        {loadingOptions
                          ? "Loading batches..."
                          : "Select batch"}
                      </option>

                      {batches.map(
                        (batch) => (
                          <option
                            key={batch.id}
                            value={batch.id}
                          >
                            {batch.name}
                          </option>
                        )
                      )}
                    </select>

                    {!loadingOptions &&
                      batches.length ===
                        0 && (
                        <p className="text-xs text-amber-600 mt-1">
                          No batch found.
                        </p>
                      )}
                  </div>
                )}

                <div>
                  <label className="form-label">
                    Teacher
                  </label>

                  <select
                    className="form-select"
                    value={form.teacherId}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        teacherId:
                          event.target.value,
                      })
                    }
                    disabled={
                      loadingOptions
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

                <div>
                  <label className="form-label">
                    Description
                  </label>

                  <textarea
                    className="form-input"
                    rows={3}
                    placeholder="Homework details..."
                    value={
                      form.description
                    }
                    onChange={(event) =>
                      setForm({
                        ...form,
                        description:
                          event.target.value,
                      })
                    }
                  />
                </div>

                <div>
                  <label className="form-label">
                    Deadline
                  </label>

                  <input
                    type="date"
                    className="form-input"
                    value={form.deadline}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        deadline:
                          event.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-outline"
                  disabled={submitting}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting
                    ? "Assigning..."
                    : "Assign Homework"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
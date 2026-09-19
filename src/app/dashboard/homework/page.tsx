"use client";

import {
  useCallback,
  useEffect,
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
  id: string;
  title: string;
  description?: string | null;
  deadline?: string | null;
  teacherName?: string | null;
  batchName?: string | null;
  courseName?: string | null;
  courseClassNo?: number | null;
  courseClassTitle?: string | null;
  programmeName?: string | null;
  semesterNo?: number | null;
  semesterName?: string | null;
  programmeClassNo?: number | null;
  programmeClassTitle?: string | null;
  targetType?: string | null;
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

interface CourseClass {
  id: string;
  classNo?: number | null;
  title: string;
  description?: string | null;
  scheduledDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
}

interface ProgrammeClass {
  id: string;
  classNo?: number | null;
  title: string;
  description?: string | null;
  scheduledDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
  status?: string | null;
  semesterId?: string | null;
  semesterNo?: number | null;
  semesterName?: string | null;
}

interface Staff {
  id: string;
  name: string;
}

type TargetType =
  | "course"
  | "programme"
  | "batch";

interface FormState {
  courseId: string;
  courseClassId: string;

  programmeId: string;
  semesterId: string;
  programmeClassId: string;

  batchId: string;

  teacherId: string;
  title: string;
  description: string;
  deadline: string;
}

const initialForm: FormState = {
  courseId: "",
  courseClassId: "",

  programmeId: "",
  semesterId: "",
  programmeClassId: "",

  batchId: "",

  teacherId: "",
  title: "",
  description: "",
  deadline: "",
};

export default function HomeworkPage() {
  const [hwList, setHwList] =
    useState<HwRow[]>([]);

  const [courses, setCourses] =
    useState<Course[]>([]);

  const [programmes, setProgrammes] =
    useState<Programme[]>([]);

  const [batches, setBatches] =
    useState<Batch[]>([]);

  const [staffList, setStaffList] =
    useState<Staff[]>([]);

  const [courseClasses, setCourseClasses] =
    useState<CourseClass[]>([]);

  const [
    programmeClasses,
    setProgrammeClasses,
  ] = useState<ProgrammeClass[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [loadingOptions, setLoadingOptions] =
    useState(true);

  const [loadingClasses, setLoadingClasses] =
    useState(false);

  const [showModal, setShowModal] =
    useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [error, setError] =
    useState("");

  const [targetType, setTargetType] =
    useState<TargetType>("course");

  const [form, setForm] =
    useState<FormState>(initialForm);

  const fetchHw = useCallback(async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "/api/homework",
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to load homework"
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

  const fetchOptions =
    useCallback(async () => {
      try {
        setLoadingOptions(true);
        setError("");

        const results =
          await Promise.all([
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

        const courseData =
          await results[0].json();

        const programmeData =
          await results[1].json();

        const batchData =
          await results[2].json();

        const staffData =
          await results[3].json();

        if (!results[0].ok) {
          throw new Error(
            courseData?.error ||
              "Failed to load courses"
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
            batchData?.error ||
              "Failed to load batches"
          );
        }

        if (!results[3].ok) {
          throw new Error(
            staffData?.error ||
              "Failed to load staff"
          );
        }

        setCourses(
          courseData.courses || []
        );

        setProgrammes(
          programmeData.programmes || []
        );

        const rawBatches =
          batchData.batches || [];

        const normalizedBatches: Batch[] =
          rawBatches.map(
            (
              item:
                | Batch
                | { batch: Batch }
            ) => {
              if (
                "batch" in item &&
                item.batch
              ) {
                return item.batch;
              }

              return item as Batch;
            }
          );

        setBatches(
          normalizedBatches
        );

        setStaffList(
          staffData.staff || []
        );
      } catch (err) {
        console.error(err);

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load assignment options."
        );
      } finally {
        setLoadingOptions(false);
      }
    }, []);

  useEffect(() => {
    void fetchHw();
    void fetchOptions();
  }, [
    fetchHw,
    fetchOptions,
  ]);

  async function loadCourseClasses(
    courseId: string
  ) {
    setCourseClasses([]);
    setForm((prev) => ({
      ...prev,
      courseClassId: "",
    }));

    if (!courseId) {
      return;
    }

    try {
      setLoadingClasses(true);
      setError("");

      const res = await fetch(
        `/api/courses/${courseId}/classes`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to load course classes."
        );
      }

      setCourseClasses(
        data.classes || []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load course classes."
      );
    } finally {
      setLoadingClasses(false);
    }
  }

  async function loadProgrammeClasses(
    programmeId: string
  ) {
    setProgrammeClasses([]);

    if (!programmeId) {
      return;
    }

    try {
      setLoadingClasses(true);
      setError("");

      const res = await fetch(
        `/api/programmes/${programmeId}/syllabus`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error ||
            "Failed to load programme classes."
        );
      }

      setProgrammeClasses(
        data.classes || []
      );
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load programme classes."
      );
    } finally {
      setLoadingClasses(false);
    }
  }

  function openModal() {
    setForm(initialForm);
    setCourseClasses([]);
    setProgrammeClasses([]);
    setTargetType("course");
    setError("");
    setShowModal(true);
  }

  function closeModal() {
    if (submitting) {
      return;
    }

    setShowModal(false);
    setError("");
  }

  function changeTargetType(
    type: TargetType
  ) {
    setTargetType(type);

    setForm(initialForm);

    setCourseClasses([]);
    setProgrammeClasses([]);

    setError("");
  }

  async function changeCourse(
    courseId: string
  ) {
    setForm((prev) => ({
      ...prev,
      courseId,
      courseClassId: "",
      batchId: "",
    }));

    await loadCourseClasses(courseId);
  }

  async function changeProgramme(
    programmeId: string
  ) {
    setForm((prev) => ({
      ...prev,
      programmeId,
      semesterId: "",
      programmeClassId: "",
      batchId: "",
    }));

    setProgrammeClasses([]);

    await loadProgrammeClasses(
      programmeId
    );
  }

  function changeSemester(
    semesterId: string
  ) {
    setForm((prev) => ({
      ...prev,
      semesterId,
      programmeClassId: "",
      batchId: "",
    }));
  }

  const selectedProgramme =
    programmes.find(
      (programme) =>
        programme.id ===
        form.programmeId
    );

  const filteredSemesters =
    selectedProgramme?.semesters || [];

  const filteredProgrammeClasses =
    programmeClasses.filter(
      (item) =>
        item.semesterId ===
        form.semesterId
    );

  async function handleSubmit(
    event: React.FormEvent
  ) {
    event.preventDefault();

    setError("");

    if (!form.title.trim()) {
      setError(
        "Homework title is required."
      );
      return;
    }

    if (
      targetType === "course" &&
      (!form.courseId ||
        !form.courseClassId)
    ) {
      setError(
        "Please select Course and Course Class."
      );
      return;
    }

    if (
      targetType === "programme" &&
      (!form.programmeId ||
        !form.semesterId ||
        !form.programmeClassId)
    ) {
      setError(
        "Please select Programme, Semester and Programme Class."
      );
      return;
    }

    if (
      targetType === "batch" &&
      !form.batchId
    ) {
      setError(
        "Please select Batch."
      );
      return;
    }

    try {
      setSubmitting(true);

      const payload = {
        targetType,

        courseId:
          targetType === "course"
            ? form.courseId
            : "",

        courseClassId:
          targetType === "course"
            ? form.courseClassId
            : "",

        programmeId:
          targetType === "programme"
            ? form.programmeId
            : "",

        semesterId:
          targetType === "programme"
            ? form.semesterId
            : "",

        programmeClassId:
          targetType === "programme"
            ? form.programmeClassId
            : "",

        batchId:
          targetType === "batch"
            ? form.batchId
            : "",

        teacherId: form.teacherId,
        title: form.title.trim(),
        description:
          form.description.trim(),
        deadline: form.deadline,
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
            "Failed to assign homework."
        );
      }

      setShowModal(false);
      setForm(initialForm);

      await fetchHw();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to assign homework."
      );
    } finally {
      setSubmitting(false);
    }
  }

  function getTargetLabel(
    row: HwRow
  ) {
    const type =
      row.targetType?.toUpperCase();

    if (type === "COURSE") {
      return (
        "Course: " +
        (row.courseName || "-") +
        " | Class " +
        (row.courseClassNo || "-") +
        ": " +
        (row.courseClassTitle || "-")
      );
    }

    if (type === "PROGRAMME") {
      return (
        "Programme: " +
        (row.programmeName || "-") +
        " | Semester " +
        (row.semesterNo || "-") +
        " | Class " +
        (row.programmeClassNo || "-") +
        ": " +
        (row.programmeClassTitle || "-")
      );
    }

    return (
      "Batch: " +
      (row.batchName || "-")
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-blue-700 text-white font-bold">
                HW
              </span>

              <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold text-blue-700">
                ACADEMIC
              </span>
            </div>

            <h1 className="text-3xl font-bold text-slate-900">
              Homework
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Assign homework directly to Course Classes or Programme Semester Classes.
            </p>
          </div>

          <button
            type="button"
            onClick={openModal}
            className="btn btn-primary"
          >
            + Assign Homework
          </button>
        </div>

        {error && !showModal && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : hwList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white py-16 text-center shadow-sm">
            <p className="font-semibold text-slate-700">
              No homework found
            </p>

            <p className="mt-1 text-sm text-slate-400">
              Create your first homework assignment.
            </p>

            <button
              type="button"
              onClick={openModal}
              className="btn btn-primary btn-sm mt-5"
            >
              + Assign Homework
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
            {hwList.map((row) => (
              <div
                key={row.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="font-bold text-slate-900">
                      {row.title}
                    </h2>

                    <p className="mt-2 text-xs font-semibold text-blue-600">
                      {getTargetLabel(row)}
                    </p>
                  </div>

                  <span className="rounded-lg bg-blue-50 px-2 py-1 text-[10px] font-bold text-blue-700">
                    HW
                  </span>
                </div>

                {row.description && (
                  <p className="mt-4 line-clamp-3 text-sm text-slate-500">
                    {row.description}
                  </p>
                )}

                <div className="mt-5 flex items-center justify-between gap-2 border-t pt-3 text-xs text-slate-400">
                  <span>
                    Teacher:{" "}
                    {row.teacherName || "-"}
                  </span>

                  {row.deadline && (
                    <span
                      className={
                        new Date(
                          row.deadline
                        ) < new Date()
                          ? "font-medium text-red-500"
                          : "font-medium text-orange-500"
                      }
                    >
                      {formatDate(
                        row.deadline
                      )}
                    </span>
                  )}
                </div>
              </div>
            ))}
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
                <div>
                  <h2 className="modal-title">
                    Assign Homework
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    Select an actual syllabus class.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-ghost btn-sm"
                  disabled={submitting}
                >
                  X
                </button>
              </div>

              <form
                onSubmit={handleSubmit}
              >
                <div className="modal-body space-y-4">

                  {error && (
                    <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-600">
                      {error}
                    </div>
                  )}

                  <div>
                    <label className="form-label">
                      Homework Title *
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
                          targetType ===
                          "course"
                            ? "rounded-xl border-2 border-blue-600 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                            : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                        }
                      >
                        Course Class
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          changeTargetType(
                            "programme"
                          )
                        }
                        className={
                          targetType ===
                          "programme"
                            ? "rounded-xl border-2 border-blue-600 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                            : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                        }
                      >
                        Programme Class
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          changeTargetType(
                            "batch"
                          )
                        }
                        className={
                          targetType ===
                          "batch"
                            ? "rounded-xl border-2 border-blue-600 bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-700"
                            : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600"
                        }
                      >
                        Batch
                      </button>
                    </div>
                  </div>

                  {targetType ===
                    "course" && (
                    <>
                      <div>
                        <label className="form-label">
                          Course *
                        </label>

                        <select
                          className="form-select"
                          value={
                            form.courseId
                          }
                          onChange={(event) =>
                            void changeCourse(
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
                      </div>

                      <div>
                        <label className="form-label">
                          Course Class *
                        </label>

                        <select
                          className="form-select"
                          value={
                            form.courseClassId
                          }
                          onChange={(event) =>
                            setForm({
                              ...form,
                              courseClassId:
                                event.target
                                  .value,
                            })
                          }
                          required
                          disabled={
                            !form.courseId ||
                            loadingClasses
                          }
                        >
                          <option value="">
                            {!form.courseId
                              ? "Select course first"
                              : loadingClasses
                              ? "Loading classes..."
                              : "Select course class"}
                          </option>

                          {courseClasses.map(
                            (item) => (
                              <option
                                key={
                                  item.id
                                }
                                value={
                                  item.id
                                }
                              >
                                Class{" "}
                                {item.classNo ||
                                  "-"}{" "}
                                -{" "}
                                {item.title}
                              </option>
                            )
                          )}
                        </select>

                        {form.courseId &&
                          !loadingClasses &&
                          courseClasses.length ===
                            0 && (
                            <p className="mt-1 text-xs text-amber-600">
                              No syllabus class found for this Course.
                            </p>
                          )}
                      </div>
                    </>
                  )}

                  {targetType ===
                    "programme" && (
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
                            void changeProgramme(
                              event.target
                                .value
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
                              event.target
                                .value
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
                                Semester{" "}
                                {semester.semesterNo ||
                                  "-"}{" "}
                                -{" "}
                                {semester.name}
                              </option>
                            )
                          )}
                        </select>
                      </div>

                      <div>
                        <label className="form-label">
                          Programme Class *
                        </label>

                        <select
                          className="form-select"
                          value={
                            form.programmeClassId
                          }
                          onChange={(event) =>
                            setForm({
                              ...form,
                              programmeClassId:
                                event.target
                                  .value,
                            })
                          }
                          required
                          disabled={
                            !form.semesterId ||
                            loadingClasses
                          }
                        >
                          <option value="">
                            {!form.programmeId
                              ? "Select programme first"
                              : !form.semesterId
                              ? "Select semester first"
                              : loadingClasses
                              ? "Loading classes..."
                              : "Select programme class"}
                          </option>

                          {filteredProgrammeClasses.map(
                            (item) => (
                              <option
                                key={
                                  item.id
                                }
                                value={
                                  item.id
                                }
                              >
                                Class{" "}
                                {item.classNo ||
                                  "-"}{" "}
                                -{" "}
                                {item.title}
                              </option>
                            )
                          )}
                        </select>

                        {form.semesterId &&
                          !loadingClasses &&
                          filteredProgrammeClasses.length ===
                            0 && (
                            <p className="mt-1 text-xs text-amber-600">
                              No syllabus class found for this Semester.
                            </p>
                          )}
                      </div>
                    </div>
                  )}

                  {targetType ===
                    "batch" && (
                    <div>
                      <label className="form-label">
                        Batch *
                      </label>

                      <select
                        className="form-select"
                        value={
                          form.batchId
                        }
                        onChange={(event) =>
                          setForm({
                            ...form,
                            batchId:
                              event.target
                                .value,
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

                      {!loadingOptions &&
                        batches.length ===
                          0 && (
                          <p className="mt-1 text-xs text-amber-600">
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
                      value={
                        form.teacherId
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          teacherId:
                            event.target
                              .value,
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
                            key={
                              staff.id
                            }
                            value={
                              staff.id
                            }
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
                            event.target
                              .value,
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
                      value={
                        form.deadline
                      }
                      onChange={(event) =>
                        setForm({
                          ...form,
                          deadline:
                            event.target
                              .value,
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
    </div>
  );
}
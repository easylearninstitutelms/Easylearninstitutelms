"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Semester = {
  id: string;
  semesterNo: number;
  name: string;
};

type Programme = {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  duration: string | null;
  status: string;
  semesters: Semester[];
};

type FormState = {
  name: string;
  code: string;
  duration: string;
  description: string;
  semesterCount: string;
};

const initialForm: FormState = {
  name: "",
  code: "",
  duration: "",
  description: "",
  semesterCount: "4",
};

export default function ProgrammesPage() {
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState<FormState>(initialForm);

  async function loadProgrammes() {
    try {
      setLoading(true);
      setError("");

      const response = await fetch("/api/programmes", {
        method: "GET",
        cache: "no-store",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error || "Failed to load programmes"
        );
      }

      const rows = Array.isArray(data) ? data : [];

      const normalized: Programme[] = rows.map(
        (item: any) => ({
          id: String(item.id),
          name: String(item.name ?? ""),
          code:
            item.code === null || item.code === undefined
              ? null
              : String(item.code),
          description:
            item.description === null ||
            item.description === undefined
              ? null
              : String(item.description),
          duration:
            item.duration === null ||
            item.duration === undefined
              ? null
              : String(item.duration),
          status: String(item.status ?? "ACTIVE"),
          semesters: Array.isArray(item.semesters)
            ? item.semesters.map((semester: any) => ({
                id: String(semester.id),
                semesterNo: Number(
                  semester.semesterNo ?? semester.semester_no ?? 0
                ),
                name: String(
                  semester.name ??
                    `Semester ${
                      semester.semesterNo ??
                      semester.semester_no ??
                      ""
                    }`
                ),
              }))
            : [],
        })
      );

      setProgrammes(normalized);
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load programmes"
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProgrammes();
  }, []);

  function openCreateModal() {
    setForm(initialForm);
    setError("");
    setSuccess("");
    setShowModal(true);
  }

  function closeModal() {
    if (saving) return;

    setShowModal(false);
    setForm(initialForm);
  }

  function updateForm(
    field: keyof FormState,
    value: string
  ) {
    setForm((current) => ({
      ...current,
      [field]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setError("");
    setSuccess("");

    const name = form.name.trim();
    const code = form.code.trim();
    const duration = form.duration.trim();
    const description = form.description.trim();

    const semesterCount = Number(
      form.semesterCount
    );

    if (!name) {
      setError("Programme name is required.");
      return;
    }

    if (
      !Number.isInteger(semesterCount) ||
      semesterCount < 4 ||
      semesterCount > 30
    ) {
      setError(
        "Semester count must be between 4 and 30."
      );
      return;
    }

    try {
      setSaving(true);

      const response = await fetch(
        "/api/programmes",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            code: code || null,
            duration: duration || null,
            description: description || null,
            semesterCount,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to create programme"
        );
      }

      setSuccess(
        `${name} created successfully with ${semesterCount} semesters.`
      );

      setShowModal(false);
      setForm(initialForm);

      await loadProgrammes();
    } catch (err) {
      console.error(err);

      setError(
        err instanceof Error
          ? err.message
          : "Failed to create programme"
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredProgrammes = useMemo(() => {
    const keyword = search
      .trim()
      .toLowerCase();

    if (!keyword) {
      return programmes;
    }

    return programmes.filter((programme) => {
      return (
        programme.name
          .toLowerCase()
          .includes(keyword) ||
        (programme.code ?? "")
          .toLowerCase()
          .includes(keyword) ||
        (programme.duration ?? "")
          .toLowerCase()
          .includes(keyword)
      );
    });
  }, [programmes, search]);

  const totalSemesters = useMemo(() => {
    return programmes.reduce(
      (total, programme) =>
        total + programme.semesters.length,
      0
    );
  }, [programmes]);

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-teal-700 text-white shadow-sm">
                <svg
                  className="h-5 w-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
                  <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z" />
                  <path d="M8 6h8" />
                  <path d="M8 10h8" />
                  <path d="M8 14h5" />
                </svg>
              </span>

              <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
                ACADEMIC
              </span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
              Programmes
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Manage your institute programmes and
              their semesters.
            </p>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
          >
            <svg
              className="h-5 w-5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M12 5v14" />
              <path d="M5 12h14" />
            </svg>

            Add Programme
          </button>
        </div>

        {/* Alerts */}
        {success && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="m5 12 4 4L19 6" />
            </svg>

            <div className="flex-1">
              <p className="font-semibold">
                Success
              </p>
              <p className="mt-0.5">
                {success}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-emerald-700 hover:text-emerald-900"
            >
              ×
            </button>
          </div>
        )}

        {error && !showModal && (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <svg
              className="mt-0.5 h-5 w-5 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="12" cy="12" r="9" />
              <path d="M12 8v4" />
              <path d="M12 16h.01" />
            </svg>

            <div className="flex-1">
              <p className="font-semibold">
                Error
              </p>
              <p className="mt-0.5">{error}</p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-red-700 hover:text-red-900"
            >
              ×
            </button>
          </div>
        )}

        {/* Stats */}
        <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Programmes
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {programmes.length}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" />
                  <path d="M8 7h8" />
                  <path d="M8 11h8" />
                  <path d="M8 15h5" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Total Semesters
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {totalSemesters}
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
                <svg
                  className="h-6 w-6"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
                >
                  <rect
                    x="4"
                    y="4"
                    width="16"
                    height="16"
                    rx="2"
                  />
                  <path d="M8 8h8" />
                  <path d="M8 12h8" />
                  <path d="M8 16h5" />
                </svg>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Semester Minimum
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  4
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Per programme
                </p>
              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-700">
                <span className="text-lg font-bold">
                  4+
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle
                cx="11"
                cy="11"
                r="7"
              />
              <path d="m20 20-4-4" />
            </svg>

            <input
              type="text"
              value={search}
              onChange={(event) =>
                setSearch(event.target.value)
              }
              placeholder="Search programme name, code or duration..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-3 pl-11 pr-4 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:bg-white focus:ring-2 focus:ring-teal-100"
            />
          </div>
        </div>

        {/* Programme list */}
        {loading ? (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div
                key={item}
                className="animate-pulse rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
              >
                <div className="h-6 w-2/3 rounded bg-slate-200" />
                <div className="mt-3 h-4 w-1/3 rounded bg-slate-200" />
                <div className="mt-6 h-16 rounded-xl bg-slate-100" />
                <div className="mt-4 h-10 rounded-xl bg-slate-100" />
              </div>
            ))}
          </div>
        ) : filteredProgrammes.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-sm">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-teal-50 text-teal-700">
              <svg
                className="h-8 w-8"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
              >
                <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" />
                <path d="M8 8h8" />
                <path d="M8 12h8" />
                <path d="M8 16h5" />
              </svg>
            </div>

            <h2 className="mt-5 text-lg font-bold text-slate-900">
              {search
                ? "No programmes found"
                : "No programmes yet"}
            </h2>

            <p className="mx-auto mt-2 max-w-md text-sm text-slate-500">
              {search
                ? "Try a different programme name, code or duration."
                : "Create your first programme and assign 4 or more semesters to it."}
            </p>

            {!search && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-5 inline-flex items-center gap-2 rounded-xl bg-teal-700 px-5 py-3 text-sm font-semibold text-white hover:bg-teal-800"
              >
                <span className="text-lg leading-none">
                  +
                </span>
                Create Programme
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            {filteredProgrammes.map(
              (programme) => (
                <div
                  key={programme.id}
                  className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                >
                  {/* Card header */}
                  <div className="border-b border-slate-100 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <h2 className="truncate text-lg font-bold text-slate-900">
                            {programme.name}
                          </h2>

                          <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                            {programme.status}
                          </span>
                        </div>

                        {programme.code && (
                          <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-teal-700">
                            Code: {programme.code}
                          </p>
                        )}
                      </div>

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                        <svg
                          className="h-5 w-5"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" />
                          <path d="M8 7h8" />
                          <path d="M8 11h8" />
                          <path d="M8 15h5" />
                        </svg>
                      </div>
                    </div>

                    {programme.description && (
                      <p className="mt-4 line-clamp-2 text-sm leading-6 text-slate-600">
                        {programme.description}
                      </p>
                    )}

                    <div className="mt-4 flex flex-wrap gap-2">
                      {programme.duration && (
                        <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-3 py-1.5 text-xs font-medium text-slate-600">
                          <svg
                            className="h-4 w-4"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.8"
                          >
                            <circle
                              cx="12"
                              cy="12"
                              r="9"
                            />
                            <path d="M12 7v5l3 2" />
                          </svg>

                          {programme.duration}
                        </span>
                      )}

                      <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
                        {programme.semesters.length}{" "}
                        Semesters
                      </span>
                    </div>
                  </div>

                  {/* Semesters */}
                  <div className="p-5">
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800">
                        Semester Structure
                      </h3>

                      <span className="text-xs font-medium text-slate-400">
                        {programme.semesters.length}{" "}
                        total
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {programme.semesters
                        .sort(
                          (a, b) =>
                            a.semesterNo -
                            b.semesterNo
                        )
                        .map((semester) => (
                          <div
                            key={semester.id}
                            className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-3"
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wider text-teal-700">
                              Semester
                            </p>

                            <p className="mt-1 text-sm font-bold text-slate-800">
                              {semester.semesterNo}
                            </p>

                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {semester.name}
                            </p>
                          </div>
                        ))}
                    </div>
                  </div>
                </div>
              )
            )}
          </div>
        )}

        {/* Bottom note */}
        <div className="mt-6 rounded-2xl border border-teal-100 bg-teal-50 px-5 py-4">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-teal-700 shadow-sm">
              <svg
                className="h-4 w-4"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle
                  cx="12"
                  cy="12"
                  r="9"
                />
                <path d="M12 11v5" />
                <path d="M12 8h.01" />
              </svg>
            </div>

            <div>
              <p className="text-sm font-bold text-teal-900">
                Academic structure
              </p>

              <p className="mt-1 text-xs leading-5 text-teal-800">
                Each Programme supports 4 to 30
                semesters. These semesters will later
                be connected with Batches, Exams,
                Results and Marksheets.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Create Programme Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
          <div className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            {/* Modal header */}
            <div className="sticky top-0 z-10 border-b border-slate-200 bg-white px-5 py-4 sm:px-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-700">
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.8"
                      >
                        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v18H6.5A2.5 2.5 0 0 1 4 18.5v-13Z" />
                        <path d="M8 8h8" />
                        <path d="M8 12h8" />
                        <path d="M8 16h5" />
                      </svg>
                    </div>

                    <div>
                      <h2 className="text-lg font-bold text-slate-900">
                        Add New Programme
                      </h2>

                      <p className="text-xs text-slate-500">
                        Create programme with semester structure
                      </p>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span className="text-2xl leading-none">
                    ×
                  </span>
                </button>
              </div>
            </div>

            {/* Modal body */}
            <form
              onSubmit={handleSubmit}
              className="p-5 sm:p-6"
            >
              {error && (
                <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-semibold">
                    {error}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {/* Programme Name */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Programme Name{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <input
                    type="text"
                    value={form.name}
                    onChange={(event) =>
                      updateForm(
                        "name",
                        event.target.value
                      )
                    }
                    placeholder="e.g. Diploma in Computer Technology"
                    required
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* Code */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Programme Code
                  </label>

                  <input
                    type="text"
                    value={form.code}
                    onChange={(event) =>
                      updateForm(
                        "code",
                        event.target.value
                      )
                    }
                    placeholder="e.g. DCT"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 uppercase outline-none transition placeholder:text-slate-400 placeholder:normal-case focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* Duration */}
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Duration
                  </label>

                  <input
                    type="text"
                    value={form.duration}
                    onChange={(event) =>
                      updateForm(
                        "duration",
                        event.target.value
                      )
                    }
                    placeholder="e.g. 3 Years"
                    className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>

                {/* Semester Count */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Number of Semesters{" "}
                    <span className="text-red-500">
                      *
                    </span>
                  </label>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
                    <select
                      value={form.semesterCount}
                      onChange={(event) =>
                        updateForm(
                          "semesterCount",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-900 outline-none transition focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                    >
                      {Array.from(
                        { length: 27 },
                        (_, index) => index + 4
                      ).map((count) => (
                        <option
                          key={count}
                          value={count}
                        >
                          {count} Semesters
                        </option>
                      ))}
                    </select>

                    <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 sm:min-w-[220px]">
                      <p className="font-bold">
                        Automatically created
                      </p>

                      <p className="mt-1">
                        Semester 1 → Semester{" "}
                        {form.semesterCount}
                      </p>
                    </div>
                  </div>

                  <p className="mt-2 text-xs text-slate-500">
                    Minimum 4 semesters. You can
                    create 4, 6, 8 or any number up
                    to 30.
                  </p>
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Description
                  </label>

                  <textarea
                    value={form.description}
                    onChange={(event) =>
                      updateForm(
                        "description",
                        event.target.value
                      )
                    }
                    rows={4}
                    placeholder="Short description about this programme..."
                    className="w-full resize-none rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-teal-500 focus:ring-2 focus:ring-teal-100"
                  />
                </div>
              </div>

              {/* Preview */}
              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-bold text-slate-800">
                    Semester Preview
                  </p>

                  <span className="rounded-full bg-teal-100 px-2.5 py-1 text-xs font-bold text-teal-700">
                    {form.semesterCount}{" "}
                    Semesters
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {Array.from(
                    {
                      length: Math.min(
                        Number(form.semesterCount) || 4,
                        30
                      ),
                    },
                    (_, index) => index + 1
                  ).map((semester) => (
                    <span
                      key={semester}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm"
                    >
                      Semester {semester}
                    </span>
                  ))}
                </div>
              </div>

              {/* Footer */}
              <div className="mt-6 flex flex-col-reverse gap-3 border-t border-slate-200 pt-5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={saving}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={saving}
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-700 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {saving ? (
                    <>
                      <svg
                        className="h-4 w-4 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          cx="12"
                          cy="12"
                          r="9"
                          stroke="currentColor"
                          strokeOpacity="0.3"
                          strokeWidth="3"
                        />
                        <path
                          d="M21 12a9 9 0 0 0-9-9"
                          stroke="currentColor"
                          strokeWidth="3"
                          strokeLinecap="round"
                        />
                      </svg>

                      Creating...
                    </>
                  ) : (
                    <>
                      <svg
                        className="h-5 w-5"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                      >
                        <path d="M12 5v14" />
                        <path d="M5 12h14" />
                      </svg>

                      Create Programme
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
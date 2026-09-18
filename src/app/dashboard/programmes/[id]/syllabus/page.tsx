"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";

type SyllabusClass = {
  id: string;
  classNo: number;
  title: string;
  description: string | null;
  scheduledDate: string | null;
  startTime: string | null;
  endTime: string | null;
  status: string;
  semesterId: string;
  semesterNo: number;
  semesterName: string;
};

const statusMeta: Record<string, { label: string; cls: string }> = {
  UPCOMING: { label: "Upcoming", cls: "bg-blue-50 border-blue-200 text-blue-700" },
  TODAY: { label: "Today", cls: "bg-amber-50 border-amber-200 text-amber-700" },
  COMPLETED: { label: "Completed", cls: "bg-emerald-50 border-emerald-200 text-emerald-700" },
  CANCELLED: { label: "Cancelled", cls: "bg-red-50 border-red-200 text-red-700" },
};

export default function ProgrammeSyllabusPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [classes, setClasses] = useState<SyllabusClass[]>([]);
  const [programme, setProgramme] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");

    try {
      const r = await fetch(`/api/programmes/${id}/syllabus`, {
        cache: "no-store",
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d?.error || "Failed to load syllabus");
      }

      setClasses(d.classes || []);
      setProgramme(d.programme || null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load syllabus");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) void load();
  }, [id]);

  async function seed() {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const r = await fetch(`/api/programmes/${id}/syllabus`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seed: true }),
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d?.error || "Failed to load syllabus");
      }

      setMessage(d?.message || "Syllabus loaded successfully.");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load syllabus");
    } finally {
      setSaving(false);
    }
  }

  async function updateClass(
    c: SyllabusClass,
    patch: Partial<SyllabusClass>
  ) {
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const r = await fetch(`/api/programmes/${id}/syllabus`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: c.id,
          ...patch,
        }),
      });

      const d = await r.json();

      if (!r.ok) {
        throw new Error(d?.error || "Failed to update class");
      }

      setClasses((prev) =>
        prev.map((x) => (x.id === c.id ? { ...x, ...patch } : x))
      );

      setMessage("Class updated successfully.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to update class");
    } finally {
      setSaving(false);
    }
  }

  async function editDetails(c: SyllabusClass) {
    const title = prompt("Class title:", c.title);

    if (title === null) return;

    const description = prompt(
      "Class description:",
      c.description || ""
    );

    if (description === null) return;

    const nextTitle = title.trim();

    if (!nextTitle) {
      alert("Class title is required.");
      return;
    }

    await updateClass(c, {
      title: nextTitle,
      description: description.trim() || null,
    });
  }

  const grouped = useMemo(
    () =>
      Array.from({ length: 4 }, (_, i) => ({
        no: i + 1,
        items: classes
          .filter((c) => c.semesterNo === i + 1)
          .sort((a, b) => a.classNo - b.classNo),
      })),
    [classes]
  );

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-teal-700">
              Academic · Syllabus
            </p>

            <h1 className="mt-1 text-3xl font-bold text-slate-900">
              {programme?.name || "Programme"}
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              4 Semesters · 10 Classes per Semester · 40 Classes Total
            </p>
          </div>

          <button
            onClick={seed}
            disabled={saving}
            className="btn btn-primary"
          >
            {saving ? "Working..." : "Load Web Design with AI Syllabus"}
          </button>
        </div>

        {message && (
          <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </div>
        )}

        {error && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">
            Loading syllabus...
          </div>
        ) : classes.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center">
            <h2 className="text-lg font-bold text-slate-800">
              No syllabus classes found
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Load the syllabus template to create the classes.
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {grouped.map((semester) => (
              <section
                key={semester.no}
                className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
              >
                <div className="border-b border-slate-200 bg-slate-50 px-5 py-4">
                  <h2 className="text-lg font-bold text-slate-900">
                    Semester {semester.no}
                  </h2>

                  <p className="mt-1 text-xs text-slate-500">
                    {semester.items.length} classes
                  </p>
                </div>

                <div className="divide-y divide-slate-100">
                  {semester.items.map((c) => {
                    const meta =
                      statusMeta[c.status] || statusMeta.UPCOMING;

                    return (
                      <div
                        key={c.id}
                        className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between"
                      >
                        <div className="flex gap-3">
                          <div
                            className={`flex h-10 w-12 shrink-0 items-center justify-center rounded-xl border text-xs font-black ${meta.cls}`}
                          >
                            Class {c.classNo}
                          </div>

                          <div>
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="font-bold text-slate-800">
                                {c.title}
                              </h3>

                              <button
                                type="button"
                                onClick={() => editDetails(c)}
                                disabled={saving}
                                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-bold text-blue-600 hover:bg-blue-50 disabled:opacity-50"
                              >
                                Edit
                              </button>
                            </div>

                            {c.description && (
                              <p className="mt-1 text-xs text-slate-500">
                                {c.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <input
                            type="date"
                            value={c.scheduledDate || ""}
                            onChange={(e) =>
                              updateClass(c, {
                                scheduledDate: e.target.value || null,
                              })
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          />

                          <input
                            type="time"
                            value={c.startTime || ""}
                            onChange={(e) =>
                              updateClass(c, {
                                startTime: e.target.value || null,
                              })
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          />

                          <input
                            type="time"
                            value={c.endTime || ""}
                            onChange={(e) =>
                              updateClass(c, {
                                endTime: e.target.value || null,
                              })
                            }
                            className="rounded-lg border border-slate-200 px-3 py-2 text-xs"
                          />

                          <button
                            type="button"
                            onClick={() =>
                              updateClass(c, { status: "UPCOMING" })
                            }
                            disabled={saving}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                              c.status === "UPCOMING"
                                ? "border-blue-200 bg-blue-50 text-blue-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Upcoming
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateClass(c, { status: "TODAY" })
                            }
                            disabled={saving}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                              c.status === "TODAY"
                                ? "border-amber-200 bg-amber-50 text-amber-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Today
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateClass(c, { status: "COMPLETED" })
                            }
                            disabled={saving}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                              c.status === "COMPLETED"
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Completed
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              updateClass(c, { status: "CANCELLED" })
                            }
                            disabled={saving}
                            className={`rounded-lg border px-3 py-2 text-xs font-bold ${
                              c.status === "CANCELLED"
                                ? "border-red-200 bg-red-50 text-red-700"
                                : "border-slate-200 bg-white text-slate-600"
                            }`}
                          >
                            Cancelled
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

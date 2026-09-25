"use client";

import { useEffect, useMemo, useState } from "react";

type Question = {
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  type: string;
  difficulty: string;
  marks: number;
  topic: string;
  courseId?: string | null;
  programmeId?: string | null;
  semesterId?: string | null;
};

type Semester = { id: string; name: string; semesterNo?: number };
type Course = { id: string; name: string; courseNo?: number };
type Programme = {
  id: string;
  name: string;
  programmeNo?: number;
  semesters?: Semester[];
};

const emptyForm = {
  targetType: "COURSE",
  courseId: "",
  programmeId: "",
  semesterId: "",
  topic: "",
  type: "MCQ",
  difficulty: "MEDIUM",
  count: "5",
};

export default function QuestionGeneratorPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/question-bank?options=true", { cache: "no-store" })
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load options.");
        setCourses(data.courses || []);
        setProgrammes(data.programmes || []);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoadingOptions(false));
  }, []);

  const selectedProgramme = useMemo(
    () => programmes.find((p) => p.id === form.programmeId),
    [programmes, form.programmeId],
  );

  function updateForm(key: keyof typeof emptyForm, value: string) {
    setForm((prev) => {
      const next = { ...prev, [key]: value };
      if (key === "targetType") {
        next.courseId = "";
        next.programmeId = "";
        next.semesterId = "";
      }
      if (key === "programmeId") next.semesterId = "";
      return next;
    });
  }

  async function generateQuestions() {
    setError("");
    setMessage("");

    if (!form.topic.trim()) return setError("Topic is required.");
    if (form.targetType === "COURSE" && !form.courseId) {
      return setError("Please select a course.");
    }
    if (form.targetType === "PROGRAMME" && !form.programmeId) {
      return setError("Please select a programme.");
    }

    setGenerating(true);
    try {
      const res = await fetch("/api/question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "generate",
          courseId: form.targetType === "COURSE" ? form.courseId : "",
          programmeId: form.targetType === "PROGRAMME" ? form.programmeId : "",
          semesterId: form.targetType === "PROGRAMME" ? form.semesterId : "",
          topic: form.topic.trim(),
          type: form.type,
          difficulty: form.difficulty,
          count: Number(form.count),
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Question generation failed.");
      setQuestions(data.questions || []);
      setMessage(`${data.questions?.length || 0} questions generated.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Question generation failed.");
    } finally {
      setGenerating(false);
    }
  }

  function updateQuestion(index: number, patch: Partial<Question>) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === index ? { ...q, ...patch } : q)),
    );
  }

  function updateOption(qIndex: number, optionIndex: number, value: string) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;
        const options = [...q.options];
        options[optionIndex] = value;
        return { ...q, options };
      }),
    );
  }

  function removeQuestion(index: number) {
    setQuestions((prev) => prev.filter((_, i) => i !== index));
  }

  async function saveQuestions() {
    if (!questions.length) return setError("There are no questions to save.");

    setSaving(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch("/api/question-bank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "save", questions }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed to save questions.");
      setMessage(`${data.savedIds?.length || 0} questions saved to Question Bank.`);
      setQuestions([]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save questions.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">AI Question Generator</h1>
          <p className="mt-1 text-sm text-slate-500">
            Generate questions, edit them, then save them to the Question Bank.
          </p>
        </div>

        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium">
              Target
              <select className="mt-1 w-full rounded-lg border p-2.5" value={form.targetType}
                onChange={(e) => updateForm("targetType", e.target.value)}>
                <option value="COURSE">Course</option>
                <option value="PROGRAMME">Programme</option>
              </select>
            </label>

            {form.targetType === "COURSE" ? (
              <label className="text-sm font-medium">
                Course
                <select className="mt-1 w-full rounded-lg border p-2.5" value={form.courseId}
                  onChange={(e) => updateForm("courseId", e.target.value)} disabled={loadingOptions}>
                  <option value="">Select Course</option>
                  {courses.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </label>
            ) : (
              <>
                <label className="text-sm font-medium">
                  Programme
                  <select className="mt-1 w-full rounded-lg border p-2.5" value={form.programmeId}
                    onChange={(e) => updateForm("programmeId", e.target.value)} disabled={loadingOptions}>
                    <option value="">Select Programme</option>
                    {programmes.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Semester
                  <select className="mt-1 w-full rounded-lg border p-2.5" value={form.semesterId}
                    onChange={(e) => updateForm("semesterId", e.target.value)} disabled={!selectedProgramme}>
                    <option value="">All Semesters</option>
                    {selectedProgramme?.semesters?.map((s) => (
                      <option key={s.id} value={s.id}>Semester {s.semesterNo} — {s.name}</option>
                    ))}
                  </select>
                </label>
              </>
            )}

            <label className="text-sm font-medium">
              Topic / Chapter
              <input className="mt-1 w-full rounded-lg border p-2.5" value={form.topic}
                onChange={(e) => updateForm("topic", e.target.value)} placeholder="e.g. Photosynthesis" />
            </label>

            <label className="text-sm font-medium">
              Question Type
              <select className="mt-1 w-full rounded-lg border p-2.5" value={form.type}
                onChange={(e) => updateForm("type", e.target.value)}>
                <option value="MCQ">MCQ</option>
                <option value="TRUE_FALSE">True / False</option>
                <option value="SHORT_ANSWER">Short Answer</option>
                <option value="DESCRIPTIVE">Descriptive</option>
              </select>
            </label>

            <label className="text-sm font-medium">
              Difficulty
              <select className="mt-1 w-full rounded-lg border p-2.5" value={form.difficulty}
                onChange={(e) => updateForm("difficulty", e.target.value)}>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </label>

            <label className="text-sm font-medium">
              Number of Questions
              <input type="number" min="1" max="30" className="mt-1 w-full rounded-lg border p-2.5"
                value={form.count} onChange={(e) => updateForm("count", e.target.value)} />
            </label>
          </div>

          <button onClick={generateQuestions} disabled={generating}
            className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 font-semibold text-white disabled:opacity-50">
            {generating ? "Generating..." : "✨ Generate Questions"}
          </button>
        </section>

        {(error || message) && (
          <div className={`rounded-lg border p-3 text-sm ${error ? "border-red-200 bg-red-50 text-red-700" : "border-green-200 bg-green-50 text-green-700"}`}>
            {error || message}
          </div>
        )}

        {questions.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-xl font-bold">Generated Questions ({questions.length})</h2>
              <button onClick={saveQuestions} disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50">
                {saving ? "Saving..." : "Save to Question Bank"}
              </button>
            </div>

            {questions.map((q, index) => (
              <article key={index} className="rounded-2xl border bg-white p-5 shadow-sm">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-500">Question {index + 1}</span>
                  <button onClick={() => removeQuestion(index)} className="text-sm font-medium text-red-600">
                    Delete
                  </button>
                </div>

                <textarea className="w-full rounded-lg border p-3" rows={3} value={q.question}
                  onChange={(e) => updateQuestion(index, { question: e.target.value })} />

                {(q.type === "MCQ" || q.type === "TRUE_FALSE") && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {q.options.map((option, optionIndex) => (
                      <input key={optionIndex} className="rounded-lg border p-2.5" value={option}
                        onChange={(e) => updateOption(index, optionIndex, e.target.value)} />
                    ))}
                  </div>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="text-sm font-medium">
                    Correct Answer
                    <input className="mt-1 w-full rounded-lg border p-2.5" value={q.correctAnswer}
                      onChange={(e) => updateQuestion(index, { correctAnswer: e.target.value })} />
                  </label>
                  <label className="text-sm font-medium">
                    Marks
                    <input type="number" min="0.5" step="0.5" className="mt-1 w-full rounded-lg border p-2.5" value={q.marks}
                      onChange={(e) => updateQuestion(index, { marks: Number(e.target.value) })} />
                  </label>
                  <label className="text-sm font-medium">
                    Explanation
                    <input className="mt-1 w-full rounded-lg border p-2.5" value={q.explanation}
                      onChange={(e) => updateQuestion(index, { explanation: e.target.value })} />
                  </label>
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </main>
  );
}

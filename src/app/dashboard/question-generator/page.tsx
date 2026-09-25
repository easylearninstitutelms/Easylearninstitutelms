"use client";

import { useEffect, useMemo, useState } from "react";

type Question = {
  id?: string;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation: string;
  type: string;
  difficulty: string;
  marks: number;
  topic: string;
  source?: string;
  courseId?: string | null;
  programmeId?: string | null;
  semesterId?: string | null;
};

type Semester = {
  id: string;
  name: string;
  semesterNo?: number;
};

type Course = {
  id: string;
  name: string;
  courseNo?: number;
};

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

const SECTORS = [
  "Web Development WITH AI",
  "Mobile App Development WITH AI",
  "Software Engineering WITH AI",
  "Cybersecurity WITH AI",
  "IT Support & Systems WITH AI",
  "Graphic Design WITH AI",
  "UI/UX Design WITH AI",
  "Video Editing WITH AI",
  "Animation & Motion Graphics WITH AI",
  "Illustration & Digital Art WITH AI",
  "Data Science & Analytics WITH AI",
  "AI & Machine Learning WITH AI",
  "Prompt Engineering WITH AI",
  "Data Entry WITH AI",
  "Digital Marketing WITH AI",
  "SEO WITH AI",
  "Social Media Management WITH AI",
  "Lead Generation WITH AI",
  "Content Writing WITH AI",
  "Copywriting WITH AI",
  "Translation WITH AI",
  "Proofreading & Editing WITH AI",
];

export default function QuestionGeneratorPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [programmes, setProgrammes] = useState<Programme[]>([]);
  const [form, setForm] = useState(emptyForm);

  const [questions, setQuestions] = useState<Question[]>([]);
  const [bankQuestions, setBankQuestions] = useState<Question[]>([]);

  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingBank, setLoadingBank] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [bankType, setBankType] = useState("ALL");
  const [bankSector, setBankSector] = useState("ALL");
  const [bankDifficulty, setBankDifficulty] = useState("ALL");
  const [bankSearch, setBankSearch] = useState("");

  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    loadOptions();
    loadQuestionBank();
  }, []);

  async function loadOptions() {
    setLoadingOptions(true);

    try {
      const res = await fetch("/api/question-bank?options=true", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load options.");
      }

      setCourses(data.courses || []);
      setProgrammes(data.programmes || []);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load options.",
      );
    } finally {
      setLoadingOptions(false);
    }
  }

  async function loadQuestionBank() {
    setLoadingBank(true);

    try {
      const res = await fetch("/api/question-bank", {
        cache: "no-store",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data?.error || "Failed to load Question Bank.");
      }

      const loadedQuestions = Array.isArray(data.questions)
        ? data.questions
        : [];

      setBankQuestions(loadedQuestions);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load Question Bank.",
      );
    } finally {
      setLoadingBank(false);
    }
  }

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

      if (key === "programmeId") {
        next.semesterId = "";
      }

      return next;
    });
  }

  async function generateQuestions() {
    setError("");
    setMessage("");

    if (!form.topic.trim()) {
      setError("Topic is required.");
      return;
    }

    if (form.targetType === "COURSE" && !form.courseId) {
      setError("Please select a course.");
      return;
    }

    if (form.targetType === "PROGRAMME" && !form.programmeId) {
      setError("Please select a programme.");
      return;
    }

    setGenerating(true);

    try {
      const res = await fetch("/api/question-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "generate",
          courseId: form.targetType === "COURSE" ? form.courseId : "",
          programmeId:
            form.targetType === "PROGRAMME" ? form.programmeId : "",
          semesterId:
            form.targetType === "PROGRAMME" ? form.semesterId : "",
          topic: form.topic.trim(),
          type: form.type,
          difficulty: form.difficulty,
          count: Number(form.count),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Question generation failed.",
        );
      }

      const generatedQuestions = (data.questions || []).map(
        (question: Question) => ({
          ...question,
          courseId:
            form.targetType === "COURSE" ? form.courseId : null,
          programmeId:
            form.targetType === "PROGRAMME"
              ? form.programmeId
              : null,
          semesterId:
            form.targetType === "PROGRAMME"
              ? form.semesterId || null
              : null,
        }),
      );

      setQuestions(generatedQuestions);

      setMessage(
        `${generatedQuestions.length} questions generated.`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Question generation failed.",
      );
    } finally {
      setGenerating(false);
    }
  }

  function updateQuestion(
    index: number,
    patch: Partial<Question>,
  ) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === index ? { ...q, ...patch } : q,
      ),
    );
  }

  function updateOption(
    qIndex: number,
    optionIndex: number,
    value: string,
  ) {
    setQuestions((prev) =>
      prev.map((q, i) => {
        if (i !== qIndex) return q;

        const options = [...q.options];
        options[optionIndex] = value;

        return {
          ...q,
          options,
        };
      }),
    );
  }

  function removeQuestion(index: number) {
    setQuestions((prev) =>
      prev.filter((_, i) => i !== index),
    );
  }

  async function saveQuestions() {
    if (!questions.length) {
      setError("There are no questions to save.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    try {
      const res = await fetch("/api/question-bank", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "save",
          questions,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data?.error || "Failed to save questions.",
        );
      }

      setMessage(
        `${data.savedIds?.length || 0} questions saved to Question Bank.`,
      );

      setQuestions([]);

      await loadQuestionBank();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save questions.",
      );
    } finally {
      setSaving(false);
    }
  }

  const filteredBankQuestions = useMemo(() => {
    const search = bankSearch.trim().toLowerCase();

    return bankQuestions.filter((q) => {
      if (bankType !== "ALL" && q.type !== bankType) {
        return false;
      }

      if (
        bankDifficulty !== "ALL" &&
        q.difficulty !== bankDifficulty
      ) {
        return false;
      }

      if (
        bankSector !== "ALL" &&
        q.topic !== bankSector
      ) {
        return false;
      }

      if (search) {
        const searchable = [
          q.question,
          q.correctAnswer,
          q.explanation,
          q.topic,
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        if (!searchable.includes(search)) {
          return false;
        }
      }

      return true;
    });
  }, [
    bankQuestions,
    bankType,
    bankDifficulty,
    bankSector,
    bankSearch,
  ]);

  const bankCounts = useMemo(() => {
    return {
      total: bankQuestions.length,
      mcq: bankQuestions.filter((q) => q.type === "MCQ").length,
      trueFalse: bankQuestions.filter(
        (q) => q.type === "TRUE_FALSE",
      ).length,
      short: bankQuestions.filter(
        (q) => q.type === "SHORT_ANSWER",
      ).length,
      descriptive: bankQuestions.filter(
        (q) => q.type === "DESCRIPTIVE",
      ).length,
    };
  }, [bankQuestions]);

  return (
    <main className="min-h-screen bg-slate-50 p-6">
      <div className="mx-auto max-w-7xl space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            AI Question Generator
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Generate questions, edit them, save them, and manage
            the Question Bank.
          </p>
        </div>

        {/* GENERATOR */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="mb-5">
            <h2 className="text-lg font-bold text-slate-900">
              Generate New Questions
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Select a target, topic, question type and difficulty.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="text-sm font-medium">
              Target
              <select
                className="mt-1 w-full rounded-lg border p-2.5"
                value={form.targetType}
                onChange={(e) =>
                  updateForm("targetType", e.target.value)
                }
              >
                <option value="COURSE">Course</option>
                <option value="PROGRAMME">Programme</option>
              </select>
            </label>

            {form.targetType === "COURSE" ? (
              <label className="text-sm font-medium">
                Course
                <select
                  className="mt-1 w-full rounded-lg border p-2.5"
                  value={form.courseId}
                  onChange={(e) =>
                    updateForm("courseId", e.target.value)
                  }
                  disabled={loadingOptions}
                >
                  <option value="">
                    {loadingOptions
                      ? "Loading Courses..."
                      : "Select Course"}
                  </option>

                  {courses.map((course) => (
                    <option
                      key={course.id}
                      value={course.id}
                    >
                      {course.name}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <>
                <label className="text-sm font-medium">
                  Programme
                  <select
                    className="mt-1 w-full rounded-lg border p-2.5"
                    value={form.programmeId}
                    onChange={(e) =>
                      updateForm(
                        "programmeId",
                        e.target.value,
                      )
                    }
                    disabled={loadingOptions}
                  >
                    <option value="">
                      {loadingOptions
                        ? "Loading Programmes..."
                        : "Select Programme"}
                    </option>

                    {programmes.map((programme) => (
                      <option
                        key={programme.id}
                        value={programme.id}
                      >
                        {programme.name}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="text-sm font-medium">
                  Semester
                  <select
                    className="mt-1 w-full rounded-lg border p-2.5"
                    value={form.semesterId}
                    onChange={(e) =>
                      updateForm(
                        "semesterId",
                        e.target.value,
                      )
                    }
                    disabled={!selectedProgramme}
                  >
                    <option value="">
                      All Semesters
                    </option>

                    {selectedProgramme?.semesters?.map(
                      (semester) => (
                        <option
                          key={semester.id}
                          value={semester.id}
                        >
                          Semester {semester.semesterNo} —{" "}
                          {semester.name}
                        </option>
                      ),
                    )}
                  </select>
                </label>
              </>
            )}

            <label className="text-sm font-medium">
              Topic / Chapter
              <input
                className="mt-1 w-full rounded-lg border p-2.5"
                value={form.topic}
                onChange={(e) =>
                  updateForm("topic", e.target.value)
                }
                placeholder="e.g. Photosynthesis"
              />
            </label>

            <label className="text-sm font-medium">
              Question Type
              <select
                className="mt-1 w-full rounded-lg border p-2.5"
                value={form.type}
                onChange={(e) =>
                  updateForm("type", e.target.value)
                }
              >
                <option value="MCQ">MCQ</option>
                <option value="TRUE_FALSE">
                  True / False
                </option>
                <option value="SHORT_ANSWER">
                  Short Answer
                </option>
                <option value="DESCRIPTIVE">
                  Descriptive
                </option>
              </select>
            </label>

            <label className="text-sm font-medium">
              Difficulty
              <select
                className="mt-1 w-full rounded-lg border p-2.5"
                value={form.difficulty}
                onChange={(e) =>
                  updateForm("difficulty", e.target.value)
                }
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </label>

            <label className="text-sm font-medium">
              Number of Questions
              <input
                type="number"
                min="1"
                max="30"
                className="mt-1 w-full rounded-lg border p-2.5"
                value={form.count}
                onChange={(e) =>
                  updateForm("count", e.target.value)
                }
              />
            </label>
          </div>

          <button
            onClick={generateQuestions}
            disabled={generating}
            className="mt-5 rounded-lg bg-slate-900 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
          >
            {generating
              ? "Generating..."
              : "Generate Questions"}
          </button>
        </section>

        {(error || message) && (
          <div
            className={`rounded-lg border p-3 text-sm ${
              error
                ? "border-red-200 bg-red-50 text-red-700"
                : "border-green-200 bg-green-50 text-green-700"
            }`}
          >
            {error || message}
          </div>
        )}

        {/* GENERATED QUESTIONS */}
        {questions.length > 0 && (
          <section className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold">
                  Generated Questions ({questions.length})
                </h2>

                <p className="text-sm text-slate-500">
                  Review and edit before saving.
                </p>
              </div>

              <button
                onClick={saveQuestions}
                disabled={saving}
                className="rounded-lg bg-emerald-600 px-5 py-2.5 font-semibold text-white disabled:opacity-50"
              >
                {saving
                  ? "Saving..."
                  : "Save to Question Bank"}
              </button>
            </div>

            {questions.map((q, index) => (
              <article
                key={index}
                className="rounded-2xl border bg-white p-5 shadow-sm"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold text-slate-500">
                    Question {index + 1}
                  </span>

                  <button
                    onClick={() => removeQuestion(index)}
                    className="text-sm font-medium text-red-600"
                  >
                    Delete
                  </button>
                </div>

                <textarea
                  className="w-full rounded-lg border p-3"
                  rows={3}
                  value={q.question}
                  onChange={(e) =>
                    updateQuestion(index, {
                      question: e.target.value,
                    })
                  }
                />

                {(q.type === "MCQ" ||
                  q.type === "TRUE_FALSE") && (
                  <div className="mt-4 grid gap-3 md:grid-cols-2">
                    {q.options.map(
                      (option, optionIndex) => (
                        <input
                          key={optionIndex}
                          className="rounded-lg border p-2.5"
                          value={option}
                          onChange={(e) =>
                            updateOption(
                              index,
                              optionIndex,
                              e.target.value,
                            )
                          }
                        />
                      ),
                    )}
                  </div>
                )}

                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <label className="text-sm font-medium">
                    Correct Answer
                    <input
                      className="mt-1 w-full rounded-lg border p-2.5"
                      value={q.correctAnswer}
                      onChange={(e) =>
                        updateQuestion(index, {
                          correctAnswer: e.target.value,
                        })
                      }
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Marks
                    <input
                      type="number"
                      min="0.5"
                      step="0.5"
                      className="mt-1 w-full rounded-lg border p-2.5"
                      value={q.marks}
                      onChange={(e) =>
                        updateQuestion(index, {
                          marks: Number(e.target.value),
                        })
                      }
                    />
                  </label>

                  <label className="text-sm font-medium">
                    Explanation
                    <input
                      className="mt-1 w-full rounded-lg border p-2.5"
                      value={q.explanation}
                      onChange={(e) =>
                        updateQuestion(index, {
                          explanation: e.target.value,
                        })
                      }
                    />
                  </label>
                </div>
              </article>
            ))}
          </section>
        )}

        {/* QUESTION BANK */}
        <section className="rounded-2xl border bg-white p-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Question Bank
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Browse the saved questions available in your
                institute.
              </p>
            </div>

            <button
              onClick={loadQuestionBank}
              disabled={loadingBank}
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50 disabled:opacity-50"
            >
              {loadingBank ? "Loading..." : "Refresh"}
            </button>
          </div>

          {/* COUNTS */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Total
              </p>
              <p className="mt-1 text-2xl font-bold">
                {bankCounts.total}
              </p>
            </div>

            <div className="rounded-xl bg-blue-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                MCQ
              </p>
              <p className="mt-1 text-2xl font-bold">
                {bankCounts.mcq}
              </p>
            </div>

            <div className="rounded-xl bg-amber-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                True / False
              </p>
              <p className="mt-1 text-2xl font-bold">
                {bankCounts.trueFalse}
              </p>
            </div>

            <div className="rounded-xl bg-emerald-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Short Answer
              </p>
              <p className="mt-1 text-2xl font-bold">
                {bankCounts.short}
              </p>
            </div>

            <div className="rounded-xl bg-purple-50 p-4">
              <p className="text-xs font-medium text-slate-500">
                Descriptive
              </p>
              <p className="mt-1 text-2xl font-bold">
                {bankCounts.descriptive}
              </p>
            </div>
          </div>

          {/* FILTERS */}
          <div className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <label className="text-sm font-medium">
              Sector
              <select
                className="mt-1 w-full rounded-lg border p-2.5"
                value={bankSector}
                onChange={(e) =>
                  setBankSector(e.target.value)
                }
              >
                <option value="ALL">All Sectors</option>

                {SECTORS.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </label>

            <label className="text-sm font-medium">
              Question Type
              <select
                className="mt-1 w-full rounded-lg border p-2.5"
                value={bankType}
                onChange={(e) =>
                  setBankType(e.target.value)
                }
              >
                <option value="ALL">All Types</option>
                <option value="MCQ">MCQ</option>
                <option value="TRUE_FALSE">
                  True / False
                </option>
                <option value="SHORT_ANSWER">
                  Short Answer
                </option>
                <option value="DESCRIPTIVE">
                  Descriptive
                </option>
              </select>
            </label>

            <label className="text-sm font-medium">
              Difficulty
              <select
                className="mt-1 w-full rounded-lg border p-2.5"
                value={bankDifficulty}
                onChange={(e) =>
                  setBankDifficulty(e.target.value)
                }
              >
                <option value="ALL">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </label>

            <label className="text-sm font-medium">
              Search
              <input
                className="mt-1 w-full rounded-lg border p-2.5"
                value={bankSearch}
                onChange={(e) =>
                  setBankSearch(e.target.value)
                }
                placeholder="Search question..."
              />
            </label>
          </div>

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-700">
                {filteredBankQuestions.length}
              </span>{" "}
              of{" "}
              <span className="font-semibold text-slate-700">
                {bankQuestions.length}
              </span>{" "}
              questions
            </p>

            <button
              onClick={() =>
                setShowAnswers((prev) => !prev)
              }
              className="rounded-lg border px-4 py-2 text-sm font-semibold hover:bg-slate-50"
            >
              {showAnswers
                ? "Hide Answers"
                : "Show Answers"}
            </button>
          </div>

          {/* BANK LIST */}
          <div className="mt-5 space-y-4">
            {loadingBank ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                Loading Question Bank...
              </div>
            ) : filteredBankQuestions.length === 0 ? (
              <div className="rounded-xl border border-dashed p-8 text-center text-sm text-slate-500">
                No questions found for the selected filters.
              </div>
            ) : (
              filteredBankQuestions.map((q, index) => (
                <article
                  key={q.id || `${q.question}-${index}`}
                  className="rounded-xl border p-5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                      {q.type}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                      {q.difficulty}
                    </span>

                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold">
                      {q.topic || "General"}
                    </span>

                    {q.source && (
                      <span className="rounded-full bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-700">
                        {q.source}
                      </span>
                    )}
                  </div>

                  <div className="mt-4 flex gap-3">
                    <span className="font-bold text-slate-400">
                      {index + 1}.
                    </span>

                    <p className="flex-1 text-base font-semibold leading-7 text-slate-900">
                      {q.question}
                    </p>
                  </div>

                  {(q.type === "MCQ" ||
                    q.type === "TRUE_FALSE") &&
                    q.options?.length > 0 && (
                      <div className="mt-4 grid gap-2 md:grid-cols-2">
                        {q.options.map(
                          (option, optionIndex) => {
                            const isCorrect =
                              showAnswers &&
                              option ===
                                q.correctAnswer;

                            return (
                              <div
                                key={optionIndex}
                                className={`rounded-lg border p-3 text-sm ${
                                  isCorrect
                                    ? "border-green-300 bg-green-50 font-semibold text-green-800"
                                    : "bg-slate-50"
                                }`}
                              >
                                <span className="mr-2 font-semibold">
                                  {String.fromCharCode(
                                    65 + optionIndex,
                                  )}
                                  .
                                </span>

                                {option}

                                {isCorrect && (
                                  <span className="ml-2">
                                    ✓
                                  </span>
                                )}
                              </div>
                            );
                          },
                        )}
                      </div>
                    )}

                  {showAnswers && (
                    <div className="mt-4 rounded-lg bg-emerald-50 p-4">
                      <p className="text-sm font-bold text-emerald-800">
                        Correct Answer
                      </p>

                      <p className="mt-1 text-sm text-emerald-900">
                        {q.correctAnswer || "—"}
                      </p>

                      {q.explanation && (
                        <>
                          <p className="mt-3 text-sm font-bold text-emerald-800">
                            Explanation
                          </p>

                          <p className="mt-1 text-sm text-emerald-900">
                            {q.explanation}
                          </p>
                        </>
                      )}
                    </div>
                  )}
                </article>
              ))
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
"use client";

import { useEffect, useMemo, useState } from "react";

type Child = {
  id: string;
  studentId: string;
  name: string;
  phone: string | null;
  email: string | null;
  status: string;
  photoUrl: string | null;
  enrollments: Array<{
    id: string;
    status: string;
    batchId: string | null;
    batchName: string | null;
    courseId: string | null;
    courseName: string | null;
  }>;
  attendance: Array<{
    id: string;
    date: string;
    status: string;
    note: string | null;
  }>;
  attendanceSummary: {
    total: number;
    present: number;
    absent: number;
    late: number;
    excused: number;
    percentage: number;
  };
  homework: Array<{
    id: string;
    title: string;
    description: string | null;
    dueDate: string | null;
    createdAt: string;
    batchName: string | null;
  }>;
  results: Array<{
    id: string;
    examName: string | null;
    subjectName: string | null;
    marks: string | number | null;
    grade: string | null;
    resultDate: string | null;
    remarks: string | null;
  }>;
  fees: Array<{
    id: string;
    title: string;
    amount: string | number;
    dueDate: string | null;
    status: string;
  }>;
  feeSummary: {
    totalFees: number;
    paidAmount: number;
    dueAmount: number;
  };
  payments: Array<{
    id: string;
    amount: string | number;
    paymentDate: string;
    method: string | null;
    reference: string | null;
    note: string | null;
  }>;
};

type Guardian = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  relation: string | null;
};

type GuardianData = {
  guardian: Guardian;
  children: Child[];
};

type TabKey = "overview" | "attendance" | "homework" | "results" | "fees";

const tabs: Array<{ key: TabKey; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "attendance", label: "Attendance" },
  { key: "homework", label: "Homework" },
  { key: "results", label: "Results" },
  { key: "fees", label: "Fees" },
];

function formatDate(value: string | null | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatMoney(value: string | number | null | undefined) {
  const amount = Number(value ?? 0);

  return amount.toLocaleString("en-BD", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function statusClass(status: string) {
  const normalized = status.toLowerCase();

  if (
    normalized.includes("present") ||
    normalized.includes("paid") ||
    normalized.includes("complete") ||
    normalized.includes("completed")
  ) {
    return "bg-emerald-50 text-emerald-700";
  }

  if (
    normalized.includes("late") ||
    normalized.includes("pending") ||
    normalized.includes("partial")
  ) {
    return "bg-amber-50 text-amber-700";
  }

  if (
    normalized.includes("absent") ||
    normalized.includes("overdue") ||
    normalized.includes("due")
  ) {
    return "bg-rose-50 text-rose-700";
  }

  return "bg-slate-100 text-slate-700";
}

export default function GuardianPage() {
  const [data, setData] = useState<GuardianData | null>(null);
  const [selectedChildId, setSelectedChildId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;

    async function loadGuardianData() {
      try {
        setLoading(true);
        setError("");

        const response = await fetch("/api/guardian/me", {
          method: "GET",
          cache: "no-store",
        });

        const payload = await response.json();

        if (!response.ok) {
          throw new Error(payload?.error || "Failed to load guardian portal");
        }

        if (!mounted) return;

        setData(payload);

        if (payload?.children?.length) {
          setSelectedChildId(payload.children[0].id);
        }
      } catch (err) {
        if (!mounted) return;

        setError(
          err instanceof Error
            ? err.message
            : "Failed to load guardian portal"
        );
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    }

    loadGuardianData();

    return () => {
      mounted = false;
    };
  }, []);

  const selectedChild = useMemo(() => {
    return (
      data?.children.find((child) => child.id === selectedChildId) ??
      data?.children?.[0] ??
      null
    );
  }, [data, selectedChildId]);

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto flex min-h-screen max-w-7xl items-center justify-center px-6">
          <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm">
            <p className="text-sm font-medium text-slate-600">
              Loading guardian portal...
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-3xl px-6 py-10">
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6">
            <h1 className="text-lg font-semibold text-rose-800">
              Guardian Portal
            </h1>
            <p className="mt-2 text-sm text-rose-700">{error}</p>
          </div>
        </div>
      </main>
    );
  }

  if (!data || !selectedChild) {
    return (
      <main className="min-h-screen bg-slate-50">
        <div className="mx-auto max-w-4xl px-6 py-10">
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-slate-900">
              Guardian Portal
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              No linked student account was found.
            </p>
          </div>
        </div>
      </main>
    );
  }

  const activeEnrollments = selectedChild.enrollments.filter(
    (enrollment) => enrollment.status.toLowerCase() === "active"
  );

  const upcomingHomework = selectedChild.homework.slice(0, 5);
  const latestResults = selectedChild.results.slice(0, 5);
  const latestPayments = selectedChild.payments.slice(0, 5);

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-900 p-6 text-white shadow-xl">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-medium text-white/70">
                Guardian Portal
              </p>

              <h1 className="mt-1 text-2xl font-bold sm:text-3xl">
                Welcome, {data.guardian.name}
              </h1>

              <div className="mt-3 flex flex-wrap gap-2 text-sm text-white/75">
                <span>{data.guardian.email}</span>

                {data.guardian.phone ? (
                  <>
                    <span>•</span>
                    <span>{data.guardian.phone}</span>
                  </>
                ) : null}

                {data.guardian.relation ? (
                  <>
                    <span>•</span>
                    <span>{data.guardian.relation}</span>
                  </>
                ) : null}
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/10 px-5 py-4 backdrop-blur">
              <p className="text-xs uppercase tracking-wide text-white/60">
                Linked Children
              </p>
              <p className="mt-1 text-2xl font-bold">
                {data.children.length}
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">
                Select Student
              </h2>
              <p className="text-sm text-slate-500">
                View information for each linked child.
              </p>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {data.children.map((child, index) => {
              const selected = child.id === selectedChild.id;

              return (
                <button
                  key={child.id}
                  type="button"
                  onClick={() => {
                    setSelectedChildId(child.id);
                    setActiveTab("overview");
                  }}
                  className={`rounded-2xl border p-4 text-left transition ${
                    selected
                      ? "border-indigo-500 bg-indigo-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
                      {child.name?.charAt(0)?.toUpperCase() || "S"}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold text-slate-900">
                        {child.name}
                      </p>

                      <p className="mt-0.5 text-xs text-slate-500">
                        Student ID: {child.studentId}
                      </p>
                    </div>

                    <span
                      className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(
                        child.status
                      )}`}
                    >
                      {child.status}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-400">Attendance</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        {child.attendanceSummary.percentage}%
                      </p>
                    </div>

                    <div className="rounded-xl bg-white px-3 py-2">
                      <p className="text-slate-400">Fee Due</p>
                      <p className="mt-1 font-semibold text-slate-800">
                        ৳ {formatMoney(child.feeSummary.dueAmount)}
                      </p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-medium text-indigo-700">
                    Child {index + 1} {selected ? "• Selected" : ""}
                  </p>
                </button>
              );
            })}
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-5 pt-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
                  Selected Student
                </p>

                <h2 className="mt-1 text-xl font-bold text-slate-900">
                  {selectedChild.name}
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedChild.studentId}
                  {activeEnrollments.length > 0
                    ? ` • ${activeEnrollments
                        .map(
                          (enrollment) =>
                            enrollment.courseName ||
                            enrollment.batchName ||
                            "Active Enrollment"
                        )
                        .join(", ")}`
                    : ""}
                </p>
              </div>

              <span
                className={`w-fit rounded-full px-3 py-1.5 text-xs font-semibold ${statusClass(
                  selectedChild.status
                )}`}
              >
                {selectedChild.status}
              </span>
            </div>

            <div className="mt-5 flex gap-2 overflow-x-auto pb-3">
              {tabs.map((tab) => {
                const active = activeTab === tab.key;

                return (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() => setActiveTab(tab.key)}
                    className={`whitespace-nowrap rounded-xl px-4 py-2 text-sm font-semibold transition ${
                      active
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                    }`}
                  >
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5">
            {activeTab === "overview" && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Attendance
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {selectedChild.attendanceSummary.percentage}%
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {selectedChild.attendanceSummary.present} present •{" "}
                      {selectedChild.attendanceSummary.absent} absent
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Homework
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {selectedChild.homework.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Assigned homework records
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Results
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      {selectedChild.results.length}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Published result records
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                      Fee Due
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                      ৳ {formatMoney(selectedChild.feeSummary.dueAmount)}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      Paid ৳ {formatMoney(selectedChild.feeSummary.paidAmount)}
                    </p>
                  </div>
                </div>

                <div className="grid gap-5 lg:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-900">
                      Student Information
                    </h3>

                    <div className="mt-4 space-y-3 text-sm">
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">Student ID</span>
                        <span className="font-medium text-slate-900">
                          {selectedChild.studentId}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">Phone</span>
                        <span className="font-medium text-slate-900">
                          {selectedChild.phone || "—"}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-4">
                        <span className="text-slate-500">Email</span>
                        <span className="font-medium text-slate-900">
                          {selectedChild.email || "—"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 p-5">
                    <h3 className="font-semibold text-slate-900">
                      Current Enrollment
                    </h3>

                    <div className="mt-4 space-y-3">
                      {selectedChild.enrollments.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          No enrollment information found.
                        </p>
                      ) : (
                        selectedChild.enrollments.map((enrollment) => (
                          <div
                            key={enrollment.id}
                            className="rounded-xl bg-slate-50 p-3"
                          >
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="font-medium text-slate-900">
                                {enrollment.courseName ||
                                  enrollment.batchName ||
                                  "Enrollment"}
                              </p>

                              <span
                                className={`rounded-full px-2 py-1 text-[11px] font-semibold ${statusClass(
                                  enrollment.status
                                )}`}
                              >
                                {enrollment.status}
                              </span>
                            </div>

                            {enrollment.courseName &&
                            enrollment.batchName ? (
                              <p className="mt-1 text-xs text-slate-500">
                                Batch: {enrollment.batchName}
                              </p>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activeTab === "attendance" && (
              <div>
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="rounded-2xl bg-emerald-50 p-4">
                    <p className="text-xs text-emerald-600">Present</p>
                    <p className="mt-1 text-2xl font-bold text-emerald-800">
                      {selectedChild.attendanceSummary.present}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-rose-50 p-4">
                    <p className="text-xs text-rose-600">Absent</p>
                    <p className="mt-1 text-2xl font-bold text-rose-800">
                      {selectedChild.attendanceSummary.absent}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-amber-50 p-4">
                    <p className="text-xs text-amber-600">Late</p>
                    <p className="mt-1 text-2xl font-bold text-amber-800">
                      {selectedChild.attendanceSummary.late}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-indigo-50 p-4">
                    <p className="text-xs text-indigo-600">Percentage</p>
                    <p className="mt-1 text-2xl font-bold text-indigo-800">
                      {selectedChild.attendanceSummary.percentage}%
                    </p>
                  </div>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  {selectedChild.attendance.length === 0 ? (
                    <div className="p-6 text-sm text-slate-500">
                      No attendance records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Status</th>
                            <th className="px-4 py-3">Note</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                          {selectedChild.attendance.map((record) => (
                            <tr key={record.id}>
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {formatDate(record.date)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                    record.status
                                  )}`}
                                >
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {record.note || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === "homework" && (
              <div className="space-y-3">
                {upcomingHomework.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
                    No homework records found.
                  </div>
                ) : (
                  upcomingHomework.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-slate-200 p-5"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <h3 className="font-semibold text-slate-900">
                            {item.title}
                          </h3>

                          {item.batchName ? (
                            <p className="mt-1 text-xs text-slate-400">
                              Batch: {item.batchName}
                            </p>
                          ) : null}
                        </div>

                        <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                          Due: {formatDate(item.dueDate)}
                        </span>
                      </div>

                      {item.description ? (
                        <p className="mt-3 text-sm leading-6 text-slate-600">
                          {item.description}
                        </p>
                      ) : (
                        <p className="mt-3 text-sm text-slate-400">
                          No description provided.
                        </p>
                      )}
                    </div>
                  ))
                )}

                {selectedChild.homework.length > 5 ? (
                  <p className="pt-2 text-center text-xs text-slate-400">
                    Showing latest 5 homework records.
                  </p>
                ) : null}
              </div>
            )}

            {activeTab === "results" && (
              <div>
                {latestResults.length === 0 ? (
                  <div className="rounded-2xl border border-slate-200 p-6 text-sm text-slate-500">
                    No result records found.
                  </div>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50">
                        <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                          <th className="px-4 py-3">Exam</th>
                          <th className="px-4 py-3">Subject</th>
                          <th className="px-4 py-3">Marks</th>
                          <th className="px-4 py-3">Grade</th>
                          <th className="px-4 py-3">Date</th>
                        </tr>
                      </thead>

                      <tbody className="divide-y divide-slate-200">
                        {latestResults.map((result) => (
                          <tr key={result.id}>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {result.examName || "—"}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {result.subjectName || "—"}
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">
                              {result.marks ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                                {result.grade || "—"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-slate-500">
                              {formatDate(result.resultDate)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {activeTab === "fees" && (
              <div className="space-y-5">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="rounded-2xl bg-slate-50 p-5">
                    <p className="text-xs uppercase tracking-wide text-slate-400">
                      Total Fees
                    </p>
                    <p className="mt-2 text-2xl font-bold text-slate-900">
                      ৳ {formatMoney(selectedChild.feeSummary.totalFees)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-emerald-50 p-5">
                    <p className="text-xs uppercase tracking-wide text-emerald-500">
                      Paid
                    </p>
                    <p className="mt-2 text-2xl font-bold text-emerald-800">
                      ৳ {formatMoney(selectedChild.feeSummary.paidAmount)}
                    </p>
                  </div>

                  <div className="rounded-2xl bg-rose-50 p-5">
                    <p className="text-xs uppercase tracking-wide text-rose-500">
                      Due
                    </p>
                    <p className="mt-2 text-2xl font-bold text-rose-800">
                      ৳ {formatMoney(selectedChild.feeSummary.dueAmount)}
                    </p>
                  </div>
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="font-semibold text-slate-900">
                      Fee Items
                    </h3>
                  </div>

                  {selectedChild.fees.length === 0 ? (
                    <div className="p-5 text-sm text-slate-500">
                      No fee records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                            <th className="px-4 py-3">Fee</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Due Date</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                          {selectedChild.fees.map((fee) => (
                            <tr key={fee.id}>
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {fee.title}
                              </td>
                              <td className="px-4 py-3 text-slate-700">
                                ৳ {formatMoney(fee.amount)}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {formatDate(fee.dueDate)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(
                                    fee.status
                                  )}`}
                                >
                                  {fee.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

                <div className="overflow-hidden rounded-2xl border border-slate-200">
                  <div className="border-b border-slate-200 px-5 py-4">
                    <h3 className="font-semibold text-slate-900">
                      Payment History
                    </h3>
                  </div>

                  {latestPayments.length === 0 ? (
                    <div className="p-5 text-sm text-slate-500">
                      No payment records found.
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                            <th className="px-4 py-3">Date</th>
                            <th className="px-4 py-3">Amount</th>
                            <th className="px-4 py-3">Method</th>
                            <th className="px-4 py-3">Reference</th>
                          </tr>
                        </thead>

                        <tbody className="divide-y divide-slate-200">
                          {latestPayments.map((payment) => (
                            <tr key={payment.id}>
                              <td className="px-4 py-3 font-medium text-slate-800">
                                {formatDate(payment.paymentDate)}
                              </td>
                              <td className="px-4 py-3 font-semibold text-emerald-700">
                                ৳ {formatMoney(payment.amount)}
                              </td>
                              <td className="px-4 py-3 text-slate-600">
                                {payment.method || "—"}
                              </td>
                              <td className="px-4 py-3 text-slate-500">
                                {payment.reference || payment.note || "—"}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
"use client";

import {
  useState,
  useEffect,
  useCallback,
  type FormEvent,
} from "react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface Salary {
  id: string;
  month: string;
  basic: string;
  bonus: string;
  deduction: string;
  payable: string;
  paid: string;
  due: string;
  paymentDate: string | null;
  method: string | null;
}

interface SalaryRow {
  salary: Salary;
  staffName: string;
  designation: string;
}

interface StaffMember {
  id: string;
  name: string;
  designation: string;
  salary: string;
}

const PAYMENT_METHODS = [
  { value: "CASH", label: "Cash" },
  { value: "BKASH", label: "bKash" },
  { value: "NAGAD", label: "Nagad" },
  { value: "ROCKET", label: "Rocket" },
  { value: "BANK", label: "Bank" },
];

function toNumber(value: string | number | null | undefined) {
  const number = Number(value);

  return Number.isFinite(number) ? number : 0;
}

function getCurrentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function getCurrentDate() {
  return new Date().toISOString().split("T")[0];
}

function normalizeSalaryRow(row: any): SalaryRow | null {
  const rawSalary = row?.salary ?? row;

  if (
    !rawSalary ||
    typeof rawSalary !== "object" ||
    !rawSalary.id
  ) {
    return null;
  }

  return {
    salary: {
      id: String(rawSalary.id),
      month: String(rawSalary.month ?? ""),
      basic: String(rawSalary.basic ?? "0"),
      bonus: String(rawSalary.bonus ?? "0"),
      deduction: String(rawSalary.deduction ?? "0"),
      payable: String(rawSalary.payable ?? "0"),
      paid: String(rawSalary.paid ?? "0"),
      due: String(rawSalary.due ?? "0"),
      paymentDate: rawSalary.paymentDate ?? null,
      method: rawSalary.method ?? null,
    },
    staffName: String(
      row?.staffName ??
        row?.staff?.name ??
        rawSalary.staffName ??
        "Unknown Staff",
    ),
    designation: String(
      row?.designation ??
        row?.staff?.designation ??
        rawSalary.designation ??
        "-",
    ),
  };
}

function normalizeSalaryRows(data: any): SalaryRow[] {
  const source: unknown[] = Array.isArray(data?.salaries)
    ? data.salaries
    : Array.isArray(data)
      ? data
      : [];

  return source
    .map(normalizeSalaryRow)
    .filter((row): row is SalaryRow => row !== null);
}

export default function SalaryPage() {
  const [salaries, setSalaries] = useState<SalaryRow[]>([]);
  const [staffList, setStaffList] = useState<StaffMember[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [showModal, setShowModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  /*
   * Staff API access is also used as the frontend signal
   * that the current user can manage salary records.
   *
   * Teacher:
   *   /api/staff -> 403
   *   => salary remains visible, but Pay Salary is hidden.
   *
   * Manager/Admin:
   *   /api/staff -> success
   *   => salary management controls are enabled.
   *
   * The real security is still enforced by /api/salaries.
   */
  const [canManageSalary, setCanManageSalary] = useState(false);

  const [selectedMonth, setSelectedMonth] =
    useState(getCurrentMonth());

  const [form, setForm] = useState({
    staffId: "",
    month: getCurrentMonth(),
    basic: "",
    bonus: "0",
    deduction: "0",
    paymentDate: getCurrentDate(),
    method: "CASH",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      setCanManageSalary(false);
      setStaffList([]);

      /*
       * Salary data must load independently from staff-management
       * permission. Previously both requests were inside Promise.all(),
       * so a 403 from /api/staff broke the whole Salary page.
       */
      const salRes = await fetch(
        `/api/salaries?month=${encodeURIComponent(selectedMonth)}`,
        {
          cache: "no-store",
        },
      );

      const salData = await salRes.json();

      if (!salRes.ok) {
        throw new Error(
          salData.error || "Failed to load salary records.",
        );
      }

      setSalaries(normalizeSalaryRows(salData));

      /*
       * Staff list is needed only to create/process a salary.
       * A Teacher may legitimately receive 403 here, so that
       * response is intentionally NOT treated as a page error.
       */
      try {
        const staffRes = await fetch(
          "/api/staff?status=ACTIVE",
          {
            cache: "no-store",
          },
        );

        const staffData = await staffRes.json();

        if (staffRes.ok) {
          setStaffList(
            Array.isArray(staffData?.staff)
              ? staffData.staff
              : [],
          );

          setCanManageSalary(true);
        } else {
          /*
           * 401/403 means the user can view salary but cannot
           * use staff-management data from this page.
           *
           * Keep Salary page working.
           */
          setStaffList([]);
          setCanManageSalary(false);

          /*
           * For unexpected staff API failures (500 etc.),
           * keep salary visible but show a small useful message.
           */
          if (staffRes.status !== 401 && staffRes.status !== 403) {
            setError(
              staffData.error ||
                "Salary records loaded, but staff list could not be loaded.",
            );
          }
        }
      } catch {
        /*
         * Network failure on staff API should not hide salary data.
         */
        setStaffList([]);
        setCanManageSalary(false);
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load salary information.",
      );
    } finally {
      setLoading(false);
    }
  }, [selectedMonth]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function resetForm() {
    setForm({
      staffId: "",
      month: selectedMonth,
      basic: "",
      bonus: "0",
      deduction: "0",
      paymentDate: getCurrentDate(),
      method: "CASH",
    });
  }

  function openModal() {
    if (!canManageSalary) {
      return;
    }

    setError("");
    setSuccess("");

    setForm((prev) => ({
      ...prev,
      month: selectedMonth,
    }));

    setShowModal(true);
  }

  function closeModal() {
    if (submitting) return;

    setShowModal(false);
    setError("");
    resetForm();
  }

  function handleStaffSelect(staffId: string) {
    const staff = staffList.find(
      (item) => item.id === staffId,
    );

    setForm((prev) => ({
      ...prev,
      staffId,
      basic: staff?.salary
        ? String(staff.salary)
        : "",
    }));
  }

  function handleMonthChange(month: string) {
    setSelectedMonth(month);

    setForm((prev) => ({
      ...prev,
      month,
    }));
  }

  async function handleSubmit(
    e: FormEvent<HTMLFormElement>,
  ) {
    e.preventDefault();

    if (!canManageSalary) {
      setError(
        "You do not have permission to process salary.",
      );
      return;
    }

    setSubmitting(true);
    setError("");
    setSuccess("");

    const basic = toNumber(form.basic);
    const bonus = toNumber(form.bonus);
    const deduction = toNumber(form.deduction);

    if (!form.staffId) {
      setError("Please select a staff member.");
      setSubmitting(false);
      return;
    }

    if (!form.month) {
      setError("Please select a salary month.");
      setSubmitting(false);
      return;
    }

    if (basic <= 0) {
      setError(
        "Basic salary must be greater than 0.",
      );
      setSubmitting(false);
      return;
    }

    if (bonus < 0) {
      setError("Bonus cannot be negative.");
      setSubmitting(false);
      return;
    }

    if (deduction < 0) {
      setError("Deduction cannot be negative.");
      setSubmitting(false);
      return;
    }

    const payable = basic + bonus - deduction;

    if (payable <= 0) {
      setError(
        "Payable salary must be greater than 0.",
      );
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/salaries", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...form,
          basic: String(basic),
          bonus: String(bonus),
          deduction: String(deduction),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to process salary.",
        );
      }

      setShowModal(false);

      setSuccess(
        "Salary processed successfully.",
      );

      resetForm();

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to process salary.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  const totalPayable = salaries.reduce(
    (sum, row) =>
      sum + toNumber(row.salary.payable),
    0,
  );

  const totalPaid = salaries.reduce(
    (sum, row) =>
      sum + toNumber(row.salary.paid),
    0,
  );

  const totalDue = salaries.reduce(
    (sum, row) =>
      sum + toNumber(row.salary.due),
    0,
  );

  const totalBonus = salaries.reduce(
    (sum, row) =>
      sum + toNumber(row.salary.bonus),
    0,
  );

  const totalDeduction = salaries.reduce(
    (sum, row) =>
      sum + toNumber(row.salary.deduction),
    0,
  );

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">Salary</h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage staff salary, payment and monthly
            salary records.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            type="month"
            className="form-input w-auto"
            value={selectedMonth}
            onChange={(e) =>
              handleMonthChange(e.target.value)
            }
          />

          {canManageSalary && (
            <button
              type="button"
              onClick={openModal}
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

              Pay Salary
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="card border border-red-200 bg-red-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-red-700">
                Error
              </p>

              <p className="mt-1 text-sm text-red-600">
                {error}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setError("")}
              className="text-sm font-bold text-red-500 hover:text-red-700"
            >
              X
            </button>
          </div>
        </div>
      )}

      {success && (
        <div className="card border border-green-200 bg-green-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-semibold text-green-700">
                Success
              </p>

              <p className="mt-1 text-sm text-green-600">
                {success}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSuccess("")}
              className="text-sm font-bold text-green-500 hover:text-green-700"
            >
              X
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">
        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Total Payable
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-600">
            {formatCurrency(totalPayable)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            For {selectedMonth}
          </p>
        </div>

        <div className="card border border-green-200 bg-green-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
            Total Paid
          </p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(totalPaid)}
          </p>

          <p className="mt-1 text-xs text-green-600">
            Salary paid
          </p>
        </div>

        <div className="card border border-red-200 bg-red-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-red-500">
            Total Due
          </p>

          <p className="mt-2 text-2xl font-bold text-red-600">
            {formatCurrency(totalDue)}
          </p>

          <p className="mt-1 text-xs text-red-500">
            Outstanding salary
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Bonus
          </p>

          <p className="mt-2 text-2xl font-bold text-green-600">
            {formatCurrency(totalBonus)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Total bonus
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Deduction
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-600">
            {formatCurrency(totalDeduction)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Total deduction
          </p>
        </div>
      </div>

      <div className="card p-0">
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
          </div>
        ) : salaries.length === 0 ? (
          <div className="py-12 text-center">
            <div className="mb-3 text-4xl">
              💼
            </div>

            <p className="font-medium text-slate-500">
              No salary records for {selectedMonth}
            </p>

            {canManageSalary ? (
              <>
                <p className="mt-1 text-sm text-slate-400">
                  Click &quot;Pay Salary&quot; to create a
                  salary record.
                </p>

                <button
                  type="button"
                  onClick={openModal}
                  className="btn btn-primary btn-sm mt-4"
                >
                  Pay Salary
                </button>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-400">
                No salary record is available for this month.
              </p>
            )}
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Staff</th>
                  <th>Month</th>
                  <th>Basic</th>
                  <th>Bonus</th>
                  <th>Deduction</th>
                  <th>Payable</th>
                  <th>Paid</th>
                  <th>Due</th>
                  <th>Method</th>
                  <th>Date</th>
                </tr>
              </thead>

              <tbody>
                {salaries.map((row) => (
                  <tr key={row.salary.id}>
                    <td>
                      <div>
                        <p className="font-medium text-slate-700">
                          {row.staffName}
                        </p>

                        <p className="text-xs text-slate-400">
                          {row.designation}
                        </p>
                      </div>
                    </td>

                    <td>
                      <span className="badge badge-blue">
                        {row.salary.month}
                      </span>
                    </td>

                    <td>
                      {formatCurrency(
                        row.salary.basic,
                      )}
                    </td>

                    <td className="text-green-600">
                      {formatCurrency(
                        row.salary.bonus,
                      )}
                    </td>

                    <td className="text-red-600">
                      {formatCurrency(
                        row.salary.deduction,
                      )}
                    </td>

                    <td className="font-bold text-slate-700">
                      {formatCurrency(
                        row.salary.payable,
                      )}
                    </td>

                    <td className="font-bold text-green-600">
                      {formatCurrency(
                        row.salary.paid,
                      )}
                    </td>

                    <td
                      className={`font-bold ${
                        toNumber(row.salary.due) > 0
                          ? "text-red-600"
                          : "text-green-600"
                      }`}
                    >
                      {formatCurrency(
                        row.salary.due,
                      )}
                    </td>

                    <td>
                      <span className="badge badge-gray">
                        {row.salary.method || "—"}
                      </span>
                    </td>

                    <td className="text-slate-500">
                      {row.salary.paymentDate
                        ? formatDate(
                            row.salary.paymentDate,
                          )
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && canManageSalary && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (
              e.target === e.currentTarget &&
              !submitting
            ) {
              closeModal();
            }
          }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Pay Salary
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Create a monthly salary payment
                  record.
                </p>
              </div>

              <button
                type="button"
                onClick={closeModal}
                disabled={submitting}
                className="btn btn-ghost btn-sm"
              >
                X
              </button>
            </div>

            <form onSubmit={handleSubmit}>
              <div className="modal-body">
                {error && (
                  <div className="mb-4 rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <label className="form-label">
                      Staff Member *
                    </label>

                    <select
                      className="form-select"
                      value={form.staffId}
                      onChange={(e) =>
                        handleStaffSelect(
                          e.target.value,
                        )
                      }
                      required
                    >
                      <option value="">
                        Select staff
                      </option>

                      {staffList.map((staff) => (
                        <option
                          key={staff.id}
                          value={staff.id}
                        >
                          {staff.name} (
                          {staff.designation})
                        </option>
                      ))}
                    </select>

                    {staffList.length === 0 && (
                      <p className="mt-1 text-xs text-red-500">
                        No active staff members found.
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="form-label">
                      Month *
                    </label>

                    <input
                      type="month"
                      className="form-input"
                      value={form.month}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          month: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Basic Salary (৳) *
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={form.basic}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          basic: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Bonus (৳)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={form.bonus}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          bonus: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Deduction (৳)
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={form.deduction}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          deduction:
                            e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Payment Date
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={form.paymentDate}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          paymentDate:
                            e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Payment Method
                    </label>

                    <select
                      className="form-select"
                      value={form.method}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          method: e.target.value,
                        }))
                      }
                    >
                      {PAYMENT_METHODS.map(
                        (method) => (
                          <option
                            key={method.value}
                            value={method.value}
                          >
                            {method.label}
                          </option>
                        ),
                      )}
                    </select>
                  </div>
                </div>

                {toNumber(form.basic) > 0 && (
                  <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
                      Salary Preview
                    </p>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Basic
                        </span>

                        <span className="font-semibold text-slate-700">
                          {formatCurrency(
                            toNumber(form.basic),
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Bonus
                        </span>

                        <span className="font-semibold text-green-600">
                          {formatCurrency(
                            toNumber(form.bonus),
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Deduction
                        </span>

                        <span className="font-semibold text-red-600">
                          {formatCurrency(
                            toNumber(
                              form.deduction,
                            ),
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between border-t border-blue-100 pt-2">
                        <span className="font-semibold text-slate-700">
                          Payable
                        </span>

                        <span className="font-bold text-blue-700">
                          {formatCurrency(
                            Math.max(
                              0,
                              toNumber(
                                form.basic,
                              ) +
                                toNumber(
                                  form.bonus,
                                ) -
                                toNumber(
                                  form.deduction,
                                ),
                            ),
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={submitting}
                  className="btn btn-outline"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={
                    submitting ||
                    !canManageSalary ||
                    staffList.length === 0
                  }
                  className="btn btn-primary"
                >
                  {submitting
                    ? "Processing..."
                    : "Process Salary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
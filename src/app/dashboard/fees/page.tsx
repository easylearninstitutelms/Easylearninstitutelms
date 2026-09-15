"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import {
  formatCurrency,
  formatDate,
  getStatusColor,
  getInitials,
} from "@/lib/utils";

interface Fee {
  id: string;
  feeType: string;
  amount: string;
  discount: string;
  dueAmount: string;
  dueDate: string | null;
  status: string;
  createdAt: string;
}

interface FeeRow {
  fee: Fee;
  studentName: string;
  studentCode: string;
}

interface Payment {
  id: string;
  amount: string;
  method: string;
  receiptNumber: string;
  paidAt: string;
  transactionReference: string | null;
  feeId: string | null;
}

interface PaymentRow {
  payment: Payment;
  studentName: string;
  studentCode: string;
}

interface Student {
  id: string;
  name: string;
  studentId: string;
}

const FEE_TYPES = [
  { value: "MONTHLY", label: "Monthly" },
  { value: "ADMISSION", label: "Admission" },
  { value: "COURSE", label: "Course" },
  { value: "EXAM", label: "Exam" },
  { value: "OTHER", label: "Other" },
];

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

function normalizeFeeRow(row: any): FeeRow | null {
  const rawFee = row?.fee ?? row;

  if (!rawFee || typeof rawFee !== "object" || !rawFee.id) {
    return null;
  }

  return {
    fee: {
      id: String(rawFee.id),
      feeType: String(rawFee.feeType ?? "OTHER"),
      amount: String(rawFee.amount ?? "0"),
      discount: String(rawFee.discount ?? "0"),
      dueAmount: String(rawFee.dueAmount ?? "0"),
      dueDate: rawFee.dueDate ?? null,
      status: String(rawFee.status ?? "DUE"),
      createdAt: String(rawFee.createdAt ?? ""),
    },
    studentName: String(
      row?.studentName ??
        row?.student?.name ??
        rawFee.studentName ??
        ""
    ),
    studentCode: String(
      row?.studentCode ??
        row?.student?.studentId ??
        rawFee.studentCode ??
        ""
    ),
  };
}

function normalizeFeeRows(data: any): FeeRow[] {
  const source: any[] = Array.isArray(data?.fees)
    ? data.fees
    : Array.isArray(data)
      ? data
      : [];

  return source
    .map(normalizeFeeRow)
    .filter(
      (row: FeeRow | null): row is FeeRow =>
        row !== null
    );
}

function normalizePaymentRow(row: any): PaymentRow | null {
  const rawPayment = row?.payment ?? row;

  if (
    !rawPayment ||
    typeof rawPayment !== "object" ||
    !rawPayment.id
  ) {
    return null;
  }

  return {
    payment: {
      id: String(rawPayment.id),
      amount: String(rawPayment.amount ?? "0"),
      method: String(rawPayment.method ?? "CASH"),
      receiptNumber: String(
        rawPayment.receiptNumber ?? "-"
      ),
      paidAt: String(rawPayment.paidAt ?? ""),
      transactionReference:
        rawPayment.transactionReference ?? null,
      feeId: rawPayment.feeId ?? null,
    },
    studentName: String(
      row?.studentName ?? row?.student?.name ?? ""
    ),
    studentCode: String(
      row?.studentCode ??
        row?.student?.studentId ??
        ""
    ),
  };
}

function normalizePaymentRows(data: any): PaymentRow[] {
  const source: any[] = Array.isArray(data?.payments)
    ? data.payments
    : Array.isArray(data)
      ? data
      : [];

  return source
    .map(normalizePaymentRow)
    .filter(
      (row: PaymentRow | null): row is PaymentRow =>
        row !== null
    );
}

function getFeeTypeLabel(type: string) {
  return (
    FEE_TYPES.find((item) => item.value === type)?.label ||
    type.replaceAll("_", " ")
  );
}

function getPaymentMethodLabel(method: string) {
  return (
    PAYMENT_METHODS.find(
      (item) => item.value === method
    )?.label || method
  );
}

export default function FeesPage() {
  const [activeTab, setActiveTab] = useState<
    "fees" | "payments" | "collect"
  >("fees");

  const [fees, setFees] = useState<FeeRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [studentFees, setStudentFees] = useState<FeeRow[]>([]);

  const [loading, setLoading] = useState(true);
  const [loadingStudentFees, setLoadingStudentFees] =
    useState(false);
  const [submitting, setSubmitting] = useState(false);

  const [showFeeModal, setShowFeeModal] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [receipt, setReceipt] = useState<{
    receiptNumber: string;
    amount: string;
    method: string;
    studentName: string;
  } | null>(null);

  const [feeForm, setFeeForm] = useState({
    studentId: "",
    feeType: "MONTHLY",
    amount: "",
    discount: "",
    dueDate: "",
  });

  const [payForm, setPayForm] = useState({
    studentId: "",
    feeId: "",
    amount: "",
    method: "CASH",
    transactionReference: "",
  });

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [feesRes, paymentsRes, studentsRes] =
        await Promise.all([
          fetch("/api/fees", {
            cache: "no-store",
          }),
          fetch("/api/payments", {
            cache: "no-store",
          }),
          fetch(
            "/api/students?status=ACTIVE&limit=1000",
            {
              cache: "no-store",
            }
          ),
        ]);

      const [
        feesData,
        paymentsData,
        studentsData,
      ] = await Promise.all([
        feesRes.json(),
        paymentsRes.json(),
        studentsRes.json(),
      ]);

      if (!feesRes.ok) {
        throw new Error(
          feesData.error || "Failed to load fees."
        );
      }

      if (!paymentsRes.ok) {
        throw new Error(
          paymentsData.error ||
            "Failed to load payments."
        );
      }

      if (!studentsRes.ok) {
        throw new Error(
          studentsData.error ||
            "Failed to load students."
        );
      }

      setFees(normalizeFeeRows(feesData));
      setPayments(normalizePaymentRows(paymentsData));
      setStudents(
        Array.isArray(studentsData?.students)
          ? studentsData.students
          : []
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load fee information."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function loadStudentFees(
    studentId: string
  ) {
    setStudentFees([]);
    setError("");

    setPayForm((prev) => ({
      ...prev,
      studentId,
      feeId: "",
      amount: "",
    }));

    if (!studentId) {
      return;
    }

    try {
      setLoadingStudentFees(true);

      const res = await fetch(
        `/api/fees?studentId=${encodeURIComponent(
          studentId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to load student fees."
        );
      }

      const rows = normalizeFeeRows(data);

      setStudentFees(rows);

      const firstDueFee = rows.find(
        (row) =>
          (row.fee.status === "DUE" ||
            row.fee.status === "PARTIAL") &&
          toNumber(row.fee.dueAmount) > 0
      );

      if (firstDueFee) {
        setPayForm((prev) => ({
          ...prev,
          studentId,
          feeId: firstDueFee.fee.id,
          amount: firstDueFee.fee.dueAmount,
        }));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to load student fee information."
      );
    } finally {
      setLoadingStudentFees(false);
    }
  }

  async function handleAddFee(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    const amount = toNumber(feeForm.amount);
    const discount = toNumber(feeForm.discount);

    if (!feeForm.studentId) {
      setError("Please select a student.");
      setSubmitting(false);
      return;
    }

    if (amount <= 0) {
      setError(
        "Fee amount must be greater than 0."
      );
      setSubmitting(false);
      return;
    }

    if (discount < 0) {
      setError("Discount cannot be negative.");
      setSubmitting(false);
      return;
    }

    if (discount > amount) {
      setError(
        "Discount cannot be greater than the fee amount."
      );
      setSubmitting(false);
      return;
    }

    try {
      const res = await fetch("/api/fees", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...feeForm,
          amount: String(amount),
          discount: String(discount),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error || "Failed to add fee."
        );
      }

      setShowFeeModal(false);

      setFeeForm({
        studentId: "",
        feeType: "MONTHLY",
        amount: "",
        discount: "",
        dueDate: "",
      });

      setSuccess(
        "Fee record added successfully."
      );

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to add fee record."
      );
    } finally {
      setSubmitting(false);
    }
  }

  async function handleCollect(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");
    setReceipt(null);

    const amount = toNumber(payForm.amount);

    if (!payForm.studentId) {
      setError("Please select a student.");
      setSubmitting(false);
      return;
    }

    if (amount <= 0) {
      setError(
        "Payment amount must be greater than 0."
      );
      setSubmitting(false);
      return;
    }

    if (payForm.feeId) {
      const selectedFee = studentFees.find(
        (row) => row.fee.id === payForm.feeId
      );

      if (
        selectedFee &&
        amount > toNumber(selectedFee.fee.dueAmount)
      ) {
        setError(
          "Payment cannot be greater than the selected fee due."
        );
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...payForm,
          amount: String(amount),
          feeId: payForm.feeId || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to collect payment."
        );
      }

      const studentName =
        students.find(
          (student) =>
            student.id === payForm.studentId
        )?.name || "Student";

      setReceipt({
        receiptNumber:
          data.receiptNumber || "-",
        amount: String(amount),
        method: payForm.method,
        studentName,
      });

      setSuccess(
        "Payment collected successfully."
      );

      setPayForm({
        studentId: "",
        feeId: "",
        amount: "",
        method: "CASH",
        transactionReference: "",
      });

      setStudentFees([]);

      await fetchData();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to collect payment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  const totalBilled = useMemo(() => {
    return fees.reduce(
      (sum, row) =>
        sum + toNumber(row?.fee?.amount),
      0
    );
  }, [fees]);

  const totalDiscount = useMemo(() => {
    return fees.reduce(
      (sum, row) =>
        sum + toNumber(row?.fee?.discount),
      0
    );
  }, [fees]);

  const totalNetFees =
    totalBilled - totalDiscount;

  const totalDue = useMemo(() => {
    return fees.reduce(
      (sum, row) =>
        sum + toNumber(row?.fee?.dueAmount),
      0
    );
  }, [fees]);

  const totalAllocatedCollected =
    useMemo(() => {
      return fees.reduce((sum, row) => {
        const netAmount =
          toNumber(row?.fee?.amount) -
          toNumber(row?.fee?.discount);

        const dueAmount = toNumber(
          row?.fee?.dueAmount
        );

        return (
          sum +
          Math.max(0, netAmount - dueAmount)
        );
      }, 0);
    }, [fees]);

  const totalPayments = useMemo(() => {
    return payments.reduce(
      (sum, row) =>
        sum + toNumber(row?.payment?.amount),
      0
    );
  }, [payments]);

  const dueFees = useMemo(() => {
    return fees.filter(
      (row) =>
        (row?.fee?.status === "DUE" ||
          row?.fee?.status === "PARTIAL") &&
        toNumber(row?.fee?.dueAmount) > 0
    );
  }, [fees]);

  function openFeeModal() {
    setError("");
    setSuccess("");
    setShowFeeModal(true);
  }

  function closeFeeModal() {
    if (submitting) return;

    setShowFeeModal(false);
    setError("");

    setFeeForm({
      studentId: "",
      feeType: "MONTHLY",
      amount: "",
      discount: "",
      dueDate: "",
    });
  }

  function changeTab(
    tab: "fees" | "payments" | "collect"
  ) {
    setActiveTab(tab);
    setError("");
    setSuccess("");

    if (tab !== "collect") {
      setReceipt(null);
    }
  }

  function handlePaymentStudentChange(
    studentId: string
  ) {
    loadStudentFees(studentId);
  }

  function handleFeeSelection(
    feeId: string
  ) {
    const selected = studentFees.find(
      (row) => row.fee.id === feeId
    );

    setPayForm((prev) => ({
      ...prev,
      feeId,
      amount:
        selected?.fee.dueAmount || "",
    }));
  }

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Fees & Payments
          </h1>

          <p className="text-sm text-slate-500">
            Manage student fees, dues and payment
            collection.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openFeeModal}
            className="btn btn-outline"
          >
            Add Fee
          </button>

          <button
            type="button"
            onClick={() => changeTab("collect")}
            className="btn btn-accent"
          >
            Collect Payment
          </button>
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
            Total Billed
          </p>

          <p className="mt-2 text-2xl font-bold text-slate-800">
            {formatCurrency(totalBilled)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Before discount
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Discount
          </p>

          <p className="mt-2 text-2xl font-bold text-orange-600">
            {formatCurrency(totalDiscount)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            Total discount
          </p>
        </div>

        <div className="card">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Net Fees
          </p>

          <p className="mt-2 text-2xl font-bold text-blue-600">
            {formatCurrency(totalNetFees)}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            After discount
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
            Outstanding fees
          </p>
        </div>

        <div className="card border border-green-200 bg-green-50">
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
            Payments
          </p>

          <p className="mt-2 text-2xl font-bold text-green-700">
            {formatCurrency(totalPayments)}
          </p>

          <p className="mt-1 text-xs text-green-600">
            Payment records
          </p>
        </div>
      </div>

      {fees.length > 0 && (
        <div className="card">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-700">
                Fee Collection Summary
              </p>

              <p className="mt-1 text-xs text-slate-400">
                Allocated collection against fee
                records
              </p>
            </div>

            <div className="flex flex-wrap gap-5 text-sm">
              <div>
                <span className="text-slate-400">
                  Collected:
                </span>{" "}
                <span className="font-bold text-green-600">
                  {formatCurrency(
                    totalAllocatedCollected
                  )}
                </span>
              </div>

              <div>
                <span className="text-slate-400">
                  Outstanding records:
                </span>{" "}
                <span className="font-bold text-red-600">
                  {dueFees.length}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {(
          [
            {
              key: "fees",
              label: "Fee Records",
            },
            {
              key: "payments",
              label: "Payment History",
            },
            {
              key: "collect",
              label: "Collect Payment",
            },
          ] as const
        ).map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => changeTab(tab.key)}
            className={`whitespace-nowrap px-4 py-2.5 text-sm font-semibold transition-all ${
              activeTab === tab.key
                ? "border-b-2 border-blue-600 text-blue-600"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {receipt && (
        <div className="card border-2 border-green-300 bg-green-50">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-lg font-bold text-green-700">
                Payment Received!
              </p>

              <div className="mt-2 space-y-1 text-sm text-green-700">
                <p>
                  <span className="font-semibold">
                    Receipt:
                  </span>{" "}
                  {receipt.receiptNumber}
                </p>

                <p>
                  <span className="font-semibold">
                    Student:
                  </span>{" "}
                  {receipt.studentName}
                </p>

                <p>
                  <span className="font-semibold">
                    Amount:
                  </span>{" "}
                  {formatCurrency(receipt.amount)}
                </p>

                <p>
                  <span className="font-semibold">
                    Method:
                  </span>{" "}
                  {getPaymentMethodLabel(
                    receipt.method
                  )}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setReceipt(null)}
              className="text-sm font-bold text-green-600 hover:text-green-800"
            >
              X
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </div>
      ) : activeTab === "fees" ? (
        <div className="card p-0">
          <div className="table-wrapper">
            {fees.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="font-medium">
                  No fee records yet
                </p>

                <p className="mt-1 text-sm">
                  Click &quot;Add Fee&quot; to create a
                  fee record.
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Discount</th>
                    <th>Due</th>
                    <th>Due Date</th>
                    <th>Status</th>
                  </tr>
                </thead>

                <tbody>
                  {fees.map((row) => (
                    <tr key={row.fee.id}>
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                            {getInitials(
                              row.studentName || "?"
                            )}
                          </div>

                          <div>
                            <p className="font-medium text-slate-700">
                              {row.studentName ||
                                "Unknown Student"}
                            </p>

                            <p className="text-xs text-slate-400">
                              {row.studentCode || "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        <span className="badge badge-blue">
                          {getFeeTypeLabel(
                            row.fee.feeType
                          )}
                        </span>
                      </td>

                      <td className="font-medium">
                        {formatCurrency(
                          row.fee.amount
                        )}
                      </td>

                      <td className="text-slate-500">
                        {formatCurrency(
                          row.fee.discount
                        )}
                      </td>

                      <td
                        className={`font-semibold ${
                          toNumber(
                            row.fee.dueAmount
                          ) > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatCurrency(
                          row.fee.dueAmount
                        )}
                      </td>

                      <td className="text-slate-500">
                        {row.fee.dueDate
                          ? formatDate(
                              row.fee.dueDate
                            )
                          : "-"}
                      </td>

                      <td>
                        <span
                          className={`badge ${getStatusColor(
                            row.fee.status
                          )}`}
                        >
                          {row.fee.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : activeTab === "payments" ? (
        <div className="card p-0">
          <div className="table-wrapper">
            {payments.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="font-medium">
                  No payments yet
                </p>

                <p className="mt-1 text-sm">
                  Collected payments will appear here.
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Receipt</th>
                    <th>Student</th>
                    <th>Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Date</th>
                  </tr>
                </thead>

                <tbody>
                  {payments.map((row) => (
                    <tr key={row.payment.id}>
                      <td>
                        <span className="badge badge-green font-mono">
                          {row.payment.receiptNumber}
                        </span>
                      </td>

                      <td>
                        <div>
                          <p className="font-medium text-slate-700">
                            {row.studentName ||
                              "Unknown Student"}
                          </p>

                          <p className="text-xs text-slate-400">
                            {row.studentCode || "-"}
                          </p>
                        </div>
                      </td>

                      <td className="font-bold text-green-600">
                        {formatCurrency(
                          row.payment.amount
                        )}
                      </td>

                      <td>
                        <span className="badge badge-blue">
                          {getPaymentMethodLabel(
                            row.payment.method
                          )}
                        </span>
                      </td>

                      <td className="font-mono text-xs text-slate-500">
                        {row.payment
                          .transactionReference ||
                          "-"}
                      </td>

                      <td className="text-slate-500">
                        {formatDate(
                          row.payment.paidAt
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <div className="max-w-lg">
          <div className="card">
            <h2 className="mb-1 font-bold text-slate-800">
              Collect Payment
            </h2>

            <p className="mb-5 text-sm text-slate-500">
              Select a student and allocate the payment
              to an outstanding fee.
            </p>

            <form
              onSubmit={handleCollect}
              className="space-y-4"
            >
              <div>
                <label className="form-label">
                  Select Student *
                </label>

                <select
                  className="form-select"
                  value={payForm.studentId}
                  onChange={(e) =>
                    handlePaymentStudentChange(
                      e.target.value
                    )
                  }
                  required
                >
                  <option value="">
                    Search student...
                  </option>

                  {students.map((student) => (
                    <option
                      key={student.id}
                      value={student.id}
                    >
                      {student.name} (
                      {student.studentId})
                    </option>
                  ))}
                </select>
              </div>

              {payForm.studentId && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {loadingStudentFees ? (
                    <p className="text-sm text-slate-500">
                      Loading fee records...
                    </p>
                  ) : studentFees.length === 0 ? (
                    <p className="text-sm text-slate-500">
                      No fee records found for this
                      student. You can still record a
                      general payment.
                    </p>
                  ) : (
                    <div>
                      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Student Fee Summary
                      </p>

                      <div className="flex flex-wrap gap-4 text-sm">
                        <div>
                          <span className="text-slate-400">
                            Outstanding:
                          </span>{" "}
                          <span className="font-bold text-red-600">
                            {formatCurrency(
                              studentFees.reduce(
                                (sum, row) =>
                                  sum +
                                  toNumber(
                                    row.fee.dueAmount
                                  ),
                                0
                              )
                            )}
                          </span>
                        </div>

                        <div>
                          <span className="text-slate-400">
                            Due Records:
                          </span>{" "}
                          <span className="font-bold text-slate-700">
                            {
                              studentFees.filter(
                                (row) =>
                                  (row.fee.status ===
                                    "DUE" ||
                                    row.fee.status ===
                                      "PARTIAL") &&
                                  toNumber(
                                    row.fee.dueAmount
                                  ) > 0
                              ).length
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {studentFees.length > 0 && (
                <div>
                  <label className="form-label">
                    Fee Record
                  </label>

                  <select
                    className="form-select"
                    value={payForm.feeId}
                    onChange={(e) =>
                      handleFeeSelection(
                        e.target.value
                      )
                    }
                  >
                    <option value="">
                      General payment
                    </option>

                    {studentFees
                      .filter(
                        (row) =>
                          (row.fee.status === "DUE" ||
                            row.fee.status ===
                              "PARTIAL") &&
                          toNumber(
                            row.fee.dueAmount
                          ) > 0
                      )
                      .map((row) => (
                        <option
                          key={row.fee.id}
                          value={row.fee.id}
                        >
                          {getFeeTypeLabel(
                            row.fee.feeType
                          )}{" "}
                          - Due:{" "}
                          {formatCurrency(
                            row.fee.dueAmount
                          )}{" "}
                          ({row.fee.status})
                        </option>
                      ))}
                  </select>

                  {!payForm.feeId && (
                    <p className="mt-1 text-xs text-slate-400">
                      General payment will be recorded
                      but will not reduce a specific fee
                      due.
                    </p>
                  )}
                </div>
              )}

              <div>
                <label className="form-label">
                  Amount *
                </label>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  className="form-input"
                  placeholder="0.00"
                  value={payForm.amount}
                  onChange={(e) =>
                    setPayForm((prev) => ({
                      ...prev,
                      amount: e.target.value,
                    }))
                  }
                  required
                />

                {selectedFeeMessage(
                  studentFees,
                  payForm.feeId
                )}
              </div>

              <div>
                <label className="form-label">
                  Payment Method *
                </label>

                <select
                  className="form-select"
                  value={payForm.method}
                  onChange={(e) =>
                    setPayForm((prev) => ({
                      ...prev,
                      method: e.target.value,
                    }))
                  }
                >
                  {PAYMENT_METHODS.map((method) => (
                    <option
                      key={method.value}
                      value={method.value}
                    >
                      {method.label}
                    </option>
                  ))}
                </select>
              </div>

              {payForm.method !== "CASH" && (
                <div>
                  <label className="form-label">
                    Transaction Reference
                  </label>

                  <input
                    className="form-input"
                    placeholder="Transaction ID / Number"
                    value={
                      payForm.transactionReference
                    }
                    onChange={(e) =>
                      setPayForm((prev) => ({
                        ...prev,
                        transactionReference:
                          e.target.value,
                      }))
                    }
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="btn btn-accent w-full justify-center py-3"
              >
                {submitting
                  ? "Processing..."
                  : "Collect Payment & Generate Receipt"}
              </button>
            </form>
          </div>
        </div>
      )}

      {showFeeModal && (
        <div
          className="modal-overlay"
          onClick={(e) => {
            if (
              e.target === e.currentTarget &&
              !submitting
            ) {
              closeFeeModal();
            }
          }}
        >
          <div className="modal-box">
            <div className="modal-header">
              <div>
                <h2 className="modal-title">
                  Add Fee Record
                </h2>

                <p className="mt-1 text-xs text-slate-400">
                  Create a new student fee and due
                  amount.
                </p>
              </div>

              <button
                type="button"
                onClick={closeFeeModal}
                disabled={submitting}
                className="btn btn-ghost btn-sm"
              >
                X
              </button>
            </div>

            <form onSubmit={handleAddFee}>
              <div className="modal-body space-y-4">
                {error && (
                  <div className="rounded-xl bg-red-50 p-3 text-sm text-red-600">
                    {error}
                  </div>
                )}

                <div>
                  <label className="form-label">
                    Student *
                  </label>

                  <select
                    className="form-select"
                    value={feeForm.studentId}
                    onChange={(e) =>
                      setFeeForm((prev) => ({
                        ...prev,
                        studentId: e.target.value,
                      }))
                    }
                    required
                  >
                    <option value="">
                      Select student
                    </option>

                    {students.map((student) => (
                      <option
                        key={student.id}
                        value={student.id}
                      >
                        {student.name} (
                        {student.studentId})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="form-label">
                      Fee Type *
                    </label>

                    <select
                      className="form-select"
                      value={feeForm.feeType}
                      onChange={(e) =>
                        setFeeForm((prev) => ({
                          ...prev,
                          feeType: e.target.value,
                        }))
                      }
                    >
                      {FEE_TYPES.map((type) => (
                        <option
                          key={type.value}
                          value={type.value}
                        >
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="form-label">
                      Amount *
                    </label>

                    <input
                      type="number"
                      min="0.01"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={feeForm.amount}
                      onChange={(e) =>
                        setFeeForm((prev) => ({
                          ...prev,
                          amount: e.target.value,
                        }))
                      }
                      required
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Discount
                    </label>

                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      className="form-input"
                      placeholder="0.00"
                      value={feeForm.discount}
                      onChange={(e) =>
                        setFeeForm((prev) => ({
                          ...prev,
                          discount: e.target.value,
                        }))
                      }
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      Due Date
                    </label>

                    <input
                      type="date"
                      className="form-input"
                      value={feeForm.dueDate}
                      onChange={(e) =>
                        setFeeForm((prev) => ({
                          ...prev,
                          dueDate: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {toNumber(feeForm.amount) > 0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
                      Fee Preview
                    </p>

                    <div className="space-y-1 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Amount
                        </span>

                        <span className="font-semibold text-slate-700">
                          {formatCurrency(
                            toNumber(
                              feeForm.amount
                            )
                          )}
                        </span>
                      </div>

                      <div className="flex justify-between">
                        <span className="text-slate-500">
                          Discount
                        </span>

                        <span className="font-semibold text-orange-600">
                          {formatCurrency(
                            toNumber(
                              feeForm.discount
                            )
                          )}
                        </span>
                      </div>

                      <div className="mt-2 flex justify-between border-t border-blue-100 pt-2">
                        <span className="font-semibold text-slate-700">
                          Due Amount
                        </span>

                        <span className="font-bold text-red-600">
                          {formatCurrency(
                            Math.max(
                              0,
                              toNumber(
                                feeForm.amount
                              ) -
                                toNumber(
                                  feeForm.discount
                                )
                            )
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
                  onClick={closeFeeModal}
                  disabled={submitting}
                  className="btn btn-outline"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary"
                >
                  {submitting
                    ? "Adding..."
                    : "Add Fee"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function selectedFeeMessage(
  studentFees: FeeRow[],
  feeId: string
) {
  if (!feeId) {
    return null;
  }

  const fee = studentFees.find(
    (row) => row.fee.id === feeId
  );

  if (!fee) {
    return null;
  }

  return (
    <p className="mt-1 text-xs text-red-500">
      Maximum for this fee:{" "}
      {formatCurrency(fee.fee.dueAmount)}
    </p>
  );
}
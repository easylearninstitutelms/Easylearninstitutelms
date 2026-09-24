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
  semesterId: string | null;
  semesterName: string | null;
  semesterNo: number | null;
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

interface Semester {
  id: string;
  semesterNo: number;
  name: string;
  programmeId: string | null;
  programmeName: string | null;
}

interface StudentEnrollment {
  enrollment: {
    id: string;
    studentId: string;
    courseId: string | null;
    programmeId: string | null;
    status: string;
    batchId: string | null;
  };
  batch: {
    id: string;
    name: string;
    programmeId: string | null;
    semesterId: string | null;
    courseId: string | null;
  } | null;
  course: {
    id: string;
    name: string;
  } | null;
  programme: {
    id: string;
    name: string;
    code: string | null;
  } | null;
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

function toNumber(
  value: string | number | null | undefined
) {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : 0;
}

function normalizeFeeRow(
  row: any
): FeeRow | null {
  const rawFee = row?.fee ?? row;

  if (
    !rawFee ||
    typeof rawFee !== "object" ||
    !rawFee.id
  ) {
    return null;
  }

  const semesterNoValue =
    rawFee.semesterNo ??
    row?.semesterNo ??
    row?.semester?.semesterNo ??
    row?.semester?.semester_no ??
    null;

  const parsedSemesterNo =
    semesterNoValue === null ||
    semesterNoValue === undefined ||
    semesterNoValue === ""
      ? null
      : Number(semesterNoValue);

  return {
    fee: {
      id: String(rawFee.id),
      feeType: String(
        rawFee.feeType ?? "OTHER"
      ),
      amount: String(
        rawFee.amount ?? "0"
      ),
      discount: String(
        rawFee.discount ?? "0"
      ),
      dueAmount: String(
        rawFee.dueAmount ?? "0"
      ),
      dueDate:
        rawFee.dueDate ?? null,
      status: String(
        rawFee.status ?? "DUE"
      ),
      createdAt: String(
        rawFee.createdAt ?? ""
      ),
      semesterId:
        rawFee.semesterId ??
        row?.semesterId ??
        row?.semester?.id ??
        null,
      semesterName:
        rawFee.semesterName ??
        row?.semesterName ??
        row?.semester?.name ??
        null,
      semesterNo:
        Number.isFinite(
          parsedSemesterNo
        )
          ? parsedSemesterNo
          : null,
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

function normalizeFeeRows(
  data: any
): FeeRow[] {
  const source: any[] =
    Array.isArray(data?.fees)
      ? data.fees
      : Array.isArray(data)
        ? data
        : [];

  return source
    .map(normalizeFeeRow)
    .filter(
      (
        row: FeeRow | null
      ): row is FeeRow =>
        row !== null
    );
}

function normalizePaymentRow(
  row: any
): PaymentRow | null {
  const rawPayment =
    row?.payment ?? row;

  if (
    !rawPayment ||
    typeof rawPayment !== "object" ||
    !rawPayment.id
  ) {
    return null;
  }

  return {
    payment: {
      id: String(
        rawPayment.id
      ),

      amount: String(
        rawPayment.amount ?? "0"
      ),

      method: String(
        rawPayment.method ?? "CASH"
      ),

      receiptNumber: String(
        rawPayment.receiptNumber ?? "-"
      ),

      paidAt: String(
        rawPayment.paidAt ?? ""
      ),

      transactionReference:
        rawPayment.transactionReference ??
        null,

      feeId:
        rawPayment.feeId ?? null,
    },

    studentName: String(
      row?.studentName ??
        row?.student?.name ??
        ""
    ),

    studentCode: String(
      row?.studentCode ??
        row?.student?.studentId ??
        ""
    ),
  };
}

function normalizePaymentRows(
  data: any
): PaymentRow[] {
  const source: any[] =
    Array.isArray(data?.payments)
      ? data.payments
      : Array.isArray(data)
        ? data
        : [];

  return source
    .map(normalizePaymentRow)
    .filter(
      (
        row: PaymentRow | null
      ): row is PaymentRow =>
        row !== null
    );
}

function getFeeTypeLabel(
  type: string
) {
  return (
    FEE_TYPES.find(
      (item) =>
        item.value === type
    )?.label ||
    type.replaceAll("_", " ")
  );
}

function getPaymentMethodLabel(
  method: string
) {
  return (
    PAYMENT_METHODS.find(
      (item) =>
        item.value === method
    )?.label || method
  );
}

function getSemesterLabel(
  semester: Semester
) {
  const numberPart =
    semester.semesterNo
      ? `Semester ${semester.semesterNo}`
      : "Semester";

  const namePart =
    semester.name &&
    semester.name !==
      `Semester ${semester.semesterNo}`
      ? ` - ${semester.name}`
      : "";

  const programmePart =
    semester.programmeName
      ? ` (${semester.programmeName})`
      : "";

  return (
    numberPart +
    namePart +
    programmePart
  );
}

function getFeeSemesterLabel(
  fee: Fee
) {
  if (
    fee.semesterName ||
    fee.semesterNo
  ) {
    const numberPart =
      fee.semesterNo
        ? `Semester ${fee.semesterNo}`
        : "Semester";

    const namePart =
      fee.semesterName &&
      fee.semesterName !==
        `Semester ${fee.semesterNo}`
        ? ` - ${fee.semesterName}`
        : "";

    return numberPart + namePart;
  }

  return "-";
}

export default function FeesPage() {
  const [
    activeTab,
    setActiveTab,
  ] = useState<
    "fees" | "payments" | "collect"
  >("fees");

  const [fees, setFees] =
    useState<FeeRow[]>([]);

  const [payments, setPayments] =
    useState<PaymentRow[]>([]);

  const [students, setStudents] =
    useState<Student[]>([]);

  const [semesters, setSemesters] =
    useState<Semester[]>([]);

  const [studentFees, setStudentFees] =
    useState<FeeRow[]>([]);

  const [
    studentEnrollments,
    setStudentEnrollments,
  ] = useState<
    Record<string, StudentEnrollment[]>
  >({});

  const [loading, setLoading] =
    useState(true);

  const [
    loadingStudentFees,
    setLoadingStudentFees,
  ] = useState(false);

  const [
    loadingStudentEnrollment,
    setLoadingStudentEnrollment,
  ] = useState(false);

  const [
    loadingSemesters,
    setLoadingSemesters,
  ] = useState(false);

  const [submitting, setSubmitting] =
    useState(false);

  const [
    showFeeModal,
    setShowFeeModal,
  ] = useState(false);

  const [error, setError] =
    useState("");

  const [success, setSuccess] =
    useState("");

  const [receipt, setReceipt] =
    useState<any>(null);

  const [feeForm, setFeeForm] =
    useState({
      studentId: "",
      academicType: "COURSE" as "COURSE" | "PROGRAMME",

      courseId: "",
      programmeId: "",
      semesterId: "",
      feeType: "MONTHLY",
      amount: "",
      discount: "",
      dueDate: "",
    });

  const [payForm, setPayForm] =
    useState({
      studentId: "",
      feeId: "",
      amount: "",
      method: "CASH",
      transactionReference: "",
    });

  const fetchData =
    useCallback(async () => {
      try {
        setLoading(true);
        setLoadingSemesters(true);
        setError("");

        const [
          feesRes,
          paymentsRes,
          studentsRes,
          programmesRes,
        ] = await Promise.all([
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

          fetch("/api/programmes", {
            cache: "no-store",
          }),
        ]);

        const [
          feesData,          paymentsData,          studentsData,
          programmesData,
        ] = await Promise.all([
          feesRes.json(),
          paymentsRes.json(),
          studentsRes.json(),
          programmesRes.json(),
        ]);

        if (!feesRes.ok) {
          throw new Error(
            feesData.error ||
              "Failed to load fees."
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

        setFees(
          normalizeFeeRows(
            feesData
          )
        );

        setPayments(
          normalizePaymentRows(
            paymentsData
          )
        );

        setStudents(
          Array.isArray(
            studentsData?.students
          )
            ? studentsData.students
            : []
        );

        if (programmesRes.ok) {
          const programmeRows: any[] =
            Array.isArray(
              programmesData?.programmes
            )
              ? programmesData.programmes
              : Array.isArray(
                    programmesData
                  )
                ? programmesData
                : [];

          const semesterRows: Semester[] =
            programmeRows.flatMap(
              (programme) => {
                const programmeId =
                  programme?.id
                    ? String(
                        programme.id
                      )
                    : null;

                const programmeName =
                  programme?.name
                    ? String(
                        programme.name
                      )
                    : null;

                const sourceSemesters =
                  Array.isArray(
                    programme?.semesters
                  )
                    ? programme.semesters
                    : [];

                return sourceSemesters
                  .filter(
                    (semester: any) =>
                      semester?.id
                  )
                  .map(
                    (
                      semester: any
                    ) => {
                      const rawNo =
                        semester.semesterNo ??
                        semester.semester_no ??
                        0;

                      const parsedNo =
                        Number(rawNo);

                      return {
                        id: String(
                          semester.id
                        ),
                        semesterNo:
                          Number.isFinite(
                            parsedNo
                          )
                            ? parsedNo
                            : 0,
                        name: String(
                          semester.name ??
                            `Semester ${rawNo}`
                        ),
                        programmeId,
                        programmeName,
                      };
                    }
                  );
              }
            );

          const uniqueSemesters =
            Array.from(
              new Map(
                semesterRows.map(
                  (semester) => [
                    semester.id,
                    semester,
                  ]
                )
              ).values()
            );

          uniqueSemesters.sort(
            (a, b) => {
              const programmeCompare =
                String(
                  a.programmeName ||
                    ""
                ).localeCompare(
                  String(
                    b.programmeName ||
                      ""
                  )
                );

              if (
                programmeCompare !== 0
              ) {
                return programmeCompare;
              }

              return (
                a.semesterNo -
                b.semesterNo
              );
            }
          );

          setSemesters(
            uniqueSemesters
          );
        } else {
          setSemesters([]);
        }
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load fee information."
        );
      } finally {
        setLoading(false);
        setLoadingSemesters(false);
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
        "/api/fees?studentId=" +
          encodeURIComponent(
            studentId
          ),
        {
          cache: "no-store",
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to load student fees."
        );
      }

      const rows =
        normalizeFeeRows(data);

      setStudentFees(rows);

      const firstDueFee =
        rows.find(
          (row) =>
            (
              row.fee.status ===
                "DUE" ||
              row.fee.status ===
                "PARTIAL"
            ) &&
            toNumber(
              row.fee.dueAmount
            ) > 0
        );

      if (firstDueFee) {
        setPayForm((prev) => ({
          ...prev,
          studentId,
          feeId:
            firstDueFee.fee.id,
          amount:
            firstDueFee.fee.dueAmount,
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

  async function loadStudentEnrollment(
    studentId: string
  ) {
    if (!studentId) {
      setStudentEnrollments({});
      return;
    }

    try {
      setLoadingStudentEnrollment(
        true
      );

      const response = await fetch(
        `/api/students/${encodeURIComponent(
          studentId
        )}`,
        {
          cache: "no-store",
        }
      );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Failed to load student enrollment."
        );
      }

      const enrollments =
        Array.isArray(
          data?.enrollments
        )
          ? data.enrollments
          : [];

      setStudentEnrollments(
        (prev) => ({
          ...prev,
          [studentId]:
            enrollments,
        })
      );
    } catch (err) {
      console.error(
        "Failed to load student enrollment:",
        err
      );

      setStudentEnrollments(
        (prev) => ({
          ...prev,
          [studentId]: [],
        })
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to load student enrollment."
      );
    } finally {
      setLoadingStudentEnrollment(
        false
      );
    }
  }

  function handleFeeStudentChange(
    studentId: string
  ) {
    setFeeForm((prev) => ({
      ...prev,
      studentId,
      academicType: "COURSE" as "COURSE" | "PROGRAMME",

      courseId: "",
      programmeId: "",
      semesterId: "",
    }));

    setError("");

    if (!studentId) {
      setStudentEnrollments({});
      return;
    }

    void loadStudentEnrollment(
      studentId
    );
  }

  const selectedStudentEnrollments =
    feeForm.studentId
      ? studentEnrollments[
          feeForm.studentId
        ] ?? []
      : [];

  const activeStudentEnrollments =
    selectedStudentEnrollments.filter(
      (item) =>
        String(
          item?.enrollment?.status ||
            ""
        ).toUpperCase() ===
        "ACTIVE"
    );

  const availableFeeCourses = Array.from(
    new Map(
      activeStudentEnrollments
        .map((item) => item?.course)
        .filter(Boolean)
        .map((course) => [
          String(course!.id),
          {
            id: String(course!.id),
            name: String(course!.name),
          },
        ])
    ).values()
  );

  const availableFeeProgrammes = Array.from(
    new Map(
      activeStudentEnrollments
        .map((item) => item?.programme)
        .filter(Boolean)
        .map((programme) => [
          String(programme!.id),
          {
            id: String(programme!.id),
            name: String(programme!.name),
            code: programme!.code
              ? String(programme!.code)
              : null,
          },
        ])
    ).values()
  );

  const availableFeeSemesters =
    feeForm.programmeId
      ? semesters.filter(
          (semester) =>
            semester.programmeId ===
            feeForm.programmeId
        )
      : [];

  const selectedFeeCourse =
    availableFeeCourses.find(
      (course) =>
        course.id === feeForm.courseId
    ) || null;

  const selectedFeeProgramme =
    availableFeeProgrammes.find(
      (programme) =>
        programme.id === feeForm.programmeId
    ) || null;

  const selectedStudentProgrammeNames =
    availableFeeProgrammes.map(
      (programme) => programme.name
    );

  const uniqueStudentProgrammeNames =
    Array.from(
      new Set(
        selectedStudentProgrammeNames
      )
    );

  async function handleAddFee(
    e: FormEvent<HTMLFormElement>
  ) {
    e.preventDefault();

    setSubmitting(true);
    setError("");
    setSuccess("");

    const amount =
      toNumber(feeForm.amount);

    const discount =
      toNumber(feeForm.discount);

    if (!feeForm.studentId) {
      setError(
        "Please select a student."
      );
      setSubmitting(false);
      return;
    }

    if (
      feeForm.academicType === "COURSE" &&
      !feeForm.courseId
    ) {
      setError("Please select a course.");
      setSubmitting(false);
      return;
    }

    if (
      feeForm.academicType === "PROGRAMME" &&
      !feeForm.programmeId
    ) {
      setError("Please select a programme.");
      setSubmitting(false);
      return;
    }

    if (
      feeForm.academicType === "PROGRAMME" &&
      !feeForm.semesterId
    ) {
      setError("Please select a semester.");
      setSubmitting(false);
      return;
    }

    const selectedEnrollment =
      activeStudentEnrollments.find((item) => {
        if (feeForm.academicType === "COURSE") {
          return String(
            item?.enrollment?.courseId ||              item?.course?.id ||
              ""          ) === feeForm.courseId;
        }

        return String(
          item?.enrollment?.programmeId ||
            item?.programme?.id ||
            ""
        ) === feeForm.programmeId;
      });

    if (!selectedEnrollment) {
      setError(
        "The selected Course or Programme is not part of this student's active enrollment."
      );
      setSubmitting(false);
      return;
    }

    if (feeForm.academicType === "PROGRAMME") {
      const selectedSemester =
        availableFeeSemesters.find(
          (semester) =>
            semester.id ===
            feeForm.semesterId
        );

      if (!selectedSemester) {
        setError(
          "The selected semester does not belong to this student's enrolled programme."
        );
        setSubmitting(false);
        return;
      }
    }

    if (amount <= 0) {
      setError(
        "Fee amount must be greater than 0."
      );
      setSubmitting(false);
      return;
    }

    if (discount < 0) {
      setError(
        "Discount cannot be negative."
      );
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
      const res = await fetch(
        "/api/fees",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            studentId: feeForm.studentId,
            courseId:
              feeForm.academicType === "COURSE"
                ? feeForm.courseId
                : null,
            programmeId:
              feeForm.academicType === "PROGRAMME"
                ? feeForm.programmeId
                : null,
            semesterId:
              feeForm.academicType === "PROGRAMME"
                ? feeForm.semesterId
                : null,
            feeType: feeForm.feeType,
            amount: String(
              amount
            ),
            discount: String(
              discount
            ),
            dueDate: feeForm.dueDate || null,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to add fee."
        );
      }

      setShowFeeModal(false);

      setFeeForm({
        studentId: "",
        academicType: "COURSE" as "COURSE" | "PROGRAMME",

        courseId: "",
        programmeId: "",
        semesterId: "",
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

    const amount =
      toNumber(payForm.amount);

    if (!payForm.studentId) {
      setError(
        "Please select a student."
      );
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
      const selectedFee =
        studentFees.find(
          (row) =>
            row.fee.id ===
            payForm.feeId
        );

      if (
        selectedFee &&
        amount >
          toNumber(
            selectedFee.fee.dueAmount
          )
      ) {
        setError(
          "Payment cannot be greater than the selected fee due."
        );
        setSubmitting(false);
        return;
      }
    }

    try {
      const res = await fetch(
        "/api/payments",
        {
          method: "POST",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            ...payForm,
            amount: String(
              amount
            ),
            feeId:
              payForm.feeId ||
              null,
          }),
        }
      );

      const data =
        await res.json();

      if (!res.ok) {
        throw new Error(
          data.error ||
            "Failed to collect payment."
        );
      }

      const paymentId =
        data?.payment?.id;

      if (!paymentId) {
        throw new Error(
          "Payment was saved, but receipt details could not be loaded."
        );
      }

      const receiptRes =
        await fetch(
          "/api/payments/" +
            paymentId +
            "/receipt",
          {
            cache: "no-store",
          }
        );

      const receiptData =
        await receiptRes.json();

      if (!receiptRes.ok) {
        throw new Error(
          receiptData.error ||
            "Payment was saved, but receipt could not be loaded."
        );
      }

      if (
        !receiptData?.receipt
      ) {
        throw new Error(
          "Payment was saved, but receipt data is unavailable."
        );
      }

      setReceipt(
        receiptData.receipt
      );

      setSuccess(
        "Payment collected successfully."
      );

      setPayForm({
        studentId: "",
        feeId: "",
        amount: "",
        method: "CASH",
        transactionReference:
          "",
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

  const totalBilled =
    useMemo(() => {
      return fees.reduce(
        (sum, row) =>
          sum +
          toNumber(
            row?.fee?.amount
          ),
        0
      );
    }, [fees]);

  const totalDiscount =
    useMemo(() => {
      return fees.reduce(
        (sum, row) =>
          sum +
          toNumber(
            row?.fee?.discount
          ),
        0
      );
    }, [fees]);

  const totalNetFees =
    totalBilled - totalDiscount;

  const totalDue =
    useMemo(() => {
      return fees.reduce(
        (sum, row) =>
          sum +
          toNumber(
            row?.fee?.dueAmount
          ),
        0
      );
    }, [fees]);

  const totalAllocatedCollected =
    useMemo(() => {
      return fees.reduce(
        (sum, row) => {
          const netAmount =
            toNumber(
              row?.fee?.amount
            ) -
            toNumber(
              row?.fee?.discount
            );

          const dueAmount =
            toNumber(
              row?.fee?.dueAmount
            );

          return (
            sum +
            Math.max(
              0,
              netAmount -
                dueAmount
            )
          );
        },
        0
      );
    }, [fees]);

  const totalPayments =
    useMemo(() => {
      return payments.reduce(
        (sum, row) =>
          sum +
          toNumber(
            row?.payment?.amount
          ),
        0
      );
    }, [payments]);

  const dueFees =
    useMemo(() => {
      return fees.filter(
        (row) =>
          (
            row?.fee?.status ===
              "DUE" ||
            row?.fee?.status ===
              "PARTIAL"
          ) &&
          toNumber(
            row?.fee?.dueAmount
          ) > 0
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
      academicType: "COURSE" as "COURSE" | "PROGRAMME",

      courseId: "",
      programmeId: "",
      semesterId: "",
      feeType: "MONTHLY",
      amount: "",
      discount: "",
      dueDate: "",
    });
  }

  function changeTab(
    tab:
      | "fees"
      | "payments"
      | "collect"
  ) {
    setActiveTab(tab);
    setError("");
    setSuccess("");

    if (tab !== "collect") {
      setReceipt(null);
    }
  }

  function handleGenerateReceipt() {
    if (!receipt) return;

    const popup = window.open(
      "",
      "_blank",
      "width=500,height=850"
    );

    if (!popup) {
      setError(
        "Please allow pop-ups to generate the receipt."
      );
      return;
    }

    const escapeHtml = (
      value: unknown
    ) =>
      String(value ?? "")
        .replace(
          /&/g,
          "&amp;"
        )
        .replace(
          /</g,
          "&lt;"
        )
        .replace(
          />/g,
          "&gt;"
        )
        .replace(
          /"/g,
          "&quot;"
        )
        .replace(
          /'/g,
          "&#039;"
        );

    const payment =
      receipt.payment || {};

    const student =
      receipt.student || {};

    const fee =
      receipt.fee || {};

    const institute =
      receipt.institute || {};

    const academic =
      receipt.academic || {};

    const logoUrl =
      institute.logoUrl
        ? new URL(
            String(
              institute.logoUrl
            ),
            window.location.origin
          ).href
        : "";

    const paidDate =
      payment.paidAt
        ? new Date(
            payment.paidAt
          ).toLocaleString(
            "en-GB",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",            }          )
        : new Date().toLocaleString(
            "en-GB",
            {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            }
          );

    const courseName = String(
      academic.courseName ||
        ""
    );

    const programmeName =
      String(
        academic.programmeName ||
          ""
      );

    const semesterName =
      String(
        academic.semesterName ||
          ""
      );

    const batchName = String(
      academic.batchName || ""
    );

    const paymentMethod =
      getPaymentMethodLabel(
        String(
          payment.method || ""
        )
      );

    const feeType = fee.type
      ? getFeeTypeLabel(
          String(fee.type)
        )
      : "";

    const receiptNumber =
      escapeHtml(
        payment.receiptNumber ||
          "-"
      );

    const instituteName =
      escapeHtml(
        institute.name ||
          "Easylearn Institute"
      );

    const instituteAddress =
      institute.address
        ? escapeHtml(
            institute.address
          )
        : "";

    const instituteEmail =
      institute.email
        ? escapeHtml(
            institute.email
          )
        : "";

    const studentName =
      escapeHtml(
        student.name || "-"
      );

    const studentPhone =
      student.phone
        ? escapeHtml(
            student.phone
          )
        : "";

    const studentCode =
      escapeHtml(
        student.studentCode ||
          student.studentId ||
          "-"
      );

    const safeCourseName =
      escapeHtml(
        courseName
      );

    const safeProgrammeName =
      escapeHtml(
        programmeName
      );

    const safeSemesterName =
      escapeHtml(
        semesterName
      );

    const safeBatchName =
      escapeHtml(
        batchName
      );

    const safePaymentMethod =
      escapeHtml(
        paymentMethod
      );

    const safeFeeType =
      escapeHtml(
        feeType
      );

    const safePaidDate =
      escapeHtml(
        paidDate
      );

    const safeReference =
      payment.transactionReference
        ? escapeHtml(
            payment.transactionReference
          )
        : "";

    const safeAmount =
      escapeHtml(
        formatCurrency(
          String(
            payment.amount ||
              "0"
          )
        )
      );

    let logoHtml = "";

    if (logoUrl) {
      logoHtml =
        '<img class="logo" src="' +
        escapeHtml(
          logoUrl
        ) +
        '" alt="Institute Logo" />';
    }

    let addressHtml = "";

    if (instituteAddress) {
      addressHtml =
        '<div class="address">' +
        instituteAddress +
        "</div>";
    }

    let contactHtml = "";

    if (instituteEmail) {
      contactHtml =
        '<div class="contact">Email: ' +
        instituteEmail +
        "</div>";
    }

    const studentPhoneHtml =
      studentPhone
        ? '<div class="row">' +
          '<span class="label">Phone</span>' +
          '<span class="value">' +
          studentPhone +
          "</span>" +
          "</div>"
        : "";

    let academicHtml = "";

    if (
      courseName ||
      programmeName ||
      semesterName ||
      batchName
    ) {
      academicHtml =
        '<div class="section-title">' +
        "Academic Details" +
        "</div>";

      if (courseName) {
        academicHtml +=
          '<div class="row">' +
          '<span class="label">Course</span>' +
          '<span class="value">' +
          safeCourseName +
          "</span>" +
          "</div>";
      }

      if (programmeName) {
        academicHtml +=
          '<div class="row">' +
          '<span class="label">Programme</span>' +
          '<span class="value">' +
          safeProgrammeName +
          "</span>" +
          "</div>";
      }

      if (semesterName) {
        academicHtml +=
          '<div class="row">' +
          '<span class="label">Semester</span>' +
          '<span class="value">' +
          safeSemesterName +
          "</span>" +
          "</div>";
      }

      if (batchName) {
        academicHtml +=
          '<div class="row">' +
          '<span class="label">Batch</span>' +
          '<span class="value">' +
          safeBatchName +
          "</span>" +
          "</div>";
      }
    }

    let feeTypeHtml = "";

    if (safeFeeType) {
      feeTypeHtml =
        '<div class="row">' +
        '<span class="label">Fee Type</span>' +
        '<span class="value">' +
        safeFeeType +
        "</span>" +
        "</div>";
    }

    let referenceHtml = "";

    if (safeReference) {
      referenceHtml =
        '<div class="row">' +
        '<span class="label">Reference</span>' +
        '<span class="value">' +
        safeReference +
        "</span>" +
        "</div>";
    }

    let html = "";

    html += "<!DOCTYPE html>";
    html += "<html>";
    html += "<head>";
    html +=
      '<meta charset="utf-8" />';
    html +=
      "<title>Receipt " +
      receiptNumber +
      "</title>";

    html += "<style>";

    html +=
      "*{box-sizing:border-box;}";

    html +=
      "@page{size:80mm auto;margin:0;}";

    html +=
      "html,body{width:80mm;margin:0;padding:0;background:#fff;}";

    html +=
      "body{font-family:Arial,Helvetica,sans-serif;color:#172033;}";

    html +=
      ".receipt{width:80mm;padding:4mm 4mm 5mm;}";

    html +=
      ".top-line{height:2.5mm;background:linear-gradient(to right,#1264d8 0%,#1264d8 65%,#f59e0b 65%,#f59e0b 100%);margin:-4mm -4mm 4mm;}";

    html +=
      ".header{text-align:center;}";

    html +=
      ".logo{display:block;max-width:28mm;max-height:20mm;margin:0 auto 2mm;object-fit:contain;}";

    html +=
      ".institute-name{color:#1264d8;font-size:17px;font-weight:800;line-height:1.2;}";

    html +=
      ".receipt-title{color:#f59e0b;font-size:12px;font-weight:800;letter-spacing:1.2px;margin-top:1mm;}";

    html +=
      ".address{margin-top:2mm;color:#64748b;font-size:8.5px;line-height:1.45;}";

    html +=
      ".contact{color:#64748b;font-size:8px;line-height:1.4;}";

    html +=
      ".divider{border:0;border-top:1px dashed #94a3b8;margin:3mm 0;}";

    html +=
      ".receipt-meta{display:grid;grid-template-columns:1fr 1fr;gap:2mm;margin-bottom:2mm;}";

    html +=
      ".meta-box{border:1px solid #dbe3ef;border-radius:2mm;padding:2mm;}";

    html +=
      ".label{color:#64748b;font-size:7.5px;text-transform:uppercase;letter-spacing:.5px;}";

    html +=
      ".value{color:#172033;font-size:9px;font-weight:700;margin-top:.8mm;word-break:break-word;}";

    html +=
      ".section-title{color:#1264d8;font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.6px;margin:3mm 0 1.5mm;}";

    html +=
      ".row{display:flex;justify-content:space-between;gap:3mm;padding:1.7mm 0;border-bottom:1px solid #edf1f5;}";

    html +=
      ".row .label{flex:0 0 36%;}";

    html +=
      ".row .value{flex:1;text-align:right;}";

    html +=
      ".amount-box{margin-top:3mm;padding:3mm;border:1.5px solid #1264d8;border-radius:2.5mm;text-align:center;background:#f5f9ff;}";

    html +=
      ".amount-label{color:#1264d8;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.7px;}";

    html +=
      ".amount{color:#1264d8;font-size:22px;font-weight:900;margin-top:1mm;}";

    html +=
      ".method{display:inline-block;margin-top:2mm;padding:1.2mm 3mm;border-radius:10mm;background:#fff7e6;color:#c77700;font-size:8px;font-weight:800;}";

    html +=
      ".footer-line{height:1.5mm;background:linear-gradient(to right,#1264d8 0%,#1264d8 65%,#f59e0b 65%,#f59e0b 100%);margin:4mm -4mm 3mm;}";

    html +=
      ".machine{text-align:center;color:#475569;font-size:7.5px;font-weight:800;letter-spacing:1px;}";

    html +=
      ".thanks{text-align:center;color:#94a3b8;font-size:7.5px;margin-top:1.5mm;}";

    html +=
      ".actions{width:80mm;padding:4mm;display:flex;gap:2mm;}";

    html +=
      ".actions button{flex:1;border:0;border-radius:2mm;padding:3mm;cursor:pointer;font-weight:700;font-size:11px;}";

    html +=
      ".print-btn{background:#1264d8;color:#fff;}";

    html +=
      ".close-btn{background:#e5e7eb;color:#172033;}";

    html +=
      "@media print{.actions{display:none;}.receipt{padding-bottom:4mm;}}";

    html += "</style>";
    html += "</head>";
    html += "<body>";

    html +=
      '<div class="receipt">';

    html +=
      '<div class="top-line"></div>';

    html +=
      '<div class="header">';

    html += logoHtml;

    html +=
      '<div class="institute-name">' +
      instituteName +
      "</div>";

    html +=
      '<div class="receipt-title">PAYMENT RECEIPT</div>';

    html += addressHtml;

    html += contactHtml;

    html += "</div>";

    html +=
      '<hr class="divider" />';

    html +=
      '<div class="receipt-meta">';

    html +=
      '<div class="meta-box">';

    html +=
      '<div class="label">Receipt No</div>';

    html +=
      '<div class="value">' +
      receiptNumber +
      "</div>";

    html += "</div>";

    html +=
      '<div class="meta-box">';

    html +=
      '<div class="label">Date</div>';

    html +=
      '<div class="value">' +
      safePaidDate +
      "</div>";

    html += "</div>";

    html += "</div>";

    html +=
      '<div class="section-title">Student Details</div>';

    html +=
      '<div class="row">';

    html +=
      '<span class="label">Student</span>';

    html +=
      '<span class="value">' +
      studentName +
      "</span>";

    html += "</div>";

    html +=
      '<div class="row">';

    html +=
      '<span class="label">Student ID</span>';

    html +=
      '<span class="value">' +
      studentCode +
      "</span>";

    html += "</div>";

    html += studentPhoneHtml;

    html += academicHtml;

    html +=
      '<div class="section-title">Payment Details</div>';

    html += feeTypeHtml;

    html +=
      '<div class="row">';

    html +=
      '<span class="label">Payment Method</span>';

    html +=
      '<span class="value">' +
      safePaymentMethod +
      "</span>";

    html += "</div>";

    html += referenceHtml;

    html +=
      '<div class="amount-box">';

    html +=
      '<div class="amount-label">Amount Paid</div>';

    html +=
      '<div class="amount">' +
      safeAmount +
      "</div>";
    html +=      '<div class="method">' +
      safePaymentMethod +
      "</div>";

    html += "</div>";

    html +=
      '<div class="footer-line"></div>';

    html +=
      '<div class="machine">MACHINE GENERATED RECEIPT</div>';

    html +=
      '<div class="thanks">Thank you for your payment.</div>';

    html += "</div>";

    html +=
      '<div class="actions">';

    html +=
      '<button class="print-btn" onclick="window.print()">PRINT / SAVE PDF</button>';

    html +=
      '<button class="close-btn" onclick="window.close()">CLOSE</button>';

    html += "</div>";

    html += "</body>";
    html += "</html>";

    popup.document.open();
    popup.document.write(html);
    popup.document.close();

    setTimeout(() => {
      popup.focus();
      popup.print();
    }, 700);
  }

  function handlePaymentStudentChange(
    studentId: string
  ) {
    loadStudentFees(studentId);
  }

  function handleFeeSelection(
    feeId: string
  ) {
    const selected =
      studentFees.find(
        (row) =>
          row.fee.id === feeId
      );

    setPayForm((prev) => ({
      ...prev,
      feeId,
      amount:
        selected?.fee
          .dueAmount || "",
    }));
  }

  const selectedFeeSemester =
    availableFeeSemesters.find(
      (semester) =>
        semester.id ===
        feeForm.semesterId
    );

  return (
    <div className="space-y-5">
      <div className="page-header">
        <div>
          <h1 className="page-title">
            Fees & Payments
          </h1>

          <p className="text-sm text-slate-500">
            Manage student fees, dues and
            payment collection.
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
            onClick={() =>
              changeTab("collect")
            }
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
              onClick={() =>
                setError("")
              }
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
              onClick={() =>
                setSuccess("")
              }
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
            {formatCurrency(
              totalBilled
            )}
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
            {formatCurrency(
              totalDiscount
            )}
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
            {formatCurrency(
              totalNetFees
            )}
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
            {formatCurrency(
              totalDue
            )}
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
            {formatCurrency(
              totalPayments
            )}
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
                Allocated collection against
                fee records
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
            onClick={() =>
              changeTab(tab.key)
            }
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
            <div className="min-w-0">
              <p className="text-lg font-bold text-green-700">
                Payment Received!
              </p>

              <div className="mt-2 space-y-1 text-sm text-green-700">
                <p>
                  <span className="font-semibold">
                    Receipt:
                  </span>{" "}
                  {receipt?.payment
                    ?.receiptNumber ||
                    "-"}
                </p>

                <p>
                  <span className="font-semibold">
                    Student:
                  </span>{" "}
                  {receipt?.student
                    ?.name || "-"}
                </p>

                {receipt?.academic
                  ?.courseName && (
                  <p>
                    <span className="font-semibold">
                      Course:
                    </span>{" "}
                    {
                      receipt.academic
                        .courseName
                    }
                  </p>
                )}

                {receipt?.academic
                  ?.programmeName && (
                  <p>
                    <span className="font-semibold">
                      Programme:
                    </span>{" "}
                    {
                      receipt.academic
                        .programmeName
                    }
                  </p>
                )}

                {receipt?.academic
                  ?.semesterName && (
                  <p>
                    <span className="font-semibold">
                      Semester:
                    </span>{" "}
                    {
                      receipt.academic
                        .semesterName
                    }
                  </p>
                )}

                <p>
                  <span className="font-semibold">
                    Amount:
                  </span>{" "}
                  {formatCurrency(
                    String(
                      receipt?.payment
                        ?.amount ||
                        "0"
                    )
                  )}
                </p>

                <p>
                  <span className="font-semibold">
                    Method:
                  </span>{" "}
                  {getPaymentMethodLabel(
                    String(
                      receipt?.payment
                        ?.method ||
                        ""
                    )
                  )}
                </p>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={
                    handleGenerateReceipt
                  }
                  className="btn btn-primary"
                >
                  Generate Receipt
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() =>
                setReceipt(null)
              }
              className="shrink-0 text-sm font-bold text-green-600 hover:text-green-800"
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
                  Click &quot;Add Fee&quot; to
                  create a fee record.
                </p>
              </div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>Semester</th>
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
                    <tr
                      key={
                        row.fee.id
                      }
                    >
                      <td>
                        <div className="flex items-center gap-2">
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-100 text-xs font-bold text-blue-600">
                            {getInitials(
                              row.studentName ||
                                "?"
                            )}
                          </div>

                          <div>
                            <p className="font-medium text-slate-700">
                              {row.studentName ||
                                "Unknown Student"}
                            </p>

                            <p className="text-xs text-slate-400">
                              {row.studentCode ||
                                "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td>
                        {row.fee
                          .semesterId ? (                          <span className="badge badge-blue">
                            {getFeeSemesterLabel(
                              row.fee                            )}
                          </span>
                        ) : (
                          <span className="text-slate-400">
                            -
                          </span>
                        )}
                      </td>

                      <td>
                        <span className="badge badge-blue">
                          {getFeeTypeLabel(
                            row.fee
                              .feeType
                          )}
                        </span>
                      </td>

                      <td className="font-medium">
                        {formatCurrency(
                          row.fee
                            .amount
                        )}
                      </td>

                      <td className="text-slate-500">
                        {formatCurrency(
                          row.fee
                            .discount
                        )}
                      </td>

                      <td
                        className={`font-semibold ${
                          toNumber(
                            row.fee
                              .dueAmount
                          ) > 0
                            ? "text-red-600"
                            : "text-green-600"
                        }`}
                      >
                        {formatCurrency(
                          row.fee
                            .dueAmount
                        )}
                      </td>

                      <td className="text-slate-500">
                        {row.fee
                          .dueDate
                          ? formatDate(
                              row.fee
                                .dueDate
                            )
                          : "-"}
                      </td>

                      <td>
                        <span
                          className={`badge ${getStatusColor(
                            row.fee
                              .status
                          )}`}
                        >
                          {
                            row.fee
                              .status
                          }
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : activeTab ===
        "payments" ? (
        <div className="card p-0">
          <div className="table-wrapper">
            {payments.length ===
            0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="font-medium">
                  No payments yet
                </p>

                <p className="mt-1 text-sm">
                  Collected payments will
                  appear here.
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
                  {payments.map(
                    (row) => (
                      <tr
                        key={
                          row.payment
                            .id
                        }
                      >
                        <td>
                          <span className="badge badge-green font-mono">
                            {
                              row
                                .payment
                                .receiptNumber
                            }
                          </span>
                        </td>

                        <td>
                          <div>
                            <p className="font-medium text-slate-700">
                              {row.studentName ||
                                "Unknown Student"}
                            </p>

                            <p className="text-xs text-slate-400">
                              {row.studentCode ||
                                "-"}
                            </p>
                          </div>
                        </td>

                        <td className="font-bold text-green-600">
                          {formatCurrency(
                            row.payment
                              .amount
                          )}
                        </td>

                        <td>
                          <span className="badge badge-blue">
                            {getPaymentMethodLabel(
                              row
                                .payment
                                .method
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
                            row.payment
                              .paidAt
                          )}
                        </td>
                      </tr>
                    )
                  )}
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
              Select a student and allocate
              the payment to an outstanding
              fee.
            </p>

            <form
              onSubmit={
                handleCollect
              }
              className="space-y-4"
            >
              <div>
                <label className="form-label">
                  Select Student *
                </label>

                <select
                  className="form-select"
                  value={
                    payForm.studentId
                  }
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

                  {students.map(
                    (student) => (
                      <option
                        key={
                          student.id
                        }
                        value={
                          student.id
                        }
                      >
                        {student.name} (
                        {
                          student.studentId
                        }
                        )
                      </option>
                    )
                  )}
                </select>
              </div>

              {payForm.studentId && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                  {loadingStudentFees ? (
                    <p className="text-sm text-slate-500">
                      Loading fee records...
                    </p>
                  ) : studentFees.length ===
                    0 ? (
                    <p className="text-sm text-slate-500">
                      No fee records found
                      for this student. You
                      can still record a
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
                                (
                                  sum,
                                  row
                                ) =>
                                  sum +
                                  toNumber(
                                    row
                                      .fee
                                      .dueAmount
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
                                (
                                  row
                                ) =>
                                  (
                                    row
                                      .fee
                                      .status ===
                                      "DUE" ||
                                    row
                                      .fee
                                      .status ===
                                      "PARTIAL"
                                  ) &&
                                  toNumber(
                                    row
                                      .fee
                                      .dueAmount
                                  ) >
                                    0
                              ).length
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {studentFees.length >
                0 && (
                <div>
                  <label className="form-label">
                    Fee Record
                  </label>

                  <select
                    className="form-select"
                    value={
                      payForm.feeId
                    }
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
                          (
                            row.fee
                              .status ===
                              "DUE" ||
                            row.fee
                              .status ===
                              "PARTIAL"
                          ) &&
                          toNumber(
                            row.fee
                              .dueAmount
                          ) > 0
                      )
                      .map(
                        (row) => (
                          <option
                            key={
                              row.fee
                                .id
                            }
                            value={
                              row.fee
                                .id
                            }
                          >
                            {row.fee
                              .semesterId
                              ? getFeeSemesterLabel(
                                  row.fee
                                )
                              : "General Fee"}{" "}
                            -{" "}
                            {getFeeTypeLabel(
                              row.fee
                                .feeType
                            )}{" "}
                            - Due:{" "}
                            {formatCurrency(
                              row.fee
                                .dueAmount
                            )}{" "}
                            (
                            {
                              row.fee
                                .status
                            }
                            )
                          </option>
                        )
                      )}
                  </select>

                  {!payForm.feeId && (
                    <p className="mt-1 text-xs text-slate-400">
                      General payment will
                      be recorded but will
                      not reduce a specific
                      fee due.
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
                  value={
                    payForm.amount
                  }
                  onChange={(e) =>
                    setPayForm(
                      (prev) => ({
                        ...prev,
                        amount:
                          e.target
                            .value,
                      })
                    )
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
                  value={
                    payForm.method
                  }
                  onChange={(e) =>
                    setPayForm(
                      (prev) => ({
                        ...prev,
                        method:
                          e.target
                            .value,
                      })
                    )
                  }
                >
                  {PAYMENT_METHODS.map(
                    (method) => (
                      <option
                        key={
                          method.value
                        }
                        value={
                          method.value
                        }
                      >
                        {
                          method.label
                        }
                      </option>
                    )
                  )}
                </select>
              </div>

              {payForm.method !==
                "CASH" && (
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
                      setPayForm(
                        (prev) => ({
                          ...prev,
                          transactionReference:                            e
                              .target
                              .value,
                        })                      )
                    }
                  />
                </div>
              )}

              <button
                type="submit"
                disabled={
                  submitting
                }
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
              e.target ===
                e.currentTarget &&
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
                  Create a new student fee
                  and due amount.
                </p>
              </div>

              <button
                type="button"
                onClick={
                  closeFeeModal
                }
                disabled={
                  submitting
                }
                className="btn btn-ghost btn-sm"
              >
                X
              </button>
            </div>

            <form
              onSubmit={handleAddFee}
            >
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
                    value={
                      feeForm.studentId
                    }
                    onChange={(e) =>
                      handleFeeStudentChange(
                        e.target.value
                      )
                    }
                    required
                  >
                    <option value="">
                      Select student
                    </option>

                    {students.map(
                      (student) => (
                        <option
                          key={
                            student.id
                          }
                          value={
                            student.id
                          }
                        >
                          {student.name} (
                          {
                            student.studentId
                          }
                          )
                        </option>
                      )
                    )}
                  </select>
                </div>

                <div>
                  <label className="form-label">Academic Type *</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFeeForm((prev) => ({
                          ...prev,
                          academicType: "COURSE",
                          courseId: "",
                          programmeId: "",
                          semesterId: "",
                        }))
                      }
                      className={
                        feeForm.academicType === "COURSE"
                          ? "rounded-xl border-2 border-blue-600 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700"
                          : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
                      }
                    >
                      Course
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        setFeeForm((prev) => ({
                          ...prev,
                          academicType: "PROGRAMME",
                          courseId: "",
                          programmeId: "",
                          semesterId: "",
                        }))
                      }
                      className={
                        feeForm.academicType === "PROGRAMME"
                          ? "rounded-xl border-2 border-blue-600 bg-blue-50 px-4 py-3 text-sm font-bold text-blue-700"
                          : "rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-600"
                      }
                    >
                      Programme
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-slate-400">
                    Student select করলে শুধু তার enrolled Course বা Programme দেখাবে।
                  </p>
                </div>

                {feeForm.academicType === "COURSE" ? (
                  <div>
                    <label className="form-label">Course *</label>
                    <select
                      className="form-select"
                      value={feeForm.courseId}
                      onChange={(e) =>
                        setFeeForm((prev) => ({
                          ...prev,
                          courseId: e.target.value,
                        }))
                      }
                      disabled={
                        loadingStudentEnrollment ||
                        !feeForm.studentId
                      }
                      required
                    >
                      <option value="">
                        {loadingStudentEnrollment
                          ? "Loading student's courses..."
                          : !feeForm.studentId
                            ? "Select student first"
                            : availableFeeCourses.length === 0
                              ? "No enrolled courses"
                              : "Select course"}
                      </option>
                      {availableFeeCourses.map((course) => (
                        <option key={course.id} value={course.id}>
                          {course.name}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="form-label">Programme *</label>
                      <select
                        className="form-select"
                        value={feeForm.programmeId}
                        onChange={(e) =>
                          setFeeForm((prev) => ({
                            ...prev,
                            programmeId: e.target.value,
                            semesterId: "",
                          }))
                        }
                        disabled={
                          loadingStudentEnrollment ||
                          !feeForm.studentId
                        }
                        required
                      >
                        <option value="">
                          {loadingStudentEnrollment
                            ? "Loading student's programmes..."
                            : !feeForm.studentId
                              ? "Select student first"
                              : availableFeeProgrammes.length === 0
                                ? "No enrolled programmes"
                                : "Select programme"}
                        </option>
                        {availableFeeProgrammes.map((programme) => (
                          <option key={programme.id} value={programme.id}>
                            {programme.name}
                            {programme.code
                              ? " (" + programme.code + ")"
                              : ""}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="form-label">Semester *</label>
                      <select
                        className="form-select"
                        value={feeForm.semesterId}
                        onChange={(e) =>
                          setFeeForm((prev) => ({
                            ...prev,
                            semesterId: e.target.value,
                          }))
                        }
                        disabled={
                          loadingSemesters ||
                          loadingStudentEnrollment ||
                          !feeForm.programmeId
                        }
                        required
                      >
                        <option value="">
                          {loadingSemesters
                            ? "Loading semesters..."
                            : !feeForm.studentId
                              ? "Select student first"
                              : !feeForm.programmeId
                                ? "Select programme first"
                                : availableFeeSemesters.length === 0
                                  ? "No semesters for this programme"
                                  : "Select semester"}
                        </option>
                        {availableFeeSemesters.map((semester) => (
                          <option key={semester.id} value={semester.id}>
                            {getSemesterLabel(semester)}
                          </option>
                        ))}
                      </select>
                    </div>
                  </>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label className="form-label">
                      Fee Type *
                    </label>

                    <select
                      className="form-select"
                      value={
                        feeForm.feeType
                      }
                      onChange={(e) =>
                        setFeeForm(
                          (prev) => ({
                            ...prev,
                            feeType:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                    >
                      {FEE_TYPES.map(
                        (type) => (
                          <option
                            key={
                              type.value
                            }
                            value={
                              type.value
                            }
                          >
                            {
                              type.label
                            }
                          </option>
                        )
                      )}
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
                      value={
                        feeForm.amount
                      }
                      onChange={(e) =>
                        setFeeForm(
                          (prev) => ({
                            ...prev,
                            amount:
                              e
                                .target
                                .value,
                          })
                        )
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
                      value={
                        feeForm.discount
                      }
                      onChange={(e) =>
                        setFeeForm(
                          (prev) => ({
                            ...prev,
                            discount:
                              e
                                .target
                                .value,
                          })
                        )
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
                      value={
                        feeForm.dueDate
                      }
                      onChange={(e) =>
                        setFeeForm(
                          (prev) => ({
                            ...prev,
                            dueDate:
                              e
                                .target
                                .value,
                          })
                        )
                      }
                    />
                  </div>
                </div>

                {toNumber(
                  feeForm.amount
                ) > 0 && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-blue-500">
                      Fee Preview
                    </p>

                    <div className="space-y-1 text-sm">
                      {feeForm.academicType === "COURSE" ? (
                        <div className="flex justify-between">
                          <span className="text-slate-500">Course</span>
                          <span className="text-right font-semibold text-blue-700">
                            {selectedFeeCourse?.name || "-"}
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Programme</span>
                            <span className="text-right font-semibold text-blue-700">
                              {selectedFeeProgramme?.name || "-"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-500">Semester</span>
                            <span className="text-right font-semibold text-blue-700">
                              {selectedFeeSemester
                                ? getSemesterLabel(selectedFeeSemester)
                                : "-"}
                            </span>
                          </div>
                        </>
                      )}

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
                  onClick={
                    closeFeeModal
                  }
                  disabled={
                    submitting
                  }
                  className="btn btn-outline"                >
                  Cancel
                </button>

                <button                  type="submit"
                  disabled={
                    submitting ||
                    loadingStudentEnrollment ||
                    !feeForm.studentId ||
                    (feeForm.academicType === "COURSE"
                      ? !feeForm.courseId
                      : !feeForm.programmeId ||
                        !feeForm.semesterId ||
                        availableFeeSemesters.length === 0)
                  }
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

  const fee =
    studentFees.find(
      (row) =>
        row.fee.id === feeId
    );

  if (!fee) {
    return null;
  }

  return (
    <p className="mt-1 text-xs text-red-500">
      Maximum for this fee:{" "}
      {formatCurrency(
        fee.fee.dueAmount
      )}
    </p>
  );
}
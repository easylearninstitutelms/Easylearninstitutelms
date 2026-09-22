import { db } from "@/db";
import { fees, payments, students } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

type PaymentMethod =
  | "CASH"
  | "BKASH"
  | "NAGAD"
  | "ROCKET"
  | "BANK";

type FeeStatus =
  | "PAID"
  | "PARTIAL"
  | "DUE"
  | "WAIVED";

const PAYMENT_METHODS: readonly PaymentMethod[] = [
  "CASH",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "BANK",
];

function isPaymentMethod(
  value: string,
): value is PaymentMethod {
  return PAYMENT_METHODS.includes(
    value as PaymentMethod,
  );
}

function errorResponse(
  message: string,
  status = 400,
) {
  return Response.json(
    { error: message },
    { status },
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }

  if (
    typeof value === "string" &&
    value.trim() !== ""
  ) {
    return Number(value.trim());
  }

  return NaN;
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const instituteId = session.instituteId;

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  const conditions = [
    eq(payments.instituteId, instituteId),
  ];

  if (studentId) {
    conditions.push(
      eq(payments.studentId, studentId),
    );
  }

  const rows = await db
    .select({
      id: payments.id,
      instituteId: payments.instituteId,
      studentId: payments.studentId,
      feeId: payments.feeId,
      amount: payments.amount,
      method: payments.method,
      transactionReference:
        payments.transactionReference,
      receiptNumber: payments.receiptNumber,
      collectedBy: payments.collectedBy,
      paidAt: payments.paidAt,
      createdAt: payments.createdAt,
      studentName: students.name,
      studentCode: students.studentId,
    })
    .from(payments)
    .leftJoin(
      students,
      eq(payments.studentId, students.id),
    )
    .where(and(...conditions))
    .orderBy(desc(payments.paidAt));

  return Response.json({
    payments: rows,
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const instituteId = session.instituteId;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON request body",
    );
  }

  if (
    !body ||
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    return errorResponse("Invalid request body");
  }

  const data = body as Record<string, unknown>;

  const studentId = data.studentId;
  const feeId = data.feeId;
  const amount = data.amount;
  const method = data.method;
  const transactionReference =
    data.transactionReference ??
    data.reference;
  const receiptNumber = data.receiptNumber;

  // ─────────────────────────────────────────────
  // Student
  // ─────────────────────────────────────────────

  if (
    typeof studentId !== "string" ||
    studentId.trim() === ""
  ) {
    return errorResponse("Student is required");
  }

  const cleanStudentId = studentId.trim();

  // ─────────────────────────────────────────────
  // Amount
  // ─────────────────────────────────────────────

  const paymentAmount = toNumber(amount);

  if (
    !Number.isFinite(paymentAmount) ||
    paymentAmount <= 0
  ) {
    return errorResponse(
      "Payment amount must be greater than 0",
    );
  }

  // ─────────────────────────────────────────────
  // Method
  // ─────────────────────────────────────────────

  if (
    typeof method !== "string" ||
    method.trim() === ""
  ) {
    return errorResponse(
      "Payment method is required",
    );
  }

  const cleanMethod = method
    .trim()
    .toUpperCase();

  if (!isPaymentMethod(cleanMethod)) {
    return errorResponse(
      "Invalid payment method",
    );
  }

  // ─────────────────────────────────────────────
  // Receipt number
  // ─────────────────────────────────────────────

  let cleanReceiptNumber: string;

  if (
    typeof receiptNumber === "string" &&
    receiptNumber.trim() !== ""
  ) {
    cleanReceiptNumber =
      receiptNumber.trim();
  } else {
    cleanReceiptNumber = `RCP-${Date.now()}-${Math.floor(
      Math.random() * 10000,
    )
      .toString()
      .padStart(4, "0")}`;
  }

  if (cleanReceiptNumber.length > 100) {
    return errorResponse(
      "Receipt number is too long",
    );
  }

  // ─────────────────────────────────────────────
  // Transaction reference
  // ─────────────────────────────────────────────

  let cleanTransactionReference:
    | string
    | null = null;

  if (
    transactionReference !== undefined &&
    transactionReference !== null &&
    transactionReference !== ""
  ) {
    if (
      typeof transactionReference !==
      "string"
    ) {
      return errorResponse(
        "Invalid transaction reference",
      );
    }

    cleanTransactionReference =
      transactionReference.trim();

    if (
      cleanTransactionReference.length >
      255
    ) {
      return errorResponse(
        "Transaction reference is too long",
      );
    }
  }

  // ─────────────────────────────────────────────
  // Student must belong to institute
  // ─────────────────────────────────────────────

  const [student] = await db
    .select({
      id: students.id,
    })
    .from(students)
    .where(
      and(
        eq(students.id, cleanStudentId),
        eq(
          students.instituteId,
          instituteId,
        ),
      ),
    )
    .limit(1);

  if (!student) {
    return errorResponse(
      "Student not found",
      404,
    );
  }

  // ─────────────────────────────────────────────
  // Optional fee validation
  // ─────────────────────────────────────────────

  let cleanFeeId: string | null = null;

  if (
    feeId !== undefined &&
    feeId !== null &&
    feeId !== ""
  ) {
    if (
      typeof feeId !== "string" ||
      feeId.trim() === ""
    ) {
      return errorResponse(
        "Invalid fee",
      );
    }

    cleanFeeId = feeId.trim();

    const [fee] = await db
      .select({
        id: fees.id,
        studentId: fees.studentId,
        dueAmount: fees.dueAmount,
      })
      .from(fees)
      .where(
        and(
          eq(fees.id, cleanFeeId),
          eq(
            fees.instituteId,
            instituteId,
          ),
          eq(
            fees.studentId,
            student.id,
          ),
        ),
      )
      .limit(1);

    if (!fee) {
      return errorResponse(
        "Fee not found",
        404,
      );
    }

    const currentDue = Number(
      fee.dueAmount ?? "0",
    );

    if (
      Number.isFinite(currentDue) &&
      paymentAmount > currentDue
    ) {
      return errorResponse(
        "Payment cannot be greater than the due amount",
      );
    }
  }

  // ─────────────────────────────────────────────
  // Insert payment
  // ─────────────────────────────────────────────

  const [payment] = await db
    .insert(payments)
    .values({
      instituteId,
      studentId: student.id,
      feeId: cleanFeeId,
      amount: paymentAmount.toFixed(2),
      method:
        cleanMethod as PaymentMethod,
      transactionReference:
        cleanTransactionReference,
      receiptNumber:
        cleanReceiptNumber,
      collectedBy: null,
    })
    .returning({ id: payments.id, studentId: payments.studentId, feeId: payments.feeId, amount: payments.amount, method: payments.method, transactionReference: payments.transactionReference, receiptNumber: payments.receiptNumber, collectedBy: payments.collectedBy, paidAt: payments.paidAt, createdAt: payments.createdAt });

  // ─────────────────────────────────────────────
  // Update linked fee
  // ─────────────────────────────────────────────

  if (cleanFeeId) {
    const [fee] = await db
      .select({
        id: fees.id,
        amount: fees.amount,
        discount: fees.discount,
        dueAmount: fees.dueAmount,
      })
      .from(fees)
      .where(
        and(
          eq(fees.id, cleanFeeId),
          eq(
            fees.instituteId,
            instituteId,
          ),
          eq(
            fees.studentId,
            student.id,
          ),
        ),
      )
      .limit(1);

    if (fee) {
      const currentDue = Number(
        fee.dueAmount ?? "0",
      );

      const newDue =
        Math.max(
          0,
          Math.round(
            (currentDue - paymentAmount) *
              100,
          ) / 100,
        );

      let newStatus: FeeStatus;

      if (newDue <= 0) {
        newStatus = "PAID";
      } else {
        const originalAmount =
          Number(fee.amount ?? "0");

        const discountAmount =
          Number(fee.discount ?? "0");

        const netAmount =
          Math.max(
            0,
            originalAmount -
              discountAmount,
          );

        if (
          paymentAmount >= netAmount
        ) {
          newStatus = "PAID";
        } else {
          newStatus = "PARTIAL";
        }
      }

      await db
        .update(fees)
        .set({
          dueAmount: newDue.toFixed(2),
          status: newStatus,
          updatedAt: new Date(),
        })
        .where(
          and(
            eq(fees.id, cleanFeeId),
            eq(
              fees.instituteId,
              instituteId,
            ),
          ),
        );
    }
  }

  return Response.json(
    { payment },
    { status: 201 },
  );
}

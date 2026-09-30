import { db } from "@/db";
import {
  fees,
  payments,
  students,
} from "@/db/schema";
import { and, desc, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

type FeeType =
  | "OTHER"
  | "ADMISSION"
  | "COURSE"
  | "MONTHLY"
  | "EXAM";

type FeeStatus =
  | "PAID"
  | "PARTIAL"
  | "DUE"
  | "WAIVED";

const FEE_TYPES: readonly FeeType[] = [
  "OTHER",
  "ADMISSION",
  "COURSE",
  "MONTHLY",
  "EXAM",
];

function isFeeType(value: string): value is FeeType {
  return FEE_TYPES.includes(value as FeeType);
}

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value.trim());
  }
  return NaN;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const studentId = searchParams.get("studentId");
    const conditions = [eq(fees.instituteId, session.instituteId)];

    if (studentId) conditions.push(eq(fees.studentId, studentId));

    const rows = await db
      .select({
        id: fees.id,
        instituteId: fees.instituteId,
        studentId: fees.studentId,
        semesterId: fees.semesterId,
        feeType: fees.feeType,
        amount: fees.amount,
        discount: fees.discount,
        dueAmount: fees.dueAmount,
        dueDate: fees.dueDate,
        status: fees.status,
        createdAt: fees.createdAt,
        updatedAt: fees.updatedAt,
        studentName: students.name,
        studentCode: students.studentId,
      })
      .from(fees)
      .leftJoin(students, eq(fees.studentId, students.id))
      .where(and(...conditions))
      .orderBy(desc(fees.createdAt));

    return Response.json({ fees: rows });
  } catch (error) {
    console.error("GET /api/fees error:", error);
    return Response.json({ error: "Failed to load fees" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON request body");
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Invalid request body");
    }

    const data = body as Record<string, unknown>;
    const studentId = data.studentId;
    const semesterId = data.semesterId;
    const feeType = data.feeType;
    const amount = data.amount;
    const discount = data.discount;
    const dueDate = data.dueDate;

    if (typeof studentId !== "string" || studentId.trim() === "") {
      return errorResponse("Student is required");
    }

    const cleanStudentId = studentId.trim();
    let cleanSemesterId: string | null = null;

    if (typeof semesterId === "string" && semesterId.trim() !== "") {
      cleanSemesterId = semesterId.trim();
    }

    if (typeof feeType !== "string" || feeType.trim() === "") {
      return errorResponse("Fee type is required");
    }

    const cleanFeeType = feeType.trim().toUpperCase();
    if (!isFeeType(cleanFeeType)) {
      return errorResponse(
        "Invalid fee type. Allowed values: OTHER, ADMISSION, COURSE, MONTHLY, EXAM",
      );
    }

    const totalAmount = toNumber(amount);
    if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
      return errorResponse("Amount must be greater than 0");
    }

    let discountAmount = 0;
    if (discount !== undefined && discount !== null && discount !== "") {
      discountAmount = toNumber(discount);
      if (!Number.isFinite(discountAmount) || discountAmount < 0) {
        return errorResponse("Discount must be 0 or greater");
      }
    }

    if (discountAmount > totalAmount) {
      return errorResponse("Discount cannot be greater than the fee amount");
    }

    let cleanDueDate: string | null = null;
    if (dueDate !== undefined && dueDate !== null && dueDate !== "") {
      if (typeof dueDate !== "string" || !isValidDateOnly(dueDate)) {
        return errorResponse("Invalid due date");
      }
      cleanDueDate = dueDate;
    }

    const [student] = await db
      .select({ id: students.id })
      .from(students)
      .where(
        and(
          eq(students.id, cleanStudentId),
          eq(students.instituteId, session.instituteId),
        ),
      )
      .limit(1);

    if (!student) return errorResponse("Student not found", 404);

    if (cleanSemesterId) {
      const { programmeSemesters } = await import("@/db/schema");
      const [semester] = await db
        .select({ id: programmeSemesters.id })
        .from(programmeSemesters)
        .where(
          and(
            eq(programmeSemesters.id, cleanSemesterId),
            eq(programmeSemesters.instituteId, session.instituteId),
          ),
        )
        .limit(1);

      if (!semester) return errorResponse("Semester not found", 404);
    }

    const dueAmount = Math.round((totalAmount - discountAmount) * 100) / 100;
    const status: FeeStatus = dueAmount <= 0 ? "PAID" : "DUE";

    const [fee] = await db
      .insert(fees)
      .values({
        instituteId: session.instituteId,
        studentId: student.id,
        semesterId: cleanSemesterId,
        feeType: cleanFeeType as FeeType,
        amount: totalAmount.toFixed(2),
        discount: discountAmount.toFixed(2),
        dueAmount: dueAmount.toFixed(2),
        dueDate: cleanDueDate,
        status: status as FeeStatus,
      })
      .returning();

    return Response.json({ fee }, { status: 201 });
  } catch (error) {
    console.error("POST /api/fees error:", error);
    return Response.json({ error: "Failed to create fee" }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.instituteId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON request body");
    }

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return errorResponse("Invalid request body");
    }

    const data = body as Record<string, unknown>;
    const feeType = data.feeType;
    const amount = toNumber(data.amount);
    const discount = toNumber(data.discount);
    const dueDate = data.dueDate;

    if (typeof feeType !== "string" || !isFeeType(feeType.trim().toUpperCase())) {
      return errorResponse("Invalid fee type");
    }
    if (!Number.isFinite(amount) || amount <= 0) {
      return errorResponse("Amount must be greater than 0");
    }
    if (!Number.isFinite(discount) || discount < 0) {
      return errorResponse("Discount must be 0 or greater");
    }
    if (discount > amount) {
      return errorResponse("Discount cannot be greater than the fee amount");
    }

    let cleanDueDate: string | null = null;
    if (dueDate !== null && dueDate !== undefined && dueDate !== "") {
      if (typeof dueDate !== "string" || !isValidDateOnly(dueDate)) {
        return errorResponse("Invalid due date");
      }
      cleanDueDate = dueDate;
    }

    const [fee] = await db
      .select({
        id: fees.id,
        studentId: fees.studentId,
        amount: fees.amount,
        discount: fees.discount,
      })
      .from(fees)
      .where(
        and(
          eq(fees.id, id),
          eq(fees.instituteId, session.instituteId),
        ),
      )
      .limit(1);

    if (!fee) return errorResponse("Fee not found", 404);

    const paymentTotalResult = await db.execute(sql`
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM payments
      WHERE institute_id = ${session.instituteId}
        AND fee_id = ${id}
    `);
    const paymentTotal = Number(
      ((paymentTotalResult as { rows?: Array<{ total: string | number }> }).rows?.[0]?.total) ?? 0,
    );

    const netAmount = Math.max(0, amount - discount);
    const dueAmount = Math.max(0, Math.round((netAmount - paymentTotal) * 100) / 100);
    const status: FeeStatus =
      dueAmount <= 0 ? "PAID" : paymentTotal > 0 ? "PARTIAL" : "DUE";

    const [updated] = await db
      .update(fees)
      .set({
        feeType: feeType.trim().toUpperCase() as FeeType,
        amount: amount.toFixed(2),
        discount: discount.toFixed(2),
        dueAmount: dueAmount.toFixed(2),
        dueDate: cleanDueDate,
        status,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(fees.id, id),
          eq(fees.instituteId, session.instituteId),
        ),
      )
      .returning();

    return Response.json({ fee: updated });
  } catch (error) {
    console.error("PUT /api/fees/[id] error:", error);
    return Response.json({ error: "Failed to update fee" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await getSession();
    if (!session?.instituteId) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await db.transaction(async (tx) => {
      const [fee] = await tx
        .select({ id: fees.id })
        .from(fees)
        .where(
          and(
            eq(fees.id, id),
            eq(fees.instituteId, session.instituteId),
          ),
        )
        .limit(1);

      if (!fee) throw new Error("Fee not found");

      await tx
        .delete(payments)
        .where(
          and(
            eq(payments.feeId, id),
            eq(payments.instituteId, session.instituteId),
          ),
        );

      await tx
        .delete(fees)
        .where(
          and(
            eq(fees.id, id),
            eq(fees.instituteId, session.instituteId),
          ),
        );
    });

    return Response.json({ success: true, deletedFeeId: id });
  } catch (error) {
    console.error("DELETE /api/fees/[id] error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "Failed to delete fee" },
      { status: error instanceof Error && error.message === "Fee not found" ? 404 : 500 },
    );
  }
}

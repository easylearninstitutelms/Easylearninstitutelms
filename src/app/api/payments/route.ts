import { db } from "@/db";
import { payments, fees, students } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { generateReceiptNumber } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  const conditions = [eq(payments.instituteId, session.instituteId)];
  if (studentId) conditions.push(eq(payments.studentId, studentId));

  const rows = await db
    .select({
      payment: payments,
      studentName: students.name,
      studentCode: students.studentId,
    })
    .from(payments)
    .leftJoin(students, eq(payments.studentId, students.id))
    .where(and(...conditions))
    .orderBy(desc(payments.paidAt))
    .limit(50);

  return Response.json({ payments: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { studentId, feeId, amount, method, transactionReference } = body;

  if (!studentId || !amount || !method) {
    return Response.json({ error: "Student, amount, and method required" }, { status: 400 });
  }

  const receiptNumber = generateReceiptNumber();
  const paidAmount = parseFloat(amount);

  const [payment] = await db.insert(payments).values({
    instituteId: session.instituteId,
    studentId,
    feeId: feeId || null,
    amount: String(paidAmount),
    method,
    transactionReference: transactionReference || null,
    receiptNumber,
    collectedBy: session.userId,
    paidAt: new Date(),
  }).returning();

  // Update fee status if feeId provided
  if (feeId) {
    const [fee] = await db.select().from(fees).where(eq(fees.id, feeId)).limit(1);
    if (fee) {
      const remaining = parseFloat(String(fee.dueAmount)) - paidAmount;
      await db.update(fees).set({
        dueAmount: String(Math.max(0, remaining)),
        status: remaining <= 0 ? "PAID" : "PARTIAL",
        updatedAt: new Date(),
      }).where(eq(fees.id, feeId));
    }
  }

  return Response.json({ payment, receiptNumber });
}

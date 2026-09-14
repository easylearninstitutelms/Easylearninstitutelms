import { db } from "@/db";
import { fees, students } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const studentId = searchParams.get("studentId");

  const conditions = [eq(fees.instituteId, session.instituteId)];
  if (studentId) conditions.push(eq(fees.studentId, studentId));

  const rows = await db
    .select({
      fee: fees,
      studentName: students.name,
      studentCode: students.studentId,
    })
    .from(fees)
    .leftJoin(students, eq(fees.studentId, students.id))
    .where(and(...conditions))
    .orderBy(desc(fees.createdAt));

  return Response.json({ fees: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { studentId, feeType, amount, discount, dueDate } = body;

  if (!studentId || !feeType || !amount) {
    return Response.json({ error: "Student, fee type, and amount required" }, { status: 400 });
  }

  const discountAmt = parseFloat(discount || "0");
  const totalAmt = parseFloat(amount);
  const dueAmount = totalAmt - discountAmt;

  const [fee] = await db.insert(fees).values({
    instituteId: session.instituteId,
    studentId,
    feeType,
    amount: String(totalAmt),
    discount: String(discountAmt),
    dueAmount: String(dueAmount),
    dueDate: dueDate || null,
    status: "DUE",
  }).returning();

  return Response.json({ fee });
}

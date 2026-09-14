import { db } from "@/db";
import { students, enrollments, batches, courses, attendance, fees, payments } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  const [student] = await db
    .select()
    .from(students)
    .where(and(eq(students.id, id), eq(students.instituteId, session.instituteId)))
    .limit(1);

  if (!student) return Response.json({ error: "Not found" }, { status: 404 });

  // Enrollments with batch/course info
  const studentEnrollments = await db
    .select({
      enrollment: enrollments,
      batch: batches,
      course: courses,
    })
    .from(enrollments)
    .leftJoin(batches, eq(enrollments.batchId, batches.id))
    .leftJoin(courses, eq(batches.courseId, courses.id))
    .where(eq(enrollments.studentId, id));

  // Recent attendance
  const recentAttendance = await db
    .select()
    .from(attendance)
    .where(and(eq(attendance.studentId, id), eq(attendance.instituteId, session.instituteId)))
    .orderBy(desc(attendance.date))
    .limit(10);

  // Fees
  const studentFees = await db
    .select()
    .from(fees)
    .where(and(eq(fees.studentId, id), eq(fees.instituteId, session.instituteId)))
    .orderBy(desc(fees.createdAt));

  // Payments
  const studentPayments = await db
    .select()
    .from(payments)
    .where(and(eq(payments.studentId, id), eq(payments.instituteId, session.instituteId)))
    .orderBy(desc(payments.paidAt));

  return Response.json({
    student,
    enrollments: studentEnrollments,
    attendance: recentAttendance,
    fees: studentFees,
    payments: studentPayments,
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();

  const [updated] = await db
    .update(students)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(students.id, id), eq(students.instituteId, session.instituteId)))
    .returning();

  return Response.json({ student: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "INSTITUTE_ADMIN" && session.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { id } = await params;

  // Soft delete - archive
  const [updated] = await db
    .update(students)
    .set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(and(eq(students.id, id), eq(students.instituteId, session.instituteId)))
    .returning();

  return Response.json({ student: updated });
}

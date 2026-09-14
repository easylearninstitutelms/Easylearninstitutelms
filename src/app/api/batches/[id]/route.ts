import { db } from "@/db";
import { batches, enrollments, students, attendance, routines, courses, staff } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;

  const [batch] = await db.select({
    batch: batches,
    courseName: courses.name,
    teacherName: staff.name,
  })
    .from(batches)
    .leftJoin(courses, eq(batches.courseId, courses.id))
    .leftJoin(staff, eq(batches.teacherId, staff.id))
    .where(and(eq(batches.id, id), eq(batches.instituteId, session.instituteId))).limit(1);

  if (!batch) return Response.json({ error: "Not found" }, { status: 404 });

  const batchStudents = await db
    .select({ enrollment: enrollments, student: students })
    .from(enrollments)
    .leftJoin(students, eq(enrollments.studentId, students.id))
    .where(and(eq(enrollments.batchId, id), eq(enrollments.status, "ACTIVE")));

  const batchRoutines = await db.select().from(routines)
    .where(and(eq(routines.batchId, id), eq(routines.instituteId, session.instituteId)));

  return Response.json({ batch, students: batchStudents, routines: batchRoutines });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const [updated] = await db.update(batches).set({ ...body, updatedAt: new Date() })
    .where(and(eq(batches.id, id), eq(batches.instituteId, session.instituteId))).returning();
  return Response.json({ batch: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [updated] = await db.update(batches).set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(and(eq(batches.id, id), eq(batches.instituteId, session.instituteId))).returning();
  return Response.json({ batch: updated });
}

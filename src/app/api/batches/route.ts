import { db } from "@/db";
import { batches, courses, staff, enrollments } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session?.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  try {
    const rows = await db.select({
      batch: batches,
      courseName: courses.name,
      teacherName: staff.name,
      studentCount: sql<number>`(SELECT COUNT(*) FROM enrollments WHERE batch_id = ${batches.id} AND status = 'ACTIVE')`,
    }).from(batches)
      .leftJoin(courses, eq(batches.courseId, courses.id))
      .leftJoin(staff, eq(batches.teacherId, staff.id))
      .where(eq(batches.instituteId, session.instituteId))
      .orderBy(desc(batches.createdAt));
    return Response.json({ batches: rows });
  } catch (error) {
    console.error("Batches GET error:", error);
    return Response.json({ error: "Failed to load batches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "INSTITUTE_ADMIN" && session.role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    const body = await request.json();
    const { name, courseId, teacherId, room, startDate, endDate, fee } = body;
    if (!name || !String(name).trim()) return Response.json({ error: "Batch name is required" }, { status: 400 });
    if (courseId) {
      const [course] = await db.select({ id: courses.id }).from(courses).where(and(eq(courses.id, courseId), eq(courses.instituteId, session.instituteId))).limit(1);
      if (!course) return Response.json({ error: "Invalid course" }, { status: 400 });
    }
    if (teacherId) {
      const [teacher] = await db.select({ id: staff.id }).from(staff).where(and(eq(staff.id, teacherId), eq(staff.instituteId, session.instituteId))).limit(1);
      if (!teacher) return Response.json({ error: "Invalid teacher" }, { status: 400 });
    }
    const [batch] = await db.insert(batches).values({
      instituteId: session.instituteId,
      name: String(name).trim(),
      courseId: courseId || null,
      teacherId: teacherId || null,
      room: room || null,
      startDate: startDate || null,
      endDate: endDate || null,
      fee: fee || null,
      status: "ACTIVE",
    }).returning();
    return Response.json({ batch }, { status: 201 });
  } catch (error) {
    console.error("Batches POST error:", error);
    return Response.json({ error: "Failed to create batch" }, { status: 500 });
  }
}

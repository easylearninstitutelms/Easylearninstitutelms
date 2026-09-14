import { db } from "@/db";
import { batches, courses, staff, enrollments, students } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db
    .select({
      batch: batches,
      courseName: courses.name,
      teacherName: staff.name,
      studentCount: sql<number>`(SELECT COUNT(*) FROM enrollments WHERE batch_id = ${batches.id} AND status = 'ACTIVE')`,
    })
    .from(batches)
    .leftJoin(courses, eq(batches.courseId, courses.id))
    .leftJoin(staff, eq(batches.teacherId, staff.id))
    .where(eq(batches.instituteId, session.instituteId))
    .orderBy(desc(batches.createdAt));

  return Response.json({ batches: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "INSTITUTE_ADMIN" && session.role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { name, courseId, teacherId, room, startDate, endDate, fee } = body;

  if (!name) return Response.json({ error: "Batch name is required" }, { status: 400 });

  const [batch] = await db.insert(batches).values({
    instituteId: session.instituteId,
    name,
    courseId: courseId || null,
    teacherId: teacherId || null,
    room: room || null,
    startDate: startDate || null,
    endDate: endDate || null,
    fee: fee || null,
    status: "ACTIVE",
  }).returning();

  return Response.json({ batch });
}

import { db } from "@/db";
import { courses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

const COURSE_VIEW_ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER", "TEACHER"];
const COURSE_MANAGE_ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER", "TEACHER"];

export async function GET() {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissionError = requireRoles(session, COURSE_VIEW_ROLES);
  if (permissionError) return permissionError;

  try {
    await ensureAcademicSchema();

    const rows = await db
      .select()
      .from(courses)
      .where(eq(courses.instituteId, session.instituteId))
      .orderBy(desc(courses.createdAt));

    const counts = await db.execute(sql`
      SELECT course_id AS "courseId", COUNT(*)::int AS "classCount"
      FROM course_syllabus_classes
      WHERE institute_id = ${session.instituteId}
      GROUP BY course_id
    `);

    const countRows = Array.isArray(counts) ? counts as Record<string, unknown>[] :
      (counts && typeof counts === "object" && "rows" in counts && Array.isArray((counts as {rows?: unknown}).rows))
        ? (counts as {rows: Record<string, unknown>[]}).rows : [];

    const countMap = new Map(countRows.map(row => [String(row.courseId), Number(row.classCount || 0)]));

    return Response.json({
      courses: rows.map(course => ({
        ...course,
        classCount: countMap.get(course.id) || 0,
      })),
    });
  } catch (error) {
    console.error("Courses GET error:", error);
    return Response.json({ error: "Failed to load courses" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissionError = requireRoles(session, COURSE_MANAGE_ROLES);
  if (permissionError) return permissionError;

  try {
    await ensureAcademicSchema();
    const body = await request.json();
    const { name, description, duration, fee } = body;

    if (!name || !String(name).trim()) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }

    const rawClasses = Array.isArray(body.classes) ? body.classes : [];
    const classes = rawClasses
      .map((item: Record<string, unknown>, index: number) => ({
        classNo: Number(item.classNo) || index + 1,
        title: typeof item.title === "string" ? item.title.trim() : "",
        description: typeof item.description === "string" ? item.description.trim() : null,
        scheduledDate: typeof item.scheduledDate === "string" && item.scheduledDate ? item.scheduledDate : null,
        startTime: typeof item.startTime === "string" && item.startTime ? item.startTime : null,
        endTime: typeof item.endTime === "string" && item.endTime ? item.endTime : null,
      }))
      .filter(item => item.title);

    const result = await db.transaction(async tx => {
      const [course] = await tx.insert(courses).values({
        instituteId: session.instituteId!,
        name: String(name).trim(),
        description: description || null,
        duration: duration || null,
        fee: fee || null,
        status: "ACTIVE",
      }).returning();

      for (const item of classes) {
        await tx.execute(sql`
          INSERT INTO course_syllabus_classes
            (institute_id, course_id, class_no, title, description, scheduled_date, start_time, end_time, status)
          VALUES
            (${session.instituteId}, ${course.id}, ${item.classNo}, ${item.title}, ${item.description},
             ${item.scheduledDate}, ${item.startTime}, ${item.endTime}, 'UPCOMING')
        `);
      }

      return course;
    });

    return Response.json({ course: result, classCount: classes.length });
  } catch (error) {
    console.error("Courses POST error:", error);
    return Response.json({ error: "Failed to create course" }, { status: 500 });
  }
}
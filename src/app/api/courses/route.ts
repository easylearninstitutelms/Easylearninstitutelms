import { db } from "@/db";
import { courses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

const COURSE_VIEW_ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER", "TEACHER"];
const COURSE_MANAGE_ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER", "TEACHER", "DIGITAL_MARKETER"];

function rowsOf(result: unknown): Record<string, unknown>[] {
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as any).rows)) return (result as any).rows;
  return Array.isArray(result) ? result as Record<string, unknown>[] : [];
}

async function nextCourseNo(instituteId: string) {
  const result = await db.execute(sql`SELECT COALESCE(MAX(course_no), 210) + 1 AS next_no FROM courses WHERE institute_id = ${instituteId}`);
  return Number(rowsOf(result)[0]?.next_no || 211);
}

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

    const courseResults = await Promise.all(rows.map(async course => {
      const studentRows = rowsOf(await db.execute(sql`
        SELECT COUNT(DISTINCT e.student_id)::int AS count
        FROM enrollments e
        LEFT JOIN batches b ON b.id=e.batch_id
        WHERE e.institute_id=${session.instituteId}
          AND e.status='ACTIVE'
          AND (e.course_id=${course.id} OR b.course_id=${course.id})
      `));

      return {
        ...course,
        classCount: countMap.get(course.id) || 0,
        studentCount: Number(studentRows[0]?.count || 0),
      };
    }));

    return Response.json({ courses: courseResults });
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
    const requestedNo = Number(body.courseNo);
    const courseNo = Number.isInteger(requestedNo) && requestedNo >= 211 ? requestedNo : await nextCourseNo(session.instituteId);

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
      .filter((item: { title: string }) => item.title);

    const result = await db.transaction(async tx => {
      const inserted = rowsOf(await tx.execute(sql`
        INSERT INTO courses (institute_id, name, description, duration, fee, course_no, status)
        VALUES (${session.instituteId}, ${String(name).trim()}, ${description || null}, ${duration || null}, ${fee || null}, ${courseNo}, 'ACTIVE')
        RETURNING *
      `));
      const course = inserted[0] as any;
      if (!course) throw new Error("Course was not created");

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

    return Response.json({ course: result, courseNo, classCount: classes.length });
  } catch (error) {
    console.error("Courses POST error:", error);
    return Response.json({ error: "Failed to create course" }, { status: 500 });
  }
}
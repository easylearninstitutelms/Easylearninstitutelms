import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

const ROLES = ["SUPER_ADMIN","INSTITUTE_ADMIN","MANAGER","ADMIN","INSTITUTE","TEACHER"];
const rowsOf = (result: any): any[] => result?.rows || (Array.isArray(result) ? result : []);

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const roleError = requireRoles(session, ROLES);
    if (roleError) return roleError;

    await ensureAcademicSchema();

    const { searchParams } = new URL(request.url);
    const courseId = String(searchParams.get("courseId") || "").trim();
    const courseClassId = String(searchParams.get("courseClassId") || "").trim();

    if (!courseId) return NextResponse.json({ error: "courseId is required." }, { status: 400 });

    const course = await db.execute(sql`
      SELECT id FROM courses
      WHERE id = ${courseId} AND institute_id = ${session.instituteId}
      LIMIT 1
    `);
    if (!rowsOf(course)[0]) return NextResponse.json({ error: "Selected course was not found." }, { status: 404 });

    if (courseClassId) {
      const courseClass = await db.execute(sql`
        SELECT id FROM course_syllabus_classes
        WHERE id = ${courseClassId}
          AND course_id = ${courseId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `);
      if (!rowsOf(courseClass)[0]) return NextResponse.json({ error: "Selected course class was not found." }, { status: 404 });
    }

    const result = await db.execute(sql`
      SELECT DISTINCT
        s.id,
        s.student_id AS "studentId",
        s.name,
        s.photo_url AS "photoUrl"
      FROM students s
      INNER JOIN enrollments e
        ON e.student_id = s.id
       AND e.institute_id = s.institute_id
      WHERE s.institute_id = ${session.instituteId}
        AND e.course_id = ${courseId}
        AND e.status = 'ACTIVE'
      ORDER BY s.name
    `);

    return NextResponse.json({ students: rowsOf(result) });
  } catch (error) {
    console.error("GET /api/exams/course-students error:", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load course students." }, { status: 500 });
  }
}

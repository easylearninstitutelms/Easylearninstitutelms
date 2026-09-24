import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureAcademicCoreSchema, ensureCourseSchema } from "@/lib/academic";

type Row = Record<string, any>;
const rows = (r: any): Row[] => r?.rows || (Array.isArray(r) ? r : []);
const ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER", "TEACHER"];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const permissionError = requireRoles(session, ROLES);
  if (permissionError) return permissionError;

  try {
    await ensureAcademicCoreSchema();
    await ensureCourseSchema();

    const { searchParams } = new URL(request.url);
    const programmeId = searchParams.get("programmeId");
    const semesterId = searchParams.get("semesterId");
    const courseId = searchParams.get("courseId");
    const classId = searchParams.get("classId");
    const date = searchParams.get("date");

    if (!classId || !date) return NextResponse.json({ students: [] });

    if (programmeId && semesterId) {
      const result = await db.execute(sql`
        SELECT
          s.id AS "studentId",
          s.name,
          s.student_id AS "studentNo",
          a.status AS "attendanceStatus"
        FROM enrollments e
        INNER JOIN students s ON s.id = e.student_id
        LEFT JOIN attendance a
          ON a.student_id = s.id
         AND a.programme_id = e.programme_id
         AND a.semester_id = e.semester_id
         AND a.class_id = ${classId}
         AND a.date = ${date}
        WHERE e.institute_id = ${session.instituteId}
          AND e.status = 'ACTIVE'
          AND e.programme_id = ${programmeId}
          AND e.semester_id = ${semesterId}
        ORDER BY s.student_id
      `);
      return NextResponse.json({ students: rows(result) });
    }

    if (courseId) {
      const result = await db.execute(sql`
        SELECT
          s.id AS "studentId",
          s.name,
          s.student_id AS "studentNo",
          a.status AS "attendanceStatus"
        FROM enrollments e
        INNER JOIN students s ON s.id = e.student_id
        LEFT JOIN attendance a
          ON a.student_id = s.id
         AND a.course_id = e.course_id
         AND a.class_id = ${classId}
         AND a.date = ${date}
        WHERE e.institute_id = ${session.instituteId}
          AND e.status = 'ACTIVE'
          AND e.course_id = ${courseId}
        ORDER BY s.student_id
      `);
      return NextResponse.json({ students: rows(result) });
    }

    return NextResponse.json({ students: [] });
  } catch (error) {
    console.error("Attendance students GET error:", error);
    return NextResponse.json({ error: "Failed to load attendance students" }, { status: 500 });
  }
}

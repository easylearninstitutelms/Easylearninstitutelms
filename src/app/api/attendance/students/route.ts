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

    let result;
    if (programmeId) {
      result = await db.execute(sql`
        SELECT DISTINCT ON (s.id)
          s.id AS "studentId",
          s.name,
          s.student_id AS "studentNo",
          e.batch_id AS "batchId",
          b.name AS "batchName",
          a.status AS "attendanceStatus"
        FROM enrollments e
        INNER JOIN students s ON s.id = e.student_id
        INNER JOIN batches b ON b.id = e.batch_id
        LEFT JOIN attendance a
          ON a.student_id = s.id
         AND a.batch_id = e.batch_id
         AND a.class_id = ${classId}
         AND a.date = ${date}
        WHERE e.institute_id = ${session.instituteId}
          AND e.status = 'ACTIVE'
          AND b.institute_id = ${session.instituteId}
          AND b.programme_id = ${programmeId}
          ${semesterId ? sql`AND b.semester_id = ${semesterId}` : sql``}
        ORDER BY s.id, b.created_at DESC
      `);
    } else if (courseId) {
      result = await db.execute(sql`
        SELECT DISTINCT ON (s.id)
          s.id AS "studentId",
          s.name,
          s.student_id AS "studentNo",
          e.batch_id AS "batchId",
          b.name AS "batchName",
          a.status AS "attendanceStatus"
        FROM enrollments e
        INNER JOIN students s ON s.id = e.student_id
        INNER JOIN batches b ON b.id = e.batch_id
        LEFT JOIN attendance a
          ON a.student_id = s.id
         AND a.batch_id = e.batch_id
         AND a.class_id = ${classId}
         AND a.date = ${date}
        WHERE e.institute_id = ${session.instituteId}
          AND e.status = 'ACTIVE'
          AND b.institute_id = ${session.instituteId}
          AND b.course_id = ${courseId}
        ORDER BY s.id, b.created_at DESC
      `);
    } else {
      return NextResponse.json({ students: [] });
    }

    return NextResponse.json({ students: rows(result) });
  } catch (error) {
    console.error("Attendance students GET error:", error);
    return NextResponse.json({ error: "Failed to load attendance students" }, { status: 500 });
  }
}

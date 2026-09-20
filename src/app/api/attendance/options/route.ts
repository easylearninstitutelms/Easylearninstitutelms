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
    const courseId = searchParams.get("courseId");

    if (programmeId) {
      const semesters = rows(await db.execute(sql`
        SELECT id, semester_no AS "semesterNo", name
        FROM programme_semesters
        WHERE programme_id = ${programmeId}
          AND institute_id = ${session.instituteId}
        ORDER BY semester_no
      `));

      const classes = rows(await db.execute(sql`
        SELECT
          c.id,
          c.class_no AS "classNo",
          c.title,
          c.description,
          c.scheduled_date AS "scheduledDate",
          c.start_time AS "startTime",
          c.end_time AS "endTime",
          c.status,
          c.semester_id AS "semesterId",
          s.semester_no AS "semesterNo",
          s.name AS "semesterName"
        FROM programme_syllabus_classes c
        INNER JOIN programme_semesters s ON s.id = c.semester_id
        WHERE c.programme_id = ${programmeId}
          AND c.institute_id = ${session.instituteId}
        ORDER BY s.semester_no, c.class_no
      `));

      return NextResponse.json({ semesters, classes });
    }

    if (courseId) {
      const classes = rows(await db.execute(sql`
        SELECT
          id,
          class_no AS "classNo",
          title,
          description,
          scheduled_date AS "scheduledDate",
          start_time AS "startTime",
          end_time AS "endTime",
          status
        FROM course_syllabus_classes
        WHERE course_id = ${courseId}
          AND institute_id = ${session.instituteId}
        ORDER BY class_no
      `));

      return NextResponse.json({ classes });
    }

    return NextResponse.json({ semesters: [], classes: [] });
  } catch (error) {
    console.error("Attendance options GET error:", error);
    return NextResponse.json({ error: "Failed to load attendance options" }, { status: 500 });
  }
}

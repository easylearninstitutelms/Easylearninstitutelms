import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

export async function GET() {
  const session = await getSession();
  if (!session?.instituteId || session.role !== "STUDENT") return Response.json({ error: "Forbidden" }, { status: 403 });
  try {
    await ensureAcademicSchema();
    const rows = await db.execute(sql`
      SELECT e.id AS enrollment_id, b.id AS batch_id, b.name AS batch_name,
        b.programme_id, p.name AS programme_name, b.semester_id AS batch_semester_id,
        ps.semester_no, ps.name AS semester_name, sc.id AS class_id, sc.class_no,
        sc.title, sc.description, sc.scheduled_date, sc.start_time, sc.end_time,
        sc.status AS syllabus_status, COALESCE(ss.status, 'PENDING') AS session_status,
        ss.taken_at
      FROM enrollments e
      JOIN batches b ON b.id = e.batch_id
      LEFT JOIN programmes p ON p.id = b.programme_id
      LEFT JOIN programme_semesters ps ON ps.id = b.semester_id
      LEFT JOIN programme_syllabus_classes sc ON sc.programme_id = b.programme_id AND sc.semester_id = b.semester_id
      LEFT JOIN programme_syllabus_class_sessions ss ON ss.syllabus_class_id = sc.id AND ss.batch_id = b.id
      WHERE e.student_id = (SELECT id FROM students WHERE user_id = ${session.userId} AND institute_id = ${session.instituteId} LIMIT 1)
        AND e.institute_id = ${session.instituteId} AND e.status IN ('ACTIVE', 'INACTIVE') AND b.status = 'ACTIVE'
      ORDER BY b.id, ps.semester_no NULLS LAST, sc.class_no NULLS LAST
    `);
    return Response.json({ classes: rows.rows });
  } catch (error) {
    console.error("GET /api/student/classes error:", error);
    return Response.json({ error: "Failed to load student classes." }, { status: 500 });
  }
}

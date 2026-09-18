import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

type Row = Record<string, any>;
function rowsOf(result: unknown): Row[] {
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as { rows?: unknown }).rows)) return (result as { rows: Row[] }).rows;
  return Array.isArray(result) ? (result as Row[]) : [];
}
export async function GET() {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "STUDENT") return NextResponse.json({ error: "Student access only" }, { status: 403 });
    await ensureAcademicSchema();
    const result = await db.execute(sql\`
      SELECT r.id, r.batch_id AS "batchId", r.syllabus_class_id AS "classId", r.title AS "recordingTitle", r.video_url AS "videoUrl", r.duration, r.created_at AS "createdAt",
             b.name AS "batchName", p.name AS "programmeName", ps.semester_no AS "semesterNo", ps.name AS "semesterName", c.class_no AS "classNo", c.title AS "classTitle"
      FROM programme_class_recordings r
      INNER JOIN batches b ON b.id = r.batch_id
      INNER JOIN programmes p ON p.id = b.programme_id
      INNER JOIN programme_semesters ps ON ps.id = b.semester_id
      INNER JOIN programme_syllabus_classes c ON c.id = r.syllabus_class_id
      INNER JOIN enrollments e ON e.batch_id = b.id
      INNER JOIN students s ON s.id = e.student_id
      WHERE s.user_id = \${session.userId} AND s.institute_id = \${session.instituteId} AND e.institute_id = \${session.instituteId} AND e.status = 'ACTIVE' AND b.status = 'ACTIVE'
      ORDER BY b.batch_no, ps.semester_no, c.class_no
    \`);
    return NextResponse.json({ recordings: rowsOf(result) });
  } catch (error) {
    console.error("Student recordings GET error:", error);
    return NextResponse.json({ error: "Failed to load recorded classes" }, { status: 500 });
  }
}

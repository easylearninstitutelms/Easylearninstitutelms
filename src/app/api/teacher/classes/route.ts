import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

type Row = Record<string, any>;
function rowsOf(result: unknown): Row[] {
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as { rows?: unknown }).rows)) return (result as { rows: Row[] }).rows;
  return Array.isArray(result) ? result as Row[] : [];
}

async function getTeacherId(session: any) {
  if (session.role !== "TEACHER") return null;
  const rows = rowsOf(await db.execute(sql`
    SELECT id FROM staff
    WHERE user_id = ${session.userId} AND institute_id = ${session.instituteId}
    LIMIT 1
  `));
  return rows[0]?.id || null;
}

export async function GET() {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "TEACHER") return NextResponse.json({ error: "Teacher access only" }, { status: 403 });
    await ensureAcademicSchema();

    const teacherId = await getTeacherId(session);
    if (!teacherId) return NextResponse.json({ error: "Teacher profile is not linked to this account." }, { status: 403 });

    const result = await db.execute(sql`
      SELECT
        b.id AS "batchId",
        b.name AS "batchName",
        b.batch_no AS "batchNo",
        b.room,
        b.start_date AS "batchStartDate",
        b.end_date AS "batchEndDate",
        p.id AS "programmeId",
        p.name AS "programmeName",
        p.code AS "programmeCode",
        ps.id AS "semesterId",
        ps.semester_no AS "semesterNo",
        ps.name AS "semesterName",
        c.id AS "classId",
        c.class_no AS "classNo",
        c.title,
        c.description,
        c.scheduled_date AS "scheduledDate",
        c.start_time AS "startTime",
        c.end_time AS "endTime",
        c.status AS "syllabusStatus",
        COALESCE(sess.status, 'PENDING') AS "sessionStatus",
        sess.taken_at AS "takenAt",
        rec.id AS "recordingId",
        rec.title AS "recordingTitle",
        rec.video_url AS "recordingUrl",
        rec.duration AS "recordingDuration"
      FROM batches b
      INNER JOIN programmes p ON p.id = b.programme_id
      INNER JOIN programme_semesters ps ON ps.id = b.semester_id
      INNER JOIN programme_syllabus_classes c
        ON c.programme_id = b.programme_id
       AND c.semester_id = b.semester_id
      LEFT JOIN programme_syllabus_class_sessions sess
        ON sess.syllabus_class_id = c.id
       AND sess.batch_id = b.id
       AND sess.teacher_id = ${teacherId}
      LEFT JOIN programme_class_recordings rec
        ON rec.syllabus_class_id = c.id
       AND rec.batch_id = b.id
       AND rec.teacher_id = ${teacherId}
      WHERE b.institute_id = ${session.instituteId}
        AND b.teacher_id = ${teacherId}
        AND b.status = 'ACTIVE'
      ORDER BY b.batch_no, ps.semester_no, c.class_no
    `);

    return NextResponse.json({ classes: rowsOf(result) });
  } catch (error) {
    console.error("Teacher classes GET error:", error);
    return NextResponse.json({ error: "Failed to load teacher classes" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (session.role !== "TEACHER") return NextResponse.json({ error: "Teacher access only" }, { status: 403 });
    await ensureAcademicSchema();

    const teacherId = await getTeacherId(session);
    if (!teacherId) return NextResponse.json({ error: "Teacher profile is not linked to this account." }, { status: 403 });

    const body = await request.json();
    const classId = String(body.classId || "");
    const batchId = String(body.batchId || "");
    const status = body.status === "COMPLETED" ? "COMPLETED" : "PENDING";
    if (!classId || !batchId) return NextResponse.json({ error: "Class and batch are required." }, { status: 400 });

    const allowed = rowsOf(await db.execute(sql`
      SELECT c.id
      FROM programme_syllabus_classes c
      INNER JOIN batches b
        ON b.programme_id = c.programme_id
       AND b.semester_id = c.semester_id
      WHERE c.id = ${classId}
        AND b.id = ${batchId}
        AND b.teacher_id = ${teacherId}
        AND b.institute_id = ${session.instituteId}
        AND b.status = 'ACTIVE'
      LIMIT 1
    `));
    if (!allowed[0]) return NextResponse.json({ error: "This class is not assigned to you." }, { status: 403 });

    await db.execute(sql`
      INSERT INTO programme_syllabus_class_sessions
        (institute_id, syllabus_class_id, batch_id, teacher_id, status, taken_at)
      VALUES
        (${session.instituteId}, ${classId}, ${batchId}, ${teacherId}, ${status},
         CASE WHEN ${status} = 'COMPLETED' THEN now() ELSE NULL END)
      ON CONFLICT (syllabus_class_id, batch_id)
      DO UPDATE SET
        teacher_id = EXCLUDED.teacher_id,
        status = EXCLUDED.status,
        taken_at = EXCLUDED.taken_at,
        updated_at = now()
    `);

    return NextResponse.json({ success: true, status });
  } catch (error) {
    console.error("Teacher classes PATCH error:", error);
    return NextResponse.json({ error: "Failed to update class status" }, { status: 500 });
  }
}

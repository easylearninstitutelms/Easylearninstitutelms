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
async function teacherIdOf(session: any) {
  if (session.role !== "TEACHER") return null;
  const rows = rowsOf(await db.execute(sql`
    SELECT id FROM staff WHERE user_id = ${session.userId} AND institute_id = ${session.instituteId} LIMIT 1
  `));
  return rows[0]?.id || null;
}
const MANAGE = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER", "TEACHER"];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!MANAGE.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await ensureAcademicSchema();
    const teacherId = await teacherIdOf(session);
    if (session.role === "TEACHER" && !teacherId) return NextResponse.json({ error: "Teacher profile is not linked to this account." }, { status: 403 });
    const body = await request.json();
    const classId = String(body.classId || ""), batchId = String(body.batchId || ""), title = String(body.title || "").trim(), videoUrl = String(body.videoUrl || "").trim();
    const duration = String(body.duration || "").trim() || null;
    if (!classId || !batchId || !title || !videoUrl) return NextResponse.json({ error: "Class, batch, video title and video URL are required." }, { status: 400 });
    try { new URL(videoUrl); } catch { return NextResponse.json({ error: "Please enter a valid video URL." }, { status: 400 }); }

    const allowed = rowsOf(await db.execute(sql`
      SELECT b.teacher_id AS "teacherId", COALESCE(sess.status, 'PENDING') AS "sessionStatus"
      FROM programme_syllabus_classes c
      INNER JOIN batches b ON b.programme_id = c.programme_id AND b.semester_id = c.semester_id
      LEFT JOIN programme_syllabus_class_sessions sess ON sess.syllabus_class_id = c.id AND sess.batch_id = b.id AND sess.teacher_id = b.teacher_id
      WHERE c.id = ${classId} AND b.id = ${batchId} AND b.institute_id = ${session.instituteId} AND b.status = 'ACTIVE'
      LIMIT 1
    `));
    if (!allowed[0]) return NextResponse.json({ error: "This class or batch was not found." }, { status: 404 });
    if (session.role === "TEACHER" && allowed[0].teacherId !== teacherId) return NextResponse.json({ error: "This class is not assigned to you." }, { status: 403 });
    if (session.role === "TEACHER" && allowed[0].sessionStatus !== "COMPLETED") return NextResponse.json({ error: "Mark the class as taken before adding its recording." }, { status: 400 });
    const recordingTeacherId = allowed[0].teacherId || teacherId;
    if (!recordingTeacherId) return NextResponse.json({ error: "This batch has no assigned teacher." }, { status: 400 });

    const saved = rowsOf(await db.execute(sql`
      INSERT INTO programme_class_recordings (institute_id, syllabus_class_id, batch_id, teacher_id, title, video_url, duration)
      VALUES (${session.instituteId}, ${classId}, ${batchId}, ${recordingTeacherId}, ${title}, ${videoUrl}, ${duration})
      ON CONFLICT (syllabus_class_id, batch_id) DO UPDATE SET title = EXCLUDED.title, video_url = EXCLUDED.video_url, duration = EXCLUDED.duration, teacher_id = EXCLUDED.teacher_id, updated_at = now()
      RETURNING id, title, video_url AS "videoUrl", duration
    `));
    return NextResponse.json({ success: true, recording: saved[0] });
  } catch (error) {
    console.error("Teacher recording POST error:", error);
    return NextResponse.json({ error: "Failed to save class recording" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId || !MANAGE.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await ensureAcademicSchema();
    const teacherId = await teacherIdOf(session);
    const body = await request.json();
    const classId = String(body.classId || ""), batchId = String(body.batchId || "");
    if (!classId || !batchId) return NextResponse.json({ error: "Class and batch are required." }, { status: 400 });
    if (session.role === "TEACHER" && !teacherId) return NextResponse.json({ error: "Teacher profile is not linked to this account." }, { status: 403 });
    if (session.role === "TEACHER") {
      await db.execute(sql`DELETE FROM programme_class_recordings WHERE syllabus_class_id = ${classId} AND batch_id = ${batchId} AND teacher_id = ${teacherId} AND institute_id = ${session.instituteId}`);
    } else {
      await db.execute(sql`DELETE FROM programme_class_recordings WHERE syllabus_class_id = ${classId} AND batch_id = ${batchId} AND institute_id = ${session.instituteId}`);
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Teacher recording DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove recording" }, { status: 500 });
  }
}

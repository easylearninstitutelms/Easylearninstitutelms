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
const MANAGE = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER", "ADMIN", "INSTITUTE", "TEACHER"];

async function classFor(session:any, classId:string, programmeId?:string, semesterId?:string) {
  return rowsOf(await db.execute(sql`
    SELECT c.id, c.programme_id AS "programmeId", c.semester_id AS "semesterId"
    FROM programme_syllabus_classes c
    WHERE c.id = ${classId} AND c.institute_id = ${session.instituteId}
      ${programmeId ? sql`AND c.programme_id = ${programmeId}` : sql``}
      ${semesterId ? sql`AND c.semester_id = ${semesterId}` : sql``}
    LIMIT 1
  `))[0];
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId || !MANAGE.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await ensureAcademicSchema();
    const classId = String(new URL(request.url).searchParams.get("classId") || "");
    if (!classId) return NextResponse.json({ recording: null });
    const row = rowsOf(await db.execute(sql`
      SELECT id, title, video_url AS "videoUrl", duration
      FROM programme_syllabus_recordings
      WHERE syllabus_class_id = ${classId} AND institute_id = ${session.instituteId}
      LIMIT 1
    `))[0] || null;
    return NextResponse.json({ recording: row });
  } catch (error) {
    console.error("Programme syllabus recording GET error:", error);
    return NextResponse.json({ error: "Failed to load class recording." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!MANAGE.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await ensureAcademicSchema();
    const body = await request.json();
    const classId = String(body.classId || "");
    const programmeId = String(body.programmeId || "");
    const semesterId = String(body.semesterId || "");
    const title = String(body.title || "").trim();
    const videoUrl = String(body.videoUrl || "").trim();
    const duration = String(body.duration || "").trim() || null;
    if (!classId || !programmeId || !semesterId || !title || !videoUrl) return NextResponse.json({ error: "Class, programme, semester, video title and video URL are required." }, { status: 400 });
    try { new URL(videoUrl); } catch { return NextResponse.json({ error: "Please enter a valid video URL." }, { status: 400 }); }
    const classRow = await classFor(session, classId, programmeId, semesterId);
    if (!classRow) return NextResponse.json({ error: "This syllabus class was not found." }, { status: 404 });
    const saved = await db.execute(sql`
      INSERT INTO programme_syllabus_recordings (institute_id, syllabus_class_id, title, video_url, duration)
      VALUES (${session.instituteId}, ${classId}, ${title}, ${videoUrl}, ${duration})
      ON CONFLICT (syllabus_class_id) DO UPDATE SET
        title = EXCLUDED.title, video_url = EXCLUDED.video_url, duration = EXCLUDED.duration, updated_at = now()
      RETURNING id, title, video_url AS "videoUrl", duration
    `);
    return NextResponse.json({ success: true, recording: rowsOf(saved)[0] || { title, videoUrl, duration } });
  } catch (error) {
    console.error("Programme syllabus recording POST error:", error);
    return NextResponse.json({ error: "Failed to save class recording" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId || !MANAGE.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    await ensureAcademicSchema();
    const classId = String((await request.json()).classId || "");
    if (!classId) return NextResponse.json({ error: "Class is required." }, { status: 400 });
    if (!await classFor(session, classId)) return NextResponse.json({ error: "This syllabus class was not found." }, { status: 404 });
    await db.execute(sql`DELETE FROM programme_syllabus_recordings WHERE syllabus_class_id = ${classId} AND institute_id = ${session.instituteId}`);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Programme syllabus recording DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove recording" }, { status: 500 });
  }
}
import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

type Row = Record<string, any>;

function rowsOf(result: unknown): Row[] {
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: Row[] }).rows;
  }
  return Array.isArray(result) ? result as Row[] : [];
}

async function teacherIdOf(session: any) {
  if (session.role !== "TEACHER") return null;
  const rows = rowsOf(await db.execute(sql`
    SELECT id FROM staff
    WHERE user_id = ${session.userId}
      AND institute_id = ${session.instituteId}
    LIMIT 1
  `));
  return rows[0]?.id || null;
}

const MANAGE = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER", "ADMIN", "INSTITUTE", "TEACHER"];

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!MANAGE.includes(session.role)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    await ensureAcademicSchema();

    const teacherId = await teacherIdOf(session);
    if (session.role === "TEACHER" && !teacherId) {
      return NextResponse.json({ error: "Teacher profile is not linked to this account." }, { status: 403 });
    }

    const body = await request.json();
    const classId = String(body.classId || "");
    const programmeId = String(body.programmeId || "");
    const semesterId = String(body.semesterId || "");
    const requestedBatchId = String(body.batchId || "");
    const title = String(body.title || "").trim();
    const videoUrl = String(body.videoUrl || "").trim();
    const duration = String(body.duration || "").trim() || null;

    if (!classId || !programmeId || !semesterId || !title || !videoUrl) {
      return NextResponse.json(
        { error: "Class, programme, semester, video title and video URL are required." },
        { status: 400 }
      );
    }

    try {
      new URL(videoUrl);
    } catch {
      return NextResponse.json({ error: "Please enter a valid video URL." }, { status: 400 });
    }

    const classRow = rowsOf(await db.execute(sql`
      SELECT c.id, c.programme_id AS "programmeId", c.semester_id AS "semesterId"
      FROM programme_syllabus_classes c
      WHERE c.id = ${classId}
        AND c.programme_id = ${programmeId}
        AND c.semester_id = ${semesterId}
        AND c.institute_id = ${session.instituteId}
      LIMIT 1
    `))[0];

    if (!classRow) {
      return NextResponse.json({ error: "This syllabus class was not found." }, { status: 404 });
    }

    /*
     * Programme syllabus recordings are not selected batch-by-batch.
     * Save the same class recording against every active batch that
     * belongs to this Programme + Semester. Students in any active
     * batch can therefore access the programme class recording.
     *
     * A legacy batchId is still accepted for backwards compatibility.
     */
    const batches = rowsOf(await db.execute(sql`
      SELECT
        b.id,
        b.teacher_id AS "teacherId"
      FROM batches b
      WHERE b.institute_id = ${session.instituteId}
        AND b.programme_id = ${programmeId}
        AND b.semester_id = ${semesterId}
        AND b.status = 'ACTIVE'
        ${requestedBatchId ? sql`AND b.id = ${requestedBatchId}` : sql``}
        ${session.role === "TEACHER" ? sql`AND b.teacher_id = ${teacherId}` : sql``}
      ORDER BY b.batch_no
    `));

    if (!batches.length) {
      return NextResponse.json(
        { error: "No active batch was found for this Programme and Semester." },
        { status: 404 }
      );
    }

    if (session.role === "TEACHER") {
      const incomplete = batches.find(b => !b.teacherId);
      if (incomplete) {
        return NextResponse.json({ error: "This batch has no assigned teacher." }, { status: 400 });
      }
    }

    for (const batch of batches) {
      const recordingTeacherId = batch.teacherId || teacherId || null;

      /*
       * For institute/admin users, a batch may have no teacher assigned.
       * The recording belongs to the programme class, so a NULL teacher_id
       * is intentionally allowed here when the database column permits it.
       */
      await db.execute(sql`
        INSERT INTO programme_class_recordings
          (institute_id, syllabus_class_id, batch_id, teacher_id, title, video_url, duration)
        VALUES
          (${session.instituteId}, ${classId}, ${batch.id}, ${recordingTeacherId}, ${title}, ${videoUrl}, ${duration})
        ON CONFLICT (syllabus_class_id, batch_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          video_url = EXCLUDED.video_url,
          duration = EXCLUDED.duration,
          teacher_id = EXCLUDED.teacher_id,
          updated_at = now()
      `);
    }

    return NextResponse.json({
      success: true,
      savedForBatches: batches.length,
      recording: { title, videoUrl, duration }
    });
  } catch (error) {
    console.error("Programme class recording POST error:", error);
    return NextResponse.json({ error: "Failed to save class recording" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId || !MANAGE.includes(session.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await ensureAcademicSchema();

    const teacherId = await teacherIdOf(session);
    const body = await request.json();
    const classId = String(body.classId || "");
    const batchId = String(body.batchId || "");

    if (!classId) {
      return NextResponse.json({ error: "Class is required." }, { status: 400 });
    }

    if (session.role === "TEACHER" && !teacherId) {
      return NextResponse.json({ error: "Teacher profile is not linked to this account." }, { status: 403 });
    }

    if (batchId) {
      if (session.role === "TEACHER") {
        await db.execute(sql`
          DELETE FROM programme_class_recordings
          WHERE syllabus_class_id = ${classId}
            AND batch_id = ${batchId}
            AND teacher_id = ${teacherId}
            AND institute_id = ${session.instituteId}
        `);
      } else {
        await db.execute(sql`
          DELETE FROM programme_class_recordings
          WHERE syllabus_class_id = ${classId}
            AND batch_id = ${batchId}
            AND institute_id = ${session.instituteId}
        `);
      }
    } else if (session.role !== "TEACHER") {
      await db.execute(sql`
        DELETE FROM programme_class_recordings
        WHERE syllabus_class_id = ${classId}
          AND institute_id = ${session.instituteId}
      `);
    } else {
      return NextResponse.json({ error: "Batch is required for teacher recording removal." }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Programme class recording DELETE error:", error);
    return NextResponse.json({ error: "Failed to remove recording" }, { status: 500 });
  }
}

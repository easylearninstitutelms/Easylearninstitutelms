import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureCourseSchema } from "@/lib/academic";

const MANAGE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "ADMIN",
  "INSTITUTE",
  "TEACHER",
];

const rowsOf = (result: any): Record<string, any>[] => {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray(result.rows)
  ) {
    return result.rows;
  }

  return Array.isArray(result) ? result : [];
};

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const permissionError = requireRoles(
      session,
      MANAGE_ROLES
    );

    if (permissionError) {
      return permissionError;
    }

    await ensureCourseSchema();

    const { id } = await params;
    const body = await request.json();

    const classId = String(body.classId || "").trim();
    const title = String(body.title || "").trim();
    const videoUrl = String(body.videoUrl || "").trim();
    const duration =
      String(body.duration || "").trim() || null;

    if (!classId || !title || !videoUrl) {
      return NextResponse.json(
        {
          error:
            "Class, title and video URL are required.",
        },
        { status: 400 }
      );
    }

    try {
      new URL(videoUrl);
    } catch {
      return NextResponse.json(
        {
          error: "Please enter a valid video URL.",
        },
        { status: 400 }
      );
    }

    const savedRows = rowsOf(
      await db.execute(sql`
        INSERT INTO course_class_recordings (
          institute_id,
          course_class_id,
          title,
          video_url,
          duration
        )
        SELECT
          ${session.instituteId},
          id,
          ${title},
          ${videoUrl},
          ${duration}
        FROM course_syllabus_classes
        WHERE
          id = ${classId}
          AND course_id = ${id}
          AND institute_id = ${session.instituteId}

        ON CONFLICT (course_class_id)
        DO UPDATE SET
          title = EXCLUDED.title,
          video_url = EXCLUDED.video_url,
          duration = EXCLUDED.duration,
          updated_at = now()

        RETURNING
          id,
          title,
          video_url AS "videoUrl",
          duration
      `)
    );

    const saved = savedRows[0];

    if (!saved) {
      return NextResponse.json(
        {
          error: "Course class not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      recording: saved,
    });
  } catch (error) {
    console.error(
      "Course recording POST error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to save class recording.",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const permissionError = requireRoles(
      session,
      MANAGE_ROLES
    );

    if (permissionError) {
      return permissionError;
    }

    await ensureCourseSchema();

    const { id } = await params;
    const body = await request.json();

    const classId = String(body.classId || "").trim();

    if (!classId) {
      return NextResponse.json(
        {
          error: "Class is required.",
        },
        { status: 400 }
      );
    }

    await db.execute(sql`
      DELETE FROM course_class_recordings
      WHERE
        course_class_id = ${classId}
        AND institute_id = ${session.instituteId}
        AND course_class_id IN (
          SELECT id
          FROM course_syllabus_classes
          WHERE
            course_id = ${id}
            AND institute_id = ${session.instituteId}
        )
    `);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "Course recording DELETE error:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to remove recording.",
      },
      { status: 500 }
    );
  }
}
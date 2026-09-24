import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureHomeworkSchema } from "@/lib/academic";

function rowsOf(result: unknown): Record<string, any>[] {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: Record<string, any>[] }).rows;
  }

  return Array.isArray(result)
    ? (result as Record<string, any>[])
    : [];
}

function textValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

async function getStudent(
  session: { userId: string; instituteId: string }
) {
  const result = await db.execute(sql`
    SELECT id
    FROM students
    WHERE user_id = ${session.userId}
      AND institute_id = ${session.instituteId}
    LIMIT 1
  `);

  return rowsOf(result)[0] ?? null;
}

async function getHomeworkForStudent(
  homeworkId: string,
  studentId: string,
  instituteId: string
) {
  const result = await db.execute(sql`
    SELECT h.id, h.title, h.deadline
    FROM homework h
    WHERE h.id = ${homeworkId}
      AND h.institute_id = ${instituteId}
      AND EXISTS (
        SELECT 1
        FROM enrollments e
        WHERE e.student_id = ${studentId}
          AND e.status = 'ACTIVE'
          AND (
(
              h.course_id IS NOT NULL
              AND e.course_id = h.course_id
            )
            OR (
              h.programme_id IS NOT NULL
              AND e.programme_id = h.programme_id
            )
            AND h.semester_id = e.semester_id
          )
      )
    LIMIT 1
  `);

  return rowsOf(result)[0] ?? null;
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId || session.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await ensureHomeworkSchema();

    const homeworkId = textValue(
      new URL(request.url).searchParams.get("homeworkId")
    );

    if (!homeworkId) {
      return NextResponse.json(
        { error: "Homework ID is required." },
        { status: 400 }
      );
    }

    const student = await getStudent({
      userId: session.userId,
      instituteId: session.instituteId,
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 }
      );
    }

    const homework = await getHomeworkForStudent(
      homeworkId,
      student.id,
      session.instituteId
    );

    if (!homework) {
      return NextResponse.json(
        { error: "Homework not found." },
        { status: 404 }
      );
    }

    const result = await db.execute(sql`
      SELECT
        id,
        homework_id AS "homeworkId",
        answer,
        attachment_url AS "attachmentUrl",
        submitted_at AS "submittedAt",
        updated_at AS "updatedAt"
      FROM homework_submissions
      WHERE homework_id = ${homeworkId}
        AND student_id = ${student.id}
        AND institute_id = ${session.instituteId}
      LIMIT 1
    `);

    return NextResponse.json({
      submission: rowsOf(result)[0] ?? null,
    });
  } catch (error) {
    console.error(
      "GET /api/student/homework error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load homework submission." },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId || session.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await ensureHomeworkSchema();

    const body = await request.json();

    const homeworkId = textValue(body.homeworkId);
    const answer = textValue(body.answer);
    const attachmentUrl = textValue(body.attachmentUrl);

    if (!homeworkId) {
      return NextResponse.json(
        { error: "Homework ID is required." },
        { status: 400 }
      );
    }

    if (!answer && !attachmentUrl) {
      return NextResponse.json(
        {
          error:
            "Write an answer or provide a submission link.",
        },
        { status: 400 }
      );
    }

    const student = await getStudent({
      userId: session.userId,
      instituteId: session.instituteId,
    });

    if (!student) {
      return NextResponse.json(
        { error: "Student profile not found." },
        { status: 404 }
      );
    }

    const homework = await getHomeworkForStudent(
      homeworkId,
      student.id,
      session.instituteId
    );

    if (!homework) {
      return NextResponse.json(
        {
          error:
            "You are not enrolled in this homework target.",
        },
        { status: 403 }
      );
    }

    const existing = await db.execute(sql`
      SELECT id
      FROM homework_submissions
      WHERE homework_id = ${homeworkId}
        AND student_id = ${student.id}
        AND institute_id = ${session.instituteId}
      LIMIT 1
    `);

    const existingRow = rowsOf(existing)[0];

    let result;

    if (existingRow) {
      result = await db.execute(sql`
        UPDATE homework_submissions
        SET
          answer = ${answer || null},
          attachment_url = ${attachmentUrl || null},
          updated_at = now(),
          submitted_at = now()
        WHERE id = ${existingRow.id}
        RETURNING
          id,
          homework_id AS "homeworkId",
          answer,
          attachment_url AS "attachmentUrl",
          submitted_at AS "submittedAt",
          updated_at AS "updatedAt"
      `);
    } else {
      result = await db.execute(sql`
        INSERT INTO homework_submissions
          (
            institute_id,
            homework_id,
            student_id,
            answer,
            attachment_url
          )
        VALUES
          (
            ${session.instituteId},
            ${homeworkId},
            ${student.id},
            ${answer || null},
            ${attachmentUrl || null}
          )
        RETURNING
          id,
          homework_id AS "homeworkId",
          answer,
          attachment_url AS "attachmentUrl",
          submitted_at AS "submittedAt",
          updated_at AS "updatedAt"
      `);
    }

    return NextResponse.json({
      submission: rowsOf(result)[0],
    });
  } catch (error) {
    console.error(
      "POST /api/student/homework error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to submit homework." },
      { status: 500 }
    );
  }
}
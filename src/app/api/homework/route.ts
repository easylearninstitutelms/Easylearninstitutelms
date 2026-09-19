import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

type Row = Record<string, any>;

function rowsOf(result: unknown): Row[] {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: Row[] }).rows;
  }

  return Array.isArray(result) ? (result as Row[]) : [];
}

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

const MANAGE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "ADMIN",
  "INSTITUTE",
  "TEACHER",
];

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await ensureAcademicSchema();

    const { searchParams } = new URL(request.url);

    const courseId = cleanText(searchParams.get("courseId"));
    const programmeId = cleanText(searchParams.get("programmeId"));
    const semesterId = cleanText(searchParams.get("semesterId"));
    const batchId = cleanText(searchParams.get("batchId"));

    const result = await db.execute(sql`
      SELECT
        h.id,
        h.institute_id AS "instituteId",
        h.batch_id AS "batchId",
        h.course_id AS "courseId",
        h.programme_id AS "programmeId",
        h.semester_id AS "semesterId",
        h.teacher_id AS "teacherId",
        h.title,
        h.description,
        h.deadline,
        h.attachment_url AS "attachmentUrl",
        h.created_at AS "createdAt",

        COALESCE(b.name, '') AS "batchName",
        COALESCE(co.name, '') AS "courseName",
        COALESCE(p.name, '') AS "programmeName",
        COALESCE(ps.name, '') AS "semesterName",
        ps.semester_no AS "semesterNo",
        COALESCE(st.name, '') AS "teacherName",

        CASE
          WHEN h.course_id IS NOT NULL THEN 'COURSE'
          WHEN h.programme_id IS NOT NULL THEN 'PROGRAMME'
          WHEN h.batch_id IS NOT NULL THEN 'BATCH'
          ELSE 'UNKNOWN'
        END AS "targetType"

      FROM homework h

      LEFT JOIN batches b
        ON b.id = h.batch_id

      LEFT JOIN courses co
        ON co.id = h.course_id

      LEFT JOIN programmes p
        ON p.id = h.programme_id

      LEFT JOIN programme_semesters ps
        ON ps.id = h.semester_id

      LEFT JOIN staff st
        ON st.id = h.teacher_id

      WHERE h.institute_id = ${session.instituteId}

        ${courseId
          ? sql`AND h.course_id = ${courseId}`
          : sql``}

        ${programmeId
          ? sql`AND h.programme_id = ${programmeId}`
          : sql``}

        ${semesterId
          ? sql`AND h.semester_id = ${semesterId}`
          : sql``}

        ${batchId
          ? sql`AND h.batch_id = ${batchId}`
          : sql``}

      ORDER BY h.created_at DESC
    `);

    return NextResponse.json({
      homework: rowsOf(result),
    });
  } catch (error) {
    console.error("GET /api/homework error:", error);

    return NextResponse.json(
      {
        error: "Failed to load homework.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to create homework." },
        { status: 403 }
      );
    }

    await ensureAcademicSchema();

    const body = await request.json();

    const batchId = cleanText(body.batchId);
    const courseId = cleanText(body.courseId);
    const programmeId = cleanText(body.programmeId);
    const semesterId = cleanText(body.semesterId);
    const teacherId = cleanText(body.teacherId);

    const title = cleanText(body.title);
    const description = cleanText(body.description);
    const deadline = cleanText(body.deadline);
    const attachmentUrl = cleanText(body.attachmentUrl);

    if (!title) {
      return NextResponse.json(
        { error: "Homework title is required." },
        { status: 400 }
      );
    }

    /*
      Exactly one target is required:

      COURSE
      PROGRAMME
      BATCH (legacy)
    */

    const targetCount = [
      courseId,
      programmeId,
      batchId,
    ].filter(Boolean).length;

    if (targetCount !== 1) {
      return NextResponse.json(
        {
          error:
            "Please select exactly one target: Course, Programme, or Batch.",
        },
        { status: 400 }
      );
    }

    /*
      COURSE
    */

    if (courseId) {
      const courseResult = await db.execute(sql`
        SELECT
          id,
          name
        FROM courses
        WHERE id = ${courseId}
          AND institute_id = ${session.instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `);

      const course = rowsOf(courseResult)[0];

      if (!course) {
        return NextResponse.json(
          { error: "Selected course was not found or is inactive." },
          { status: 400 }
        );
      }
    }

    /*
      PROGRAMME
    */

    if (programmeId) {
      const programmeResult = await db.execute(sql`
        SELECT
          id,
          name
        FROM programmes
        WHERE id = ${programmeId}
          AND institute_id = ${session.instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `);

      const programme = rowsOf(programmeResult)[0];

      if (!programme) {
        return NextResponse.json(
          {
            error:
              "Selected programme was not found or is inactive.",
          },
          { status: 400 }
        );
      }

      /*
        Programme homework must specify a semester.
      */

      if (!semesterId) {
        return NextResponse.json(
          {
            error:
              "Please select a semester for programme homework.",
          },
          { status: 400 }
        );
      }

      const semesterResult = await db.execute(sql`
        SELECT
          id,
          programme_id AS "programmeId",
          semester_no AS "semesterNo",
          name
        FROM programme_semesters
        WHERE id = ${semesterId}
          AND programme_id = ${programmeId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `);

      const semester = rowsOf(semesterResult)[0];

      if (!semester) {
        return NextResponse.json(
          {
            error:
              "Selected semester does not belong to the selected programme.",
          },
          { status: 400 }
        );
      }
    }

    /*
      COURSE homework must NOT have a semester.
    */

    if (courseId && semesterId) {
      return NextResponse.json(
        {
          error:
            "Course homework does not use a programme semester.",
        },
        { status: 400 }
      );
    }

    /*
      BATCH is legacy.
    */

    if (batchId) {
      const batchResult = await db.execute(sql`
        SELECT
          id,
          name,
          course_id AS "courseId",
          programme_id AS "programmeId",
          semester_id AS "semesterId"
        FROM batches
        WHERE id = ${batchId}
          AND institute_id = ${session.instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `);

      const batch = rowsOf(batchResult)[0];

      if (!batch) {
        return NextResponse.json(
          {
            error:
              "Selected batch was not found or is inactive.",
          },
          { status: 400 }
        );
      }
    }

    /*
      Teacher validation.
      Teacher is optional.
    */

    let finalTeacherId: string | null = null;

    if (teacherId) {
      const teacherResult = await db.execute(sql`
        SELECT id
        FROM staff
        WHERE id = ${teacherId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `);

      const teacher = rowsOf(teacherResult)[0];

      if (!teacher) {
        return NextResponse.json(
          {
            error:
              "Selected teacher was not found in this institute.",
          },
          { status: 400 }
        );
      }

      finalTeacherId = teacherId;
    }

    /*
      Insert homework using raw SQL so the new nullable
      target fields work immediately without depending
      on the older Drizzle homework definition.
    */

    const insertResult = await db.execute(sql`
      INSERT INTO homework (
        institute_id,
        batch_id,
        course_id,
        programme_id,
        semester_id,
        teacher_id,
        title,
        description,
        deadline,
        attachment_url
      )
      VALUES (
        ${session.instituteId},
        ${batchId || null},
        ${courseId || null},
        ${programmeId || null},
        ${semesterId || null},
        ${finalTeacherId},
        ${title},
        ${description || null},
        ${deadline || null},
        ${attachmentUrl || null}
      )
      RETURNING
        id,
        institute_id AS "instituteId",
        batch_id AS "batchId",
        course_id AS "courseId",
        programme_id AS "programmeId",
        semester_id AS "semesterId",
        teacher_id AS "teacherId",
        title,
        description,
        deadline,
        attachment_url AS "attachmentUrl",
        created_at AS "createdAt"
    `);

    const homework = rowsOf(insertResult)[0];

    return NextResponse.json({
      homework,
    });
  } catch (error) {
    console.error("POST /api/homework error:", error);

    return NextResponse.json(
      {
        error: "Failed to create homework.",
      },
      {
        status: 500,
      }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission to delete homework." },
        { status: 403 }
      );
    }

    await ensureAcademicSchema();

    const { searchParams } = new URL(request.url);

    const id = cleanText(searchParams.get("id"));

    if (!id) {
      return NextResponse.json(
        { error: "Homework ID is required." },
        { status: 400 }
      );
    }

    const result = await db.execute(sql`
      DELETE FROM homework
      WHERE id = ${id}
        AND institute_id = ${session.instituteId}
      RETURNING id
    `);

    const deleted = rowsOf(result)[0];

    if (!deleted) {
      return NextResponse.json(
        { error: "Homework not found." },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: deleted.id,
    });
  } catch (error) {
    console.error("DELETE /api/homework error:", error);

    return NextResponse.json(
      {
        error: "Failed to delete homework.",
      },
      {
        status: 500,
      }
    );
  }
}
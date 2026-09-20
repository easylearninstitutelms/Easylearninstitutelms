import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureHomeworkSchema } from "@/lib/academic";

type Row = Record<string, any>;

type TargetType = "course" | "programme" | "batch";

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

function getTargetType(value: unknown): TargetType | "" {
  const type = cleanText(value).toLowerCase();

  if (
    type === "course" ||
    type === "programme" ||
    type === "batch"
  ) {
    return type;
  }

  return "";
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

    await ensureHomeworkSchema();

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
        h.course_class_id AS "courseClassId",
        h.programme_class_id AS "programmeClassId",
        h.teacher_id AS "teacherId",
        h.title,
        h.description,
        h.deadline,
        h.attachment_url AS "attachmentUrl",
        h.created_at AS "createdAt",

        COALESCE(b.name, '') AS "batchName",

        COALESCE(co.name, '') AS "courseName",

        COALESCE(cc.title, '') AS "courseClassTitle",
        cc.class_no AS "courseClassNo",

        COALESCE(p.name, '') AS "programmeName",

        COALESCE(ps.name, '') AS "semesterName",
        ps.semester_no AS "semesterNo",

        COALESCE(pc.title, '') AS "programmeClassTitle",
        pc.class_no AS "programmeClassNo",

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

      LEFT JOIN course_syllabus_classes cc
        ON cc.id = h.course_class_id

      LEFT JOIN programmes p
        ON p.id = h.programme_id

      LEFT JOIN programme_semesters ps
        ON ps.id = h.semester_id

      LEFT JOIN programme_syllabus_classes pc
        ON pc.id = h.programme_class_id

      LEFT JOIN staff st
        ON st.id = h.teacher_id

      WHERE h.institute_id = ${session.instituteId}

        ${
          courseId
            ? sql`AND h.course_id = ${courseId}`
            : sql``
        }

        ${
          programmeId
            ? sql`AND h.programme_id = ${programmeId}`
            : sql``
        }

        ${
          semesterId
            ? sql`AND h.semester_id = ${semesterId}`
            : sql``
        }

        ${
          batchId
            ? sql`AND h.batch_id = ${batchId}`
            : sql``
        }

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
        {
          error:
            "You do not have permission to create homework.",
        },
        { status: 403 }
      );
    }

    await ensureHomeworkSchema();

    const body = await request.json();

    const targetTypeFromBody = getTargetType(
      body.targetType
    );

    const targetType: TargetType | "" =
      targetTypeFromBody ||
      (cleanText(body.courseId)
        ? "course"
        : cleanText(body.programmeId)
        ? "programme"
        : cleanText(body.batchId)
        ? "batch"
        : "");

    const batchId = cleanText(body.batchId);
    const courseId = cleanText(body.courseId);
    const programmeId = cleanText(body.programmeId);
    const semesterId = cleanText(body.semesterId);
    const courseClassId = cleanText(
      body.courseClassId
    );
    const programmeClassId = cleanText(
      body.programmeClassId
    );
    const teacherId = cleanText(body.teacherId);

    const title = cleanText(body.title);
    const description = cleanText(body.description);
    const deadline = cleanText(body.deadline);
    const attachmentUrl = cleanText(body.attachmentUrl);

    if (!title) {
      return NextResponse.json(
        {
          error: "Homework title is required.",
        },
        { status: 400 }
      );
    }

    if (!targetType) {
      return NextResponse.json(
        {
          error: "Please select a homework target.",
        },
        { status: 400 }
      );
    }

    /*
     * =========================================================
     * COURSE + COURSE SYLLABUS CLASS
     * =========================================================
     */
    if (targetType === "course") {
      if (!courseId) {
        return NextResponse.json(
          {
            error: "Please select a course.",
          },
          { status: 400 }
        );
      }

      if (!courseClassId) {
        return NextResponse.json(
          {
            error: "Please select a course class.",
          },
          { status: 400 }
        );
      }

      if (
        programmeId ||
        semesterId ||
        programmeClassId ||
        batchId
      ) {
        return NextResponse.json(
          {
            error:
              "Course homework can only contain Course and Course Class.",
          },
          { status: 400 }
        );
      }

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
          {
            error:
              "Selected course was not found or is inactive.",
          },
          { status: 400 }
        );
      }

      const classResult = await db.execute(sql`
        SELECT
          id,
          course_id AS "courseId",
          class_no AS "classNo",
          title,
          status
        FROM course_syllabus_classes
        WHERE id = ${courseClassId}
          AND course_id = ${courseId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `);

      const courseClass =
        rowsOf(classResult)[0];

      if (!courseClass) {
        return NextResponse.json(
          {
            error:
              "Selected course class was not found.",
          },
          { status: 400 }
        );
      }

      if (
        courseClass.status === "CANCELLED"
      ) {
        return NextResponse.json(
          {
            error:
              "Selected course class is cancelled.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * =========================================================
     * PROGRAMME + SEMESTER + PROGRAMME SYLLABUS CLASS
     * =========================================================
     */
    if (targetType === "programme") {
      if (!programmeId) {
        return NextResponse.json(
          {
            error: "Please select a programme.",
          },
          { status: 400 }
        );
      }

      if (!semesterId) {
        return NextResponse.json(
          {
            error: "Please select a semester.",
          },
          { status: 400 }
        );
      }

      if (!programmeClassId) {
        return NextResponse.json(
          {
            error:
              "Please select a programme class.",
          },
          { status: 400 }
        );
      }

      if (
        courseId ||
        courseClassId ||
        batchId
      ) {
        return NextResponse.json(
          {
            error:
              "Programme homework can only contain Programme, Semester and Programme Class.",
          },
          { status: 400 }
        );
      }

      const programmeResult =
        await db.execute(sql`
          SELECT
            id,
            name
          FROM programmes
          WHERE id = ${programmeId}
            AND institute_id = ${session.instituteId}
            AND status = 'ACTIVE'
          LIMIT 1
        `);

      const programme =
        rowsOf(programmeResult)[0];

      if (!programme) {
        return NextResponse.json(
          {
            error:
              "Selected programme was not found or is inactive.",
          },
          { status: 400 }
        );
      }

      const semesterResult =
        await db.execute(sql`
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

      const semester =
        rowsOf(semesterResult)[0];

      if (!semester) {
        return NextResponse.json(
          {
            error:
              "Selected semester does not belong to the selected programme.",
          },
          { status: 400 }
        );
      }

      const classResult =
        await db.execute(sql`
          SELECT
            id,
            programme_id AS "programmeId",
            semester_id AS "semesterId",
            class_no AS "classNo",
            title,
            status
          FROM programme_syllabus_classes
          WHERE id = ${programmeClassId}
            AND programme_id = ${programmeId}
            AND semester_id = ${semesterId}
            AND institute_id = ${session.instituteId}
          LIMIT 1
        `);

      const programmeClass =
        rowsOf(classResult)[0];

      if (!programmeClass) {
        return NextResponse.json(
          {
            error:
              "Selected programme class was not found.",
          },
          { status: 400 }
        );
      }

      if (
        programmeClass.status ===
        "CANCELLED"
      ) {
        return NextResponse.json(
          {
            error:
              "Selected programme class is cancelled.",
          },
          { status: 400 }
        );
      }
    }

    /*
     * =========================================================
     * LEGACY BATCH HOMEWORK
     * =========================================================
     *
     * Existing batch functionality remains available.
     */
    if (targetType === "batch") {
      if (!batchId) {
        return NextResponse.json(
          {
            error: "Please select a batch.",
          },
          { status: 400 }
        );
      }

      if (
        courseId ||
        programmeId ||
        semesterId ||
        courseClassId ||
        programmeClassId
      ) {
        return NextResponse.json(
          {
            error:
              "Batch homework cannot contain course, programme, semester or syllabus class.",
          },
          { status: 400 }
        );
      }

      const batchResult = await db.execute(sql`
        SELECT
          id,
          name
        FROM batches
        WHERE id = ${batchId}
          AND institute_id = ${session.instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `);

      const batch =
        rowsOf(batchResult)[0];

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
     * =========================================================
     * TEACHER
     * =========================================================
     */
    let finalTeacherId: string | null = null;

    if (teacherId) {
      const teacherResult =
        await db.execute(sql`
          SELECT
            id
          FROM staff
          WHERE id = ${teacherId}
            AND institute_id = ${session.instituteId}
          LIMIT 1
        `);

      const teacher =
        rowsOf(teacherResult)[0];

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
     * =========================================================
     * INSERT
     * =========================================================
     */
    const insertResult =
      await db.execute(sql`
        INSERT INTO homework (
          institute_id,
          batch_id,
          course_id,
          programme_id,
          semester_id,
          course_class_id,
          programme_class_id,
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
          ${courseClassId || null},
          ${programmeClassId || null},
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
          course_class_id AS "courseClassId",
          programme_class_id AS "programmeClassId",
          teacher_id AS "teacherId",
          title,
          description,
          deadline,
          attachment_url AS "attachmentUrl",
          created_at AS "createdAt"
      `);

    const homework =
      rowsOf(insertResult)[0];

    return NextResponse.json({
      homework,
    });
  } catch (error) {
    console.error(
      "POST /api/homework error:",
      error
    );

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

export async function DELETE(
  request: Request
) {
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
        {
          error:
            "You do not have permission to delete homework.",
        },
        { status: 403 }
      );
    }

    await ensureHomeworkSchema();

    const { searchParams } =
      new URL(request.url);

    const id = cleanText(
      searchParams.get("id")
    );

    if (!id) {
      return NextResponse.json(
        {
          error: "Homework ID is required.",
        },
        { status: 400 }
      );
    }

    const result = await db.execute(sql`
      DELETE FROM homework
      WHERE id = ${id}
        AND institute_id = ${session.instituteId}
      RETURNING id
    `);

    const deleted =
      rowsOf(result)[0];

    if (!deleted) {
      return NextResponse.json(
        {
          error: "Homework not found.",
        },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      id: deleted.id,
    });
  } catch (error) {
    console.error(
      "DELETE /api/homework error:",
      error
    );

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
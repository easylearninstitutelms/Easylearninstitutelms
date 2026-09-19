import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

type Row = Record<string, any>;

const rowsOf = (r: unknown): Row[] =>
  r &&
  typeof r === "object" &&
  "rows" in r &&
  Array.isArray((r as any).rows)
    ? (r as any).rows
    : Array.isArray(r)
      ? (r as Row[])
      : [];

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    if (session.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Student access only" },
        { status: 403 }
      );
    }

    await ensureAcademicSchema();

    const result = await db.execute(sql`
      SELECT
        r.id,
        'PROGRAMME' AS "recordingType",
        e.batch_id AS "batchId",
        r.syllabus_class_id AS "classId",
        r.title AS "recordingTitle",
        r.video_url AS "videoUrl",
        r.duration,
        r.created_at AS "createdAt",
        COALESCE(
          b.name,
          'Direct Programme Enrollment'
        ) AS "batchName",
        p.name AS "programmeName",
        ps.semester_no AS "semesterNo",
        ps.name AS "semesterName",
        c.class_no AS "classNo",
        c.title AS "classTitle"
      FROM programme_syllabus_recordings r
      INNER JOIN programme_syllabus_classes c
        ON c.id = r.syllabus_class_id
      INNER JOIN programmes p
        ON p.id = c.programme_id
      INNER JOIN programme_semesters ps
        ON ps.id = c.semester_id
      INNER JOIN enrollments e
        ON e.student_id = (
          SELECT id
          FROM students
          WHERE user_id = ${session.userId}
            AND institute_id = ${session.instituteId}
          LIMIT 1
        )
      LEFT JOIN batches b
        ON b.id = e.batch_id
      WHERE r.institute_id = ${session.instituteId}
        AND e.institute_id = ${session.instituteId}
        AND e.status = 'ACTIVE'
        AND (
          e.programme_id = c.programme_id
          OR (
            b.status = 'ACTIVE'
            AND b.programme_id = c.programme_id
            AND b.semester_id = c.semester_id
          )
        )

      UNION ALL

      SELECT
        r.id,
        'COURSE' AS "recordingType",
        e.batch_id AS "batchId",
        c.id AS "classId",
        r.title AS "recordingTitle",
        r.video_url AS "videoUrl",
        r.duration,
        r.created_at AS "createdAt",
        COALESCE(
          b.name,
          'Direct Course Enrollment'
        ) AS "batchName",
        co.name AS "programmeName",
        NULL::int AS "semesterNo",
        'Course' AS "semesterName",
        c.class_no AS "classNo",
        c.title AS "classTitle"
      FROM course_class_recordings r
      INNER JOIN course_syllabus_classes c
        ON c.id = r.course_class_id
      INNER JOIN courses co
        ON co.id = c.course_id
      INNER JOIN enrollments e
        ON e.student_id = (
          SELECT id
          FROM students
          WHERE user_id = ${session.userId}
            AND institute_id = ${session.instituteId}
          LIMIT 1
        )
      LEFT JOIN batches b
        ON b.id = e.batch_id
        AND b.course_id = co.id
      WHERE r.institute_id = ${session.instituteId}
        AND e.institute_id = ${session.instituteId}
        AND e.status = 'ACTIVE'
        AND (
          e.course_id = co.id
          OR (
            b.status = 'ACTIVE'
            AND b.course_id = co.id
          )
        )

      ORDER BY "recordingType", "classNo"
    `);

    return NextResponse.json({
      recordings: rowsOf(result),
    });
  } catch (error) {
    console.error(
      "Student recordings GET error:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load recorded classes" },
      { status: 500 }
    );
  }
}
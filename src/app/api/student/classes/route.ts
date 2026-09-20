import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

type Row = Record<string, any>;

const rowsOf = (result: unknown): Row[] => {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as any).rows)
  ) {
    return (result as any).rows;
  }

  return Array.isArray(result) ? (result as Row[]) : [];
};

export async function GET() {
  const session = await getSession();

  if (!session?.instituteId || session.role !== "STUDENT") {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    await ensureAcademicSchema();

    const result = await db.execute(sql`
      /*
       * ============================================================
       * PROGRAMME DIRECT ENROLLMENT
       * ============================================================
       */

      SELECT
        e.id AS enrollment_id,
        e.batch_id AS batch_id,
        COALESCE(
          b.name,
          'Direct Programme Enrollment'
        ) AS batch_name,

        e.programme_id AS programme_id,
        p.name AS programme_name,

        ps.id AS batch_semester_id,
        ps.semester_no AS semester_no,
        ps.name AS semester_name,

        sc.id AS class_id,
        sc.class_no AS class_no,
        sc.title AS title,
        sc.description AS description,
        sc.scheduled_date AS scheduled_date,
        sc.start_time AS start_time,
        sc.end_time AS end_time,
        sc.status AS syllabus_status,

        'PENDING' AS session_status,
        NULL AS taken_at,

        rec.id AS recording_id,
        rec.title AS recording_title,
        rec.video_url AS recording_url,
        rec.duration AS recording_duration,

        'PROGRAMME' AS enrollment_type

      FROM enrollments e

      INNER JOIN programmes p
        ON p.id = e.programme_id
       AND p.institute_id = e.institute_id

      INNER JOIN programme_syllabus_classes sc
        ON sc.programme_id = p.id
       AND sc.institute_id = e.institute_id

      INNER JOIN programme_semesters ps
        ON ps.id = sc.semester_id
       AND ps.programme_id = p.id

      LEFT JOIN batches b
        ON b.id = e.batch_id
       AND b.institute_id = e.institute_id

      LEFT JOIN programme_syllabus_recordings rec
        ON rec.syllabus_class_id = sc.id
       AND rec.institute_id = e.institute_id

      WHERE e.student_id = (
        SELECT id
        FROM students
        WHERE user_id = ${session.userId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      )
        AND e.institute_id = ${session.instituteId}
        AND e.status = 'ACTIVE'
        AND e.programme_id IS NOT NULL


      UNION ALL


      /*
       * ============================================================
       * PROGRAMME BATCH / LEGACY ENROLLMENT
       * ============================================================
       */

      SELECT
        e.id AS enrollment_id,
        b.id AS batch_id,
        b.name AS batch_name,

        b.programme_id AS programme_id,
        p.name AS programme_name,

        b.semester_id AS batch_semester_id,
        ps.semester_no AS semester_no,
        ps.name AS semester_name,

        sc.id AS class_id,
        sc.class_no AS class_no,
        sc.title AS title,
        sc.description AS description,
        sc.scheduled_date AS scheduled_date,
        sc.start_time AS start_time,
        sc.end_time AS end_time,
        sc.status AS syllabus_status,

        COALESCE(
          ss.status,
          'PENDING'
        ) AS session_status,

        ss.taken_at AS taken_at,

        rec.id AS recording_id,
        rec.title AS recording_title,
        rec.video_url AS recording_url,
        rec.duration AS recording_duration,

        'PROGRAMME' AS enrollment_type

      FROM enrollments e

      INNER JOIN batches b
        ON b.id = e.batch_id
       AND b.institute_id = e.institute_id

      INNER JOIN programmes p
        ON p.id = b.programme_id
       AND p.institute_id = e.institute_id

      INNER JOIN programme_semesters ps
        ON ps.id = b.semester_id
       AND ps.programme_id = b.programme_id

      INNER JOIN programme_syllabus_classes sc
        ON sc.programme_id = b.programme_id
       AND sc.semester_id = b.semester_id
       AND sc.institute_id = e.institute_id

      LEFT JOIN programme_syllabus_class_sessions ss
        ON ss.syllabus_class_id = sc.id
       AND ss.batch_id = b.id

      LEFT JOIN programme_syllabus_recordings rec
        ON rec.syllabus_class_id = sc.id
       AND rec.institute_id = e.institute_id

      WHERE e.student_id = (
        SELECT id
        FROM students
        WHERE user_id = ${session.userId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      )
        AND e.institute_id = ${session.instituteId}
        AND e.status IN ('ACTIVE', 'INACTIVE')
        AND b.status = 'ACTIVE'
        AND b.programme_id IS NOT NULL


      UNION ALL


      /*
       * ============================================================
       * DIRECT COURSE ENROLLMENT
       * ============================================================
       */

      SELECT
        e.id AS enrollment_id,
        e.batch_id AS batch_id,

        COALESCE(
          b.name,
          'Direct Course Enrollment'
        ) AS batch_name,

        NULL AS programme_id,
        co.name AS programme_name,

        NULL AS batch_semester_id,
        NULL AS semester_no,
        'Course' AS semester_name,

        cc.id AS class_id,
        cc.class_no AS class_no,
        cc.title AS title,
        cc.description AS description,
        cc.scheduled_date AS scheduled_date,
        cc.start_time AS start_time,
        cc.end_time AS end_time,
        cc.status AS syllabus_status,

        'PENDING' AS session_status,
        NULL AS taken_at,

        rec.id AS recording_id,
        rec.title AS recording_title,
        rec.video_url AS recording_url,
        rec.duration AS recording_duration,

        'COURSE' AS enrollment_type

      FROM enrollments e

      INNER JOIN courses co
        ON co.id = e.course_id
       AND co.institute_id = e.institute_id

      INNER JOIN course_syllabus_classes cc
        ON cc.course_id = co.id
       AND cc.institute_id = e.institute_id

      LEFT JOIN batches b
        ON b.id = e.batch_id
       AND b.institute_id = e.institute_id

      LEFT JOIN course_class_recordings rec
        ON rec.course_class_id = cc.id
       AND rec.institute_id = e.institute_id

      WHERE e.student_id = (
        SELECT id
        FROM students
        WHERE user_id = ${session.userId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      )
        AND e.institute_id = ${session.instituteId}
        AND e.status = 'ACTIVE'
        AND e.course_id IS NOT NULL


      UNION ALL


      /*
       * ============================================================
       * COURSE BATCH / LEGACY ENROLLMENT
       * ============================================================
       */

      SELECT
        e.id AS enrollment_id,
        b.id AS batch_id,

        b.name AS batch_name,

        NULL AS programme_id,
        co.name AS programme_name,

        NULL AS batch_semester_id,
        NULL AS semester_no,
        'Course' AS semester_name,

        cc.id AS class_id,
        cc.class_no AS class_no,
        cc.title AS title,
        cc.description AS description,
        cc.scheduled_date AS scheduled_date,
        cc.start_time AS start_time,
        cc.end_time AS end_time,
        cc.status AS syllabus_status,

        'PENDING' AS session_status,
        NULL AS taken_at,

        rec.id AS recording_id,
        rec.title AS recording_title,
        rec.video_url AS recording_url,
        rec.duration AS recording_duration,

        'COURSE' AS enrollment_type

      FROM enrollments e

      INNER JOIN batches b
        ON b.id = e.batch_id
       AND b.institute_id = e.institute_id

      INNER JOIN courses co
        ON co.id = b.course_id
       AND co.institute_id = e.institute_id

      INNER JOIN course_syllabus_classes cc
        ON cc.course_id = co.id
       AND cc.institute_id = e.institute_id

      LEFT JOIN course_class_recordings rec
        ON rec.course_class_id = cc.id
       AND rec.institute_id = e.institute_id

      WHERE e.student_id = (
        SELECT id
        FROM students
        WHERE user_id = ${session.userId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      )
        AND e.institute_id = ${session.instituteId}
        AND e.status IN ('ACTIVE', 'INACTIVE')
        AND b.status = 'ACTIVE'
        AND b.course_id IS NOT NULL


      ORDER BY
        enrollment_type,
        batch_name,
        semester_no NULLS LAST,
        class_no
    `);

    return Response.json({
      classes: rowsOf(result),
    });
  } catch (error) {
    console.error(
      "GET /api/student/classes error:",
      error
    );

    return Response.json(
      {
        error: "Failed to load student classes.",
      },
      { status: 500 }
    );
  }
}
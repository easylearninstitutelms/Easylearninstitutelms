import { NextResponse } from "next/server";
import { db } from "@/db";
import {
  students,
  users,
  enrollments,
  batches,
  courses,
  attendance,
  exams,
  examSubjects,
  results,
  fees,
  payments,
} from "@/db/schema";
import {
  and,
  desc,
  eq,
  inArray,
  count,
  sql,
} from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureHomeworkSchema } from "@/lib/academic";

function rowsOf<T = Record<string, unknown>>(result: unknown): T[] {
  if (Array.isArray(result)) return result as T[];

  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: T[] }).rows;
  }

  return [];
}

async function getStudent(session: {
  userId: string;
  instituteId: string;
}) {
  const result = await db.execute(sql`
    SELECT id
    FROM students
    WHERE user_id = ${session.userId}
      AND institute_id = ${session.instituteId}
    LIMIT 1
  `);

  return rowsOf<{ id: string }>(result)[0] ?? null;
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.userId || !session?.instituteId) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (session.role !== "STUDENT") {
      return Response.json(
        { error: "Student access required" },
        { status: 403 },
      );
    }

    /*
     * Homework has its own isolated schema repair.
     * This prevents the whole academic migration from
     * breaking the student dashboard.
     */
    await ensureHomeworkSchema();

    const student = await getStudent({
      userId: session.userId,
      instituteId: session.instituteId,
    });

    if (!student) {
      return Response.json(
        { error: "Student profile not found" },
        { status: 404 },
      );
    }

    const studentId = student.id;

    /* ---------------------------------------------------------
       BASIC STUDENT INFORMATION
    --------------------------------------------------------- */

    const studentResult = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
        phone: students.phone,
        photoUrl: students.photoUrl,
        userId: students.userId,
      })
      .from(students)
      .where(
        and(
          eq(students.id, studentId),
          eq(students.instituteId, session.instituteId),
        ),
      )
      .limit(1);

    const studentData = studentResult[0] ?? null;

    /* ---------------------------------------------------------
       ENROLLMENTS
    --------------------------------------------------------- */

    /*
     * IMPORTANT:
     * enrollments does NOT use enrolled_at.
     * Use enrollment id for stable ordering.
     *
     * Course / Programme can come directly from enrollment,
     * or from the legacy batch relationship.
     */

    let enrollmentsData: unknown[] = [];

    try {
      const enrollmentRows = await db.execute(sql`
        SELECT
          e.id,
          e.student_id,
          e.batch_id,
          e.status,

          b.name AS batch_name,
          b.batch_no,

          COALESCE(e.course_id, b.course_id) AS course_id,
          COALESCE(e.programme_id, b.programme_id) AS programme_id,
          b.semester_id AS semester_id,

          c.name AS course_name,
          c.course_no,

          p.name AS programme_name,
          p.programme_no,

          ps.name AS semester_name,
          ps.semester_no

        FROM enrollments e

        LEFT JOIN batches b
          ON b.id = e.batch_id

        LEFT JOIN courses c
          ON c.id = COALESCE(e.course_id, b.course_id)

        LEFT JOIN programmes p
          ON p.id = COALESCE(e.programme_id, b.programme_id)

        LEFT JOIN programme_semesters ps
          ON ps.id = b.semester_id

        WHERE e.student_id = ${studentId}
          AND e.institute_id = ${session.instituteId}
          AND e.status = 'ACTIVE'

        ORDER BY e.id DESC
      `);

      enrollmentsData = rowsOf(enrollmentRows);
    } catch (error) {
      console.error("Student enrollment load error:", error);
      enrollmentsData = [];
    }

    /* ---------------------------------------------------------
       ATTENDANCE
    --------------------------------------------------------- */

    let attendanceData: unknown[] = [];

    try {
      const attendanceRows = await db.execute(sql`
        SELECT
          a.id,
          a.date,
          a.status,
          a.batch_id,
          a.class_id,
          a.class_type,
          b.name AS batch_name
        FROM attendance a
        LEFT JOIN batches b
          ON b.id = a.batch_id
        WHERE a.student_id = ${studentId}
          AND a.institute_id = ${session.instituteId}
        ORDER BY a.date DESC
        LIMIT 100
      `);

      attendanceData = rowsOf(attendanceRows);
    } catch {
      attendanceData = [];
    }

    /* ---------------------------------------------------------
       HOMEWORK

       IMPORTANT:
       Do NOT depend on e.course_id / e.programme_id.
       Old enrollment records may not contain those fields.

       Student -> Enrollment -> Batch -> Course/Programme
    --------------------------------------------------------- */

    let homeworkData: unknown[] = [];

    try {
      const homeworkRows = await db.execute(sql`
        SELECT
          h.id,
          h.title,
          h.description,
          h.deadline,
          h.attachment_url AS "attachmentUrl",
          h.created_at AS "createdAt",

          h.batch_id AS "batchId",
          h.course_id AS "courseId",
          h.programme_id AS "programmeId",
          h.semester_id AS "semesterId",
          h.course_class_id AS "courseClassId",
          h.programme_class_id AS "programmeClassId",

          c.name AS "courseName",
          p.name AS "programmeName",

          ps.name AS "semesterName",
          ps.semester_no AS "semesterNo",

          csc.class_no AS "courseClassNo",
          csc.title AS "courseClassTitle",

          psc.class_no AS "programmeClassNo",
          psc.title AS "programmeClassTitle",

          u.name AS "teacherName",

          hs.id AS "submissionId",
          hs.answer AS "submissionAnswer",
          hs.attachment_url AS "submissionAttachmentUrl",
          hs.submitted_at AS "submissionSubmittedAt"

        FROM homework h

        LEFT JOIN courses c
          ON c.id = h.course_id

        LEFT JOIN programmes p
          ON p.id = h.programme_id

        LEFT JOIN programme_semesters ps
          ON ps.id = h.semester_id

        LEFT JOIN course_syllabus_classes csc
          ON csc.id = h.course_class_id

        LEFT JOIN programme_syllabus_classes psc
          ON psc.id = h.programme_class_id

        LEFT JOIN users u
          ON u.id = h.teacher_id

        LEFT JOIN homework_submissions hs
          ON hs.homework_id = h.id
          AND hs.student_id = ${studentId}

        WHERE h.institute_id = ${session.instituteId}

          AND EXISTS (
            SELECT 1
            FROM enrollments e

            LEFT JOIN batches eb
              ON eb.id = e.batch_id

            WHERE e.student_id = ${studentId}
              AND e.institute_id = ${session.instituteId}
              AND e.status = 'ACTIVE'

              AND (
                /* Legacy batch homework */
                (
                  h.batch_id IS NOT NULL
                  AND e.batch_id = h.batch_id
                )

                /* Course homework */
                OR (
                  h.course_id IS NOT NULL
                  AND COALESCE(e.course_id, eb.course_id) = h.course_id
                )

                /* Programme homework */
                OR (
                  h.programme_id IS NOT NULL
                  AND COALESCE(e.programme_id, eb.programme_id) = h.programme_id
                )
              )

              /* Semester restriction for programme homework */
              AND (
                h.semester_id IS NULL
                OR eb.semester_id = h.semester_id
              )
          )

        ORDER BY h.created_at DESC
      `);

      homeworkData = rowsOf(homeworkRows).map((row: any) => ({
        id: row.id,
        title: row.title,
        description: row.description,
        deadline: row.deadline,
        attachmentUrl: row.attachmentUrl,
        createdAt: row.createdAt,

        batchId: row.batchId,
        courseId: row.courseId,
        programmeId: row.programmeId,
        semesterId: row.semesterId,
        courseClassId: row.courseClassId,
        programmeClassId: row.programmeClassId,

        courseName: row.courseName,
        programmeName: row.programmeName,

        semesterName: row.semesterName,
        semesterNo: row.semesterNo,

        courseClassNo: row.courseClassNo,
        courseClassTitle: row.courseClassTitle,

        programmeClassNo: row.programmeClassNo,
        programmeClassTitle: row.programmeClassTitle,

        teacherName: row.teacherName,

        submission: row.submissionId
          ? {
              id: row.submissionId,
              answer: row.submissionAnswer,
              attachmentUrl: row.submissionAttachmentUrl,
              submittedAt: row.submissionSubmittedAt,
            }
          : null,
      }));
    } catch (error) {
      console.error("Student homework load error:", error);

      /*
       * Do not crash the entire student dashboard.
       * If homework has an unexpected legacy DB problem,
       * return an empty homework list instead of HTTP 500.
       */
      homeworkData = [];
    }

    /* ---------------------------------------------------------
       EXAMS
    --------------------------------------------------------- */

    let examData: unknown[] = [];

    try {
      const examRows = await db.execute(sql`
        SELECT
          e.id,
          e.name,
          e.exam_date,
          e.batch_id,
          e.course_id,
          e.programme_id,
          e.semester_id,
          e.course_class_id,
          e.programme_class_id
        FROM exams e

        WHERE e.institute_id = ${session.instituteId}

          AND EXISTS (
            SELECT 1
            FROM enrollments en

            LEFT JOIN batches eb
              ON eb.id = en.batch_id

            WHERE en.student_id = ${studentId}
              AND en.institute_id = ${session.instituteId}
              AND en.status = 'ACTIVE'

              AND (
                (
                  e.batch_id IS NOT NULL
                  AND en.batch_id = e.batch_id
                )

                OR (
                  e.course_id IS NOT NULL
                  AND COALESCE(en.course_id, eb.course_id) = e.course_id
                )

                OR (
                  e.programme_id IS NOT NULL
                  AND COALESCE(en.programme_id, eb.programme_id) = e.programme_id

                  AND (
                    e.semester_id IS NULL
                    OR eb.semester_id = e.semester_id
                  )
                )
              )
          )

        ORDER BY e.exam_date DESC NULLS LAST, e.created_at DESC
      `);

      examData = rowsOf(examRows);
    } catch (error) {
      console.error("Student exam load error:", error);
      examData = [];
    }

    /* ---------------------------------------------------------
       FEES
    --------------------------------------------------------- */

    let feeData: unknown[] = [];

    try {
      const feeRows = await db.execute(sql`
        SELECT *
        FROM fees
        WHERE student_id = ${studentId}
          AND institute_id = ${session.instituteId}
        ORDER BY created_at DESC
      `);

      feeData = rowsOf(feeRows);
    } catch {
      feeData = [];
    }

    /* ---------------------------------------------------------
       PAYMENTS
    --------------------------------------------------------- */

    let paymentData: unknown[] = [];

    try {
      const paymentRows = await db.execute(sql`
        SELECT *
        FROM payments
        WHERE student_id = ${studentId}
          AND institute_id = ${session.instituteId}
        ORDER BY created_at DESC
      `);

      paymentData = rowsOf(paymentRows);
    } catch {
      paymentData = [];
    }

    /* ---------------------------------------------------------
       FINAL RESPONSE
    --------------------------------------------------------- */

    return Response.json({
      student: studentData,
      enrollments: enrollmentsData,
      attendance: attendanceData,
      homework: homeworkData,
      exams: examData,
      fees: feeData,
      payments: paymentData,
    });
  } catch (error) {
    console.error("GET /api/student/me error:", error);

    return NextResponse.json(
      {
        error: "Failed to load student dashboard",
        debug:
          error instanceof Error
            ? `${error.message}\nCAUSE: ${
                error.cause instanceof Error
                  ? error.cause.message
                  : String(error.cause ?? "")
              }`
            : String(error),
      },
      { status: 500 },
    );
  }
}
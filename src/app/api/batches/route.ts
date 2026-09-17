import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
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

const BATCH_VIEW_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
];

const BATCH_MANAGE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
];

async function nextBatchNo(instituteId: string) {
  const result = await db.execute(sql`
    SELECT COALESCE(MAX(batch_no), 210) + 1 AS next_no
    FROM batches
    WHERE institute_id = ${instituteId}
  `);
  const rows = rowsOf(result);
  return Number(rows[0]?.next_no || 211);
}

export async function GET() {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissionError = requireRoles(session, BATCH_VIEW_ROLES);
  if (permissionError) return permissionError;

  try {
    await ensureAcademicSchema();

    const teacherId =
      session.role === "TEACHER"
        ? rowsOf(await db.execute(sql`
            SELECT id
            FROM staff
            WHERE user_id = ${session.userId}
              AND institute_id = ${session.instituteId}
            LIMIT 1
          `))[0]?.id
        : null;

    if (session.role === "TEACHER" && !teacherId) {
      return Response.json(
        { error: "Teacher profile is not linked to this account." },
        { status: 403 },
      );
    }

    const result = await db.execute(sql`
      SELECT
        b.id,
        b.name,
        b.room,
        b.start_date AS "startDate",
        b.end_date AS "endDate",
        b.fee,
        b.status,
        b.batch_no AS "batchNo",
        b.programme_id AS "programmeId",
        b.semester_id AS "semesterId",
        c.name AS "courseName",
        s.name AS "teacherName",
        p.name AS "programmeName",
        p.code AS "programmeCode",
        p.programme_no AS "programmeNo",
        ps.name AS "semesterName",
        ps.semester_no AS "semesterNo",
        (
          SELECT COUNT(*)::int
          FROM enrollments e
          WHERE e.batch_id = b.id
            AND e.status = 'ACTIVE'
        ) AS "studentCount"
      FROM batches b
      LEFT JOIN courses c ON c.id = b.course_id
      LEFT JOIN staff s ON s.id = b.teacher_id
      LEFT JOIN programmes p ON p.id = b.programme_id
      LEFT JOIN programme_semesters ps ON ps.id = b.semester_id
      WHERE b.institute_id = ${session.instituteId}
        ${teacherId ? sql`AND b.teacher_id = ${teacherId}` : sql``}
      ORDER BY b.created_at DESC
    `);

    const batchRows = rowsOf(result);

    return Response.json({
      batches: batchRows.map((row) => ({
        ...row,
        batch: {
          id: row.id,
          name: row.name,
          room: row.room ?? null,
          startDate: row.startDate ?? null,
          endDate: row.endDate ?? null,
          fee: row.fee ?? null,
          status: row.status,
          batchNo: row.batchNo ?? null,
          programmeId: row.programmeId ?? null,
          programmeName: row.programmeName ?? null,
          programmeCode: row.programmeCode ?? null,
          programmeNo: row.programmeNo ?? null,
          semesterId: row.semesterId ?? null,
          semesterName: row.semesterName ?? null,
          semesterNo: row.semesterNo ?? null,
        },
      })),
      nextBatchNo: await nextBatchNo(session.instituteId),
    });
  } catch (error) {
    console.error("Batches GET error:", error);
    return Response.json({ error: "Failed to load batches" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissionError = requireRoles(session, BATCH_MANAGE_ROLES);
  if (permissionError) return permissionError;

  try {
    await ensureAcademicSchema();

    const body = await request.json();

    const name = String(body.name || "").trim();
    const courseId = body.courseId || null;
    const teacherId = body.teacherId || null;
    const programmeId = body.programmeId || null;
    const semesterId = body.semesterId || null;
    const room = String(body.room || "").trim() || null;
    const startDate = body.startDate || null;
    const endDate = body.endDate || null;
    const fee = body.fee === "" || body.fee == null ? null : String(body.fee);

    if (!name) {
      return Response.json({ error: "Batch name is required" }, { status: 400 });
    }

    if (!programmeId) {
      return Response.json(
        { error: "Programme is required for a new batch" },
        { status: 400 },
      );
    }

    const requestedNo = Number(body.batchNo);
    const batchNo = Number.isInteger(requestedNo)
      ? requestedNo
      : await nextBatchNo(session.instituteId);

    if (batchNo < 211) {
      return Response.json(
        { error: "Batch number must start from 211." },
        { status: 400 },
      );
    }

    const duplicateNo = rowsOf(await db.execute(sql`
      SELECT id
      FROM batches
      WHERE institute_id = ${session.instituteId}
        AND batch_no = ${batchNo}
      LIMIT 1
    `));

    if (duplicateNo.length > 0) {
      return Response.json(
        { error: `Batch number ${batchNo} is already in use.` },
        { status: 409 },
      );
    }

    const programme = rowsOf(await db.execute(sql`
      SELECT id, name, code, programme_no AS "programmeNo"
      FROM programmes
      WHERE id = ${programmeId}
        AND institute_id = ${session.instituteId}
      LIMIT 1
    `))[0];

    if (!programme) {
      return Response.json({ error: "Invalid programme" }, { status: 400 });
    }

    if (semesterId) {
      const semester = rowsOf(await db.execute(sql`
        SELECT id
        FROM programme_semesters
        WHERE id = ${semesterId}
          AND programme_id = ${programmeId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `))[0];

      if (!semester) {
        return Response.json({ error: "Invalid semester" }, { status: 400 });
      }
    }

    if (courseId) {
      const course = rowsOf(await db.execute(sql`
        SELECT id
        FROM courses
        WHERE id = ${courseId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `))[0];

      if (!course) {
        return Response.json({ error: "Invalid course" }, { status: 400 });
      }
    }

    if (teacherId) {
      const teacher = rowsOf(await db.execute(sql`
        SELECT id
        FROM staff
        WHERE id = ${teacherId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `))[0];

      if (!teacher) {
        return Response.json({ error: "Invalid teacher" }, { status: 400 });
      }
    }

    const created = rowsOf(await db.execute(sql`
      INSERT INTO batches (
        institute_id,
        name,
        course_id,
        teacher_id,
        programme_id,
        semester_id,
        batch_no,
        room,
        start_date,
        end_date,
        fee,
        status
      )
      VALUES (
        ${session.instituteId},
        ${name},
        ${courseId},
        ${teacherId},
        ${programmeId},
        ${semesterId},
        ${batchNo},
        ${room},
        ${startDate},
        ${endDate},
        ${fee},
        'ACTIVE'
      )
      RETURNING id, name, batch_no AS "batchNo", programme_id AS "programmeId", semester_id AS "semesterId"
    `))[0];

    return Response.json(
      {
        batch: created,
        programme,
        batchNo,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Batches POST error:", error);
    return Response.json({ error: "Failed to create batch" }, { status: 500 });
  }
}
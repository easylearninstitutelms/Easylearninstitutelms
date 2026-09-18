import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

type DbRow = Record<string, unknown>;

function rowsOf(result: unknown): DbRow[] {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: DbRow[] }).rows;
  }

  if (Array.isArray(result)) {
    return result as DbRow[];
  }

  return [];
}

function suggestProgrammeCode(name: string) {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const raw = words
    .map((word) => {
      const normalized = word.replace(/[^a-zA-Z0-9]/g, "");

      if (!normalized) return "";

      if (/^[A-Z0-9]{2,3}$/.test(normalized)) {
        return normalized.toUpperCase();
      }

      return normalized[0].toUpperCase();
    })
    .join("");

  const code = raw.replace(/[^A-Z0-9]/g, "").slice(0, 12);

  return code || "PRG";
}

async function nextProgrammeNo(instituteId: string) {
  const result = await db.execute(sql`
    SELECT COALESCE(MAX(programme_no), 210) + 1 AS next_no
    FROM programmes
    WHERE institute_id = ${instituteId}
  `);

  const rows = rowsOf(result);
  return Number(rows[0]?.next_no || 211);
}

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    await ensureAcademicSchema();

    const result = await db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.code,
        p.programme_no AS "programmeNo",
        p.description,
        p.duration,
        p.status,
        p.created_at,
        p.updated_at,
        (
          SELECT COUNT(DISTINCT e.student_id)::int
          FROM enrollments e
          INNER JOIN batches b
            ON b.id = e.batch_id
          WHERE e.institute_id = p.institute_id
            AND e.status = 'ACTIVE'
            AND b.programme_id = p.id
            AND b.institute_id = p.institute_id
        ) AS "studentCount",
        COALESCE(
          json_agg(
            json_build_object(
              'id', s.id,
              'semesterNo', s.semester_no,
              'name', s.name
            )
            ORDER BY s.semester_no
          ) FILTER (WHERE s.id IS NOT NULL),
          '[]'::json
        ) AS semesters
      FROM programmes p
      LEFT JOIN programme_semesters s
        ON s.programme_id = p.id
      WHERE p.institute_id = ${session.instituteId}
      GROUP BY p.id
      ORDER BY p.created_at DESC
    `);

    const nextNo = await nextProgrammeNo(session.instituteId);

    return NextResponse.json({
      programmes: rowsOf(result),
      nextProgrammeNo: nextNo,
    });
  } catch (error) {
    console.error("Programme GET error:", error);

    return NextResponse.json(
      { error: "Failed to load programmes" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      session.role !== "INSTITUTE_ADMIN" &&
      session.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          error: "You do not have permission to create programmes",
        },
        { status: 403 },
      );
    }

    await ensureAcademicSchema();

    const body = await req.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const suppliedCode =
      typeof body.code === "string"
        ? body.code.trim().toUpperCase()
        : "";

    const code =
      suppliedCode || suggestProgrammeCode(name);

    const description =
      typeof body.description === "string"
        ? body.description.trim()
        : null;

    const duration =
      typeof body.duration === "string"
        ? body.duration.trim()
        : null;

    const semesterCount = Number(body.semesterCount);

    if (!name) {
      return NextResponse.json(
        { error: "Programme name is required" },
        { status: 400 },
      );
    }

    if (
      !Number.isInteger(semesterCount) ||
      semesterCount < 4 ||
      semesterCount > 30
    ) {
      return NextResponse.json(
        {
          error: "Semester count must be between 4 and 30",
        },
        { status: 400 },
      );
    }

    const requestedNo = Number(body.programmeNo);
    const programmeNo = Number.isInteger(requestedNo)
      ? requestedNo
      : await nextProgrammeNo(session.instituteId);

    if (programmeNo < 211) {
      return NextResponse.json(
        { error: "Programme number must start from 211." },
        { status: 400 },
      );
    }

    const existingName = rowsOf(
      await db.execute(sql`
        SELECT id
        FROM programmes
        WHERE institute_id = ${session.instituteId}
          AND LOWER(name) = LOWER(${name})
        LIMIT 1
      `),
    );

    if (existingName.length > 0) {
      return NextResponse.json(
        { error: "This programme already exists" },
        { status: 409 },
      );
    }

    const existingNo = rowsOf(
      await db.execute(sql`
        SELECT id
        FROM programmes
        WHERE institute_id = ${session.instituteId}
          AND programme_no = ${programmeNo}
        LIMIT 1
      `),
    );

    if (existingNo.length > 0) {
      return NextResponse.json(
        { error: `Programme number ${programmeNo} is already in use.` },
        { status: 409 },
      );
    }

    const existingCode = rowsOf(
      await db.execute(sql`
        SELECT id
        FROM programmes
        WHERE institute_id = ${session.instituteId}
          AND UPPER(code) = UPPER(${code})
        LIMIT 1
      `),
    );

    if (existingCode.length > 0) {
      return NextResponse.json(
        { error: `Programme code ${code} is already in use.` },
        { status: 409 },
      );
    }

    const programmeResult = await db.execute(sql`
      INSERT INTO programmes (
        institute_id,
        name,
        code,
        programme_no,
        description,
        duration,
        status
      )
      VALUES (
        ${session.instituteId},
        ${name},
        ${code},
        ${programmeNo},
        ${description},
        ${duration},
        'ACTIVE'
      )
      RETURNING id
    `);

    const programmeRows = rowsOf(programmeResult);
    const programmeId = programmeRows[0]?.id;

    if (!programmeId) {
      throw new Error("Programme ID was not created");
    }

    for (let i = 1; i <= semesterCount; i += 1) {
      await db.execute(sql`
        INSERT INTO programme_semesters (
          institute_id,
          programme_id,
          semester_no,
          name
        )
        VALUES (
          ${session.instituteId},
          ${programmeId},
          ${i},
          ${`Semester ${i}`}
        )
      `);
    }

    return NextResponse.json(
      {
        success: true,
        programmeId,
        programmeNo,
        code,
        semesterCount,
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Programme POST error:", error);

    return NextResponse.json(
      { error: "Failed to create programme" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (
      session.role !== "INSTITUTE_ADMIN" &&
      session.role !== "SUPER_ADMIN"
    ) {
      return NextResponse.json(
        {
          error: "You do not have permission to delete programmes",
        },
        { status: 403 },
      );
    }

    await ensureAcademicSchema();

    const id = new URL(request.url).searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json(
        { error: "Programme ID is required" },
        { status: 400 },
      );
    }

    const programme = rowsOf(
      await db.execute(sql`
        SELECT id, name, programme_no AS "programmeNo"
        FROM programmes
        WHERE id = ${id}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `),
    )[0];

    if (!programme) {
      return NextResponse.json(
        { error: "Programme not found" },
        { status: 404 },
      );
    }

    const linkedBatches = rowsOf(
      await db.execute(sql`
        SELECT id
        FROM batches
        WHERE programme_id = ${id}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `),
    );

    if (linkedBatches.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this programme while batches are linked to it. Delete the linked batches first.",
        },
        { status: 409 },
      );
    }

    const linkedExams = rowsOf(
      await db.execute(sql`
        SELECT id
        FROM exams
        WHERE programme_id = ${id}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `),
    );

    if (linkedExams.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete this programme while exams are linked to it.",
        },
        { status: 409 },
      );
    }

    await db.transaction(async (tx) => {
      await tx.execute(sql`
        DELETE FROM programme_semesters
        WHERE programme_id = ${id}
          AND institute_id = ${session.instituteId}
      `);

      await tx.execute(sql`
        DELETE FROM programmes
        WHERE id = ${id}
          AND institute_id = ${session.instituteId}
      `);
    });

    return NextResponse.json({
      success: true,
      deletedProgrammeId: id,
      deletedProgrammeNo: programme.programmeNo ?? null,
    });
  } catch (error) {
    console.error("Programme DELETE error:", error);

    return NextResponse.json(
      { error: "Failed to delete programme" },
      { status: 500 },
    );
  }
}

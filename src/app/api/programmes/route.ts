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

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    await ensureAcademicSchema();

    const result = await db.execute(sql`
      SELECT
        p.id,
        p.name,
        p.code,
        p.description,
        p.duration,
        p.status,
        p.created_at,
        p.updated_at,
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

    return NextResponse.json(rowsOf(result));
  } catch (error) {
    console.error("Programme GET error:", error);

    return NextResponse.json(
      { error: "Failed to load programmes" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
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
        { status: 403 }
      );
    }

    await ensureAcademicSchema();

    const body = await req.json();

    const name =
      typeof body.name === "string"
        ? body.name.trim()
        : "";

    const code =
      typeof body.code === "string"
        ? body.code.trim()
        : null;

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
        {
          error: "Programme name is required",
        },
        { status: 400 }
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
        { status: 400 }
      );
    }

    const existingResult = await db.execute(sql`
      SELECT id
      FROM programmes
      WHERE institute_id = ${session.instituteId}
        AND LOWER(name) = LOWER(${name})
      LIMIT 1
    `);

    const existingRows = rowsOf(existingResult);

    if (existingRows.length > 0) {
      return NextResponse.json(
        {
          error: "This programme already exists",
        },
        { status: 409 }
      );
    }

    const programmeResult = await db.execute(sql`
      INSERT INTO programmes (
        institute_id,
        name,
        code,
        description,
        duration,
        status
      )
      VALUES (
        ${session.instituteId},
        ${name},
        ${code},
        ${description},
        ${duration},
        'ACTIVE'
      )
      RETURNING id
    `);

    const programmeRows = rowsOf(programmeResult);

    const programmeId = programmeRows[0]?.id;

    if (!programmeId) {
      throw new Error(
        "Programme ID was not created"
      );
    }

    for (let i = 1; i <= semesterCount; i++) {
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
        semesterCount,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Programme POST error:", error);

    return NextResponse.json(
      {
        error: "Failed to create programme",
      },
      { status: 500 }
    );
  }
}
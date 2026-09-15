import { db } from "@/db";
import {
  students,
  enrollments,
  batches,
} from "@/db/schema";
import {
  eq,
  and,
  like,
  or,
  desc,
  sql,
} from "drizzle-orm";
import { getSession } from "@/lib/session";
import { generateStudentId } from "@/lib/utils";

const MAX_PHOTO_CHARS = 5_000_000;

function cleanText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function cleanPhotoUrl(value: unknown) {
  const valueText = cleanText(value);

  if (!valueText) return null;

  if (valueText.length > MAX_PHOTO_CHARS) {
    return null;
  }

  if (!valueText.startsWith("data:image/")) {
    return null;
  }

  return valueText;
}

function validGender(value: unknown) {
  if (
    value === "MALE" ||
    value === "FEMALE" ||
    value === "OTHER"
  ) {
    return value;
  }

  return null;
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { searchParams } =
    new URL(request.url);

  const search =
    searchParams.get("search") || "";

  const status =
    searchParams.get("status") || "";

  const page = Math.max(
    1,
    Number.parseInt(
      searchParams.get("page") || "1",
      10
    ) || 1
  );

  const limit = Math.min(
    100,
    Math.max(
      1,
      Number.parseInt(
        searchParams.get("limit") || "20",
        10
      ) || 20
    )
  );

  const offset = (page - 1) * limit;

  const conditions = [
    eq(
      students.instituteId,
      session.instituteId
    ),
  ];

  if (status && status !== "ALL") {
    conditions.push(
      eq(
        students.status,
        status as
          | "ACTIVE"
          | "INACTIVE"
          | "ARCHIVED"
      )
    );
  }

  if (search.trim()) {
    const q = `%${search.trim()}%`;

    conditions.push(
      or(
        like(students.name, q),
        like(students.studentId, q),
        like(students.phone, q)
      )!
    );
  }

  const [{ total }] = await db
    .select({
      total: sql<number>`count(*)::int`,
    })
    .from(students)
    .where(and(...conditions));

  const rows = await db
    .select()
    .from(students)
    .where(and(...conditions))
    .orderBy(desc(students.createdAt))
    .limit(limit)
    .offset(offset);

  return Response.json({
    students: rows,
    total,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (
    session.role !== "INSTITUTE_ADMIN" &&
    session.role !== "SUPER_ADMIN"
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const name = cleanText(body.name);
    const phone = cleanText(body.phone);
    const guardianName =
      cleanText(body.guardianName);
    const guardianPhone =
      cleanText(body.guardianPhone);
    const address = cleanText(body.address);
    const dob = cleanText(body.dob);
    const admissionDate =
      cleanText(body.admissionDate);
    const batchId = cleanText(body.batchId);

    const gender = validGender(body.gender);

    const photoUrl = cleanPhotoUrl(
      body.photoUrl
    );

    if (!name || !admissionDate) {
      return Response.json(
        {
          error:
            "Name and admission date required",
        },
        { status: 400 }
      );
    }

    if (body.photoUrl && !photoUrl) {
      return Response.json(
        {
          error:
            "Invalid student photo. Please choose a JPG, PNG, or WEBP image up to 2 MB.",
        },
        { status: 400 }
      );
    }

    if (batchId) {
      const [batch] = await db
        .select({
          id: batches.id,
        })
        .from(batches)
        .where(
          and(
            eq(batches.id, batchId),
            eq(
              batches.instituteId,
              session.instituteId
            )
          )
        )
        .limit(1);

      if (!batch) {
        return Response.json(
          { error: "Invalid batch" },
          { status: 400 }
        );
      }
    }

    const studentId =
      generateStudentId();

    const [student] = await db
      .insert(students)
      .values({
        instituteId:
          session.instituteId,

        studentId,

        name,

        phone: phone || null,

        guardianName:
          guardianName || null,

        guardianPhone:
          guardianPhone || null,

        address: address || null,

        dob: dob || null,

        gender,

        admissionDate,

        status: "ACTIVE",

        photoUrl,
      })
      .returning();

    if (batchId) {
      await db
        .insert(enrollments)
        .values({
          instituteId:
            session.instituteId,

          studentId: student.id,

          batchId,

          enrollmentDate:
            admissionDate,

          status: "ACTIVE",
        });
    }

    return Response.json({
      student,
    });
  } catch (error) {
    console.error(
      "POST /api/students error:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to add student",
      },
      { status: 500 }
    );
  }
}
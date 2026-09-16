import { db } from "@/db";
import {
  students,
  enrollments,
  batches,
  staff,
} from "@/db/schema";
import {
  eq,
  and,
  like,
  or,
  desc,
  sql,
} from "drizzle-orm";
import {
  getSession,
  requireRoles,
} from "@/lib/session";
import { generateStudentId } from "@/lib/utils";

const MAX_PHOTO_CHARS = 5_000_000;

const STUDENT_VIEW_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
  "RECEPTIONIST",
];

const STUDENT_MANAGE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "RECEPTIONIST",
];

function cleanText(value: unknown): string {
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
      { status: 401 },
    );
  }

  const permissionError = requireRoles(
    session,
    STUDENT_VIEW_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  try {
    const instituteId = session.instituteId;

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams.get("search") || "";

    const status =
      searchParams.get("status") || "";

    const batchId =
      cleanText(
        searchParams.get("batchId"),
      );

    const page = Math.max(
      1,
      Number.parseInt(
        searchParams.get("page") || "1",
        10,
      ) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(
          searchParams.get("limit") || "20",
          10,
        ) || 20,
      ),
    );

    const offset = (page - 1) * limit;

    const conditions = [
      eq(
        students.instituteId,
        instituteId,
      ),
    ];

    if (status && status !== "ALL") {
      conditions.push(
        eq(
          students.status,
          status as
            | "ACTIVE"
            | "INACTIVE"
            | "ARCHIVED",
        ),
      );
    }

    if (search.trim()) {
      const q = `%${search.trim()}%`;

      conditions.push(
        or(
          like(students.name, q),
          like(students.studentId, q),
          like(students.phone, q),
        )!,
      );
    }

    /*
     * Explicit batch filter.
     * Teacher can only request their own assigned batch.
     */
    if (batchId) {
      const [batch] = await db
        .select({
          id: batches.id,
          teacherId: batches.teacherId,
        })
        .from(batches)
        .where(
          and(
            eq(batches.id, batchId),
            eq(
              batches.instituteId,
              instituteId,
            ),
          ),
        )
        .limit(1);

      if (!batch) {
        return Response.json(
          { error: "Invalid batch" },
          { status: 400 },
        );
      }

      if (session.role === "TEACHER") {
        const [teacher] = await db
          .select({
            id: staff.id,
          })
          .from(staff)
          .where(
            and(
              eq(
                staff.userId,
                session.userId,
              ),
              eq(
                staff.instituteId,
                instituteId,
              ),
            ),
          )
          .limit(1);

        if (!teacher) {
          return Response.json(
            {
              error:
                "Teacher profile is not linked to this account.",
            },
            { status: 403 },
          );
        }

        if (batch.teacherId !== teacher.id) {
          return Response.json(
            { error: "Forbidden" },
            { status: 403 },
          );
        }
      }

      conditions.push(
        sql`
          EXISTS (
            SELECT 1
            FROM ${enrollments}
            WHERE ${enrollments.studentId} = ${students.id}
              AND ${enrollments.batchId} = ${batchId}
              AND ${enrollments.status} = 'ACTIVE'
          )
        `,
      );
    }

    /*
     * Teacher without a batchId:
     * only students from batches assigned to that teacher.
     */
    if (
      session.role === "TEACHER" &&
      !batchId
    ) {
      const [teacher] = await db
        .select({
          id: staff.id,
        })
        .from(staff)
        .where(
          and(
            eq(
              staff.userId,
              session.userId,
            ),
            eq(
              staff.instituteId,
              instituteId,
            ),
          ),
        )
        .limit(1);

      if (!teacher) {
        return Response.json(
          {
            error:
              "Teacher profile is not linked to this account.",
          },
          { status: 403 },
        );
      }

      conditions.push(
        sql`
          EXISTS (
            SELECT 1
            FROM ${enrollments}
            INNER JOIN ${batches}
              ON ${batches.id} = ${enrollments.batchId}
            WHERE ${enrollments.studentId} = ${students.id}
              AND ${enrollments.status} = 'ACTIVE'
              AND ${batches.teacherId} = ${teacher.id}
              AND ${batches.instituteId} = ${instituteId}
          )
        `,
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
  } catch (error) {
    console.error(
      "GET /api/students error:",
      error,
    );

    return Response.json(
      {
        error:
          "Failed to load students",
      },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const permissionError = requireRoles(
    session,
    STUDENT_MANAGE_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  const instituteId = session.instituteId;

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
    const batchId =
      cleanText(body.batchId);

    const gender = validGender(body.gender);

    const photoUrl = cleanPhotoUrl(
      body.photoUrl,
    );

    if (!name || !admissionDate) {
      return Response.json(
        {
          error:
            "Name and admission date required",
        },
        { status: 400 },
      );
    }

    if (body.photoUrl && !photoUrl) {
      return Response.json(
        {
          error:
            "Invalid student photo. Please choose a JPG, PNG, or WEBP image up to 2 MB.",
        },
        { status: 400 },
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
              instituteId,
            ),
          ),
        )
        .limit(1);

      if (!batch) {
        return Response.json(
          { error: "Invalid batch" },
          { status: 400 },
        );
      }
    }

    const studentId =
      generateStudentId();

    const result =
      await db.transaction(async (tx) => {
        const [student] = await tx
          .insert(students)
          .values({
            instituteId,
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

        if (!student) {
          throw new Error(
            "Failed to create student.",
          );
        }

        if (batchId) {
          await tx
            .insert(enrollments)
            .values({
              instituteId,
              studentId: student.id,
              batchId,
              enrollmentDate:
                admissionDate,
              status: "ACTIVE",
            });
        }

        return student;
      });

    return Response.json({
      student: result,
    });
  } catch (error) {
    console.error(
      "POST /api/students error:",
      error,
    );

    return Response.json(
      {
        error:
          "Failed to add student",
      },
      { status: 500 },
    );
  }
}
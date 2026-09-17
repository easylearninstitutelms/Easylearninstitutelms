import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  students,
  enrollments,
  batches,
  staff,
  users,
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

function generateTemporaryPassword(): string {
  return `EL@${randomBytes(9).toString(
    "base64url",
  )}`;
}

async function usernameTaken(
  email: string,
) {
  const [existing] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return Boolean(existing);
}

async function generateStudentLoginIdentifier(
  studentCode: string,
) {
  const base =
    `${studentCode.toLowerCase()}@student.easylearn.local`;

  if (!(await usernameTaken(base))) {
    return base;
  }

  for (
    let attempt = 0;
    attempt < 20;
    attempt += 1
  ) {
    const suffix =
      randomBytes(3).toString("hex");

    const email =
      `${studentCode.toLowerCase()}.${suffix}@student.easylearn.local`;

    if (!(await usernameTaken(email))) {
      return email;
    }
  }

  throw new Error(
    "Could not generate a unique student login identifier.",
  );
}

export async function GET(
  request: Request,
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const permissionError =
    requireRoles(
      session,
      STUDENT_VIEW_ROLES,
    );

  if (permissionError) {
    return permissionError;
  }

  try {
    const instituteId =
      session.instituteId;

    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams.get("search") ||
      "";

    const status =
      searchParams.get("status") ||
      "";

    const batchId =
      cleanText(
        searchParams.get("batchId"),
      );

    const page = Math.max(
      1,
      Number.parseInt(
        searchParams.get("page") ||
          "1",
        10,
      ) || 1,
    );

    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(
          searchParams.get("limit") ||
            "20",
          10,
        ) || 20,
      ),
    );

    const offset =
      (page - 1) * limit;

    const conditions = [
      eq(
        students.instituteId,
        instituteId,
      ),
    ];

    if (
      status &&
      status !== "ALL"
    ) {
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
      const q =
        `%${search.trim()}%`;

      conditions.push(
        or(
          like(
            students.name,
            q,
          ),
          like(
            students.studentId,
            q,
          ),
          like(
            students.phone,
            q,
          ),
        )!,
      );
    }

    /*
     * Explicit batch filter.
     * Teacher can only request their own assigned batch.
     */
    if (batchId) {
      const [batch] =
        await db
          .select({
            id: batches.id,
            teacherId:
              batches.teacherId,
          })
          .from(batches)
          .where(
            and(
              eq(
                batches.id,
                batchId,
              ),
              eq(
                batches.instituteId,
                instituteId,
              ),
            ),
          )
          .limit(1);

      if (!batch) {
        return Response.json(
          {
            error: "Invalid batch",
          },
          { status: 400 },
        );
      }

      if (
        session.role ===
        "TEACHER"
      ) {
        const [teacher] =
          await db
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

        if (
          batch.teacherId !==
          teacher.id
        ) {
          return Response.json(
            {
              error: "Forbidden",
            },
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
      session.role ===
        "TEACHER" &&
      !batchId
    ) {
      const [teacher] =
        await db
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

    const [{ total }] =
      await db
        .select({
          total:
            sql<number>`count(*)::int`,
        })
        .from(students)
        .where(
          and(...conditions),
        );

    const rows =
      await db
        .select()
        .from(students)
        .where(
          and(...conditions),
        )
        .orderBy(
          desc(
            students.createdAt,
          ),
        )
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

export async function POST(
  request: Request,
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const permissionError =
    requireRoles(
      session,
      STUDENT_MANAGE_ROLES,
    );

  if (permissionError) {
    return permissionError;
  }

  const instituteId =
    session.instituteId;

  try {
    const body =
      await request.json();

    const name =
      cleanText(body.name);

    const phone =
      cleanText(body.phone);

    const guardianName =
      cleanText(
        body.guardianName,
      );

    const guardianPhone =
      cleanText(
        body.guardianPhone,
      );

    const address =
      cleanText(body.address);

    const dob =
      cleanText(body.dob);

    const admissionDate =
      cleanText(
        body.admissionDate,
      );

    const batchId =
      cleanText(body.batchId);

    const gender =
      validGender(body.gender);

    const photoUrl =
      cleanPhotoUrl(
        body.photoUrl,
      );

    if (
      !name ||
      !admissionDate
    ) {
      return Response.json(
        {
          error:
            "Name and admission date required",
        },
        { status: 400 },
      );
    }

    if (
      body.photoUrl &&
      !photoUrl
    ) {
      return Response.json(
        {
          error:
            "Invalid student photo. Please choose a JPG, PNG, or WEBP image up to 2 MB.",
        },
        { status: 400 },
      );
    }

    if (batchId) {
      const [batch] =
        await db
          .select({
            id: batches.id,
          })
          .from(batches)
          .where(
            and(
              eq(
                batches.id,
                batchId,
              ),
              eq(
                batches.instituteId,
                instituteId,
              ),
            ),
          )
          .limit(1);

      if (!batch) {
        return Response.json(
          {
            error:
              "Invalid batch",
          },
          { status: 400 },
        );
      }
    }

    const studentId =
      generateStudentId();

    const loginEmail =
      await generateStudentLoginIdentifier(
        studentId,
      );

    const temporaryPassword =
      generateTemporaryPassword();

    const passwordHash =
      await bcrypt.hash(
        temporaryPassword,
        12,
      );

    const result =
      await db.transaction(
        async (tx) => {
          /*
           * 1. Create login account
           */
          const [user] =
            await tx
              .insert(users)
              .values({
                instituteId,
                role: "STUDENT",
                name,
                phone:
                  phone || null,
                email: loginEmail,
                passwordHash,
                status: "ACTIVE",
              })
              .returning({
                id: users.id,
              });

          if (!user) {
            throw new Error(
              "Failed to create student user account.",
            );
          }

          /*
           * 2. Create student profile
           */
          const [student] =
            await tx
              .insert(students)
              .values({
                userId: user.id,
                instituteId,
                studentId,
                name,
                phone:
                  phone || null,
                guardianName:
                  guardianName ||
                  null,
                guardianPhone:
                  guardianPhone ||
                  null,
                address:
                  address || null,
                dob:
                  dob || null,
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

          /*
           * 3. Create batch enrollment
           */
          if (batchId) {
            await tx
              .insert(enrollments)
              .values({
                instituteId,
                studentId:
                  student.id,
                batchId,
                enrollmentDate:
                  admissionDate,
                status: "ACTIVE",
              });
          }

          return {
            student,
            userId: user.id,
          };
        },
      );

    return Response.json(
      {
        student:
          result.student,

        account: {
          userId:
            result.userId,

          role: "STUDENT",

          username:
            loginEmail,

          loginEmail,

          loginUrl: "/",

          temporaryPassword,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/students error:",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create student and login account.",
      },
      { status: 500 },
    );
  }
}
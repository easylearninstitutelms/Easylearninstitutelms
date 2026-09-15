import { db } from "@/db";
import {
  students,
  enrollments,
  batches,
  courses,
  attendance,
  fees,
  payments,
} from "@/db/schema";
import {
  eq,
  and,
  desc,
} from "drizzle-orm";
import { getSession } from "@/lib/session";

const MAX_PHOTO_CHARS = 5_000_000;

function cleanText(value: unknown) {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function sanitizePhoto(value: unknown) {
  const valueText = cleanText(value);

  if (!valueText) {
    return null;
  }

  if (valueText.length > MAX_PHOTO_CHARS) {
    return undefined;
  }

  if (!valueText.startsWith("data:image/")) {
    return undefined;
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

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { id } = await params;

  const [student] = await db
    .select()
    .from(students)
    .where(
      and(
        eq(students.id, id),
        eq(
          students.instituteId,
          session.instituteId
        )
      )
    )
    .limit(1);

  if (!student) {
    return Response.json(
      { error: "Not found" },
      { status: 404 }
    );
  }

  const studentEnrollments =
    await db
      .select({
        enrollment: enrollments,
        batch: batches,
        course: courses,
      })
      .from(enrollments)
      .leftJoin(
        batches,
        eq(
          enrollments.batchId,
          batches.id
        )
      )
      .leftJoin(
        courses,
        eq(
          batches.courseId,
          courses.id
        )
      )
      .where(
        and(
          eq(
            enrollments.studentId,
            id
          ),
          eq(
            enrollments.instituteId,
            session.instituteId
          )
        )
      );

  const recentAttendance =
    await db
      .select()
      .from(attendance)
      .where(
        and(
          eq(
            attendance.studentId,
            id
          ),
          eq(
            attendance.instituteId,
            session.instituteId
          )
        )
      )
      .orderBy(
        desc(attendance.date)
      )
      .limit(10);

  const studentFees =
    await db
      .select()
      .from(fees)
      .where(
        and(
          eq(
            fees.studentId,
            id
          ),
          eq(
            fees.instituteId,
            session.instituteId
          )
        )
      )
      .orderBy(
        desc(fees.createdAt)
      );

  const studentPayments =
    await db
      .select()
      .from(payments)
      .where(
        and(
          eq(
            payments.studentId,
            id
          ),
          eq(
            payments.instituteId,
            session.instituteId
          )
        )
      )
      .orderBy(
        desc(payments.paidAt)
      );

  return Response.json({
    student,
    enrollments:
      studentEnrollments,
    attendance:
      recentAttendance,
    fees: studentFees,
    payments: studentPayments,
  });
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (
    session.role !==
      "INSTITUTE_ADMIN" &&
    session.role !==
      "SUPER_ADMIN"
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { id } = await params;

  try {
    const body =
      await request.json();

    const [existing] =
      await db
        .select()
        .from(students)
        .where(
          and(
            eq(students.id, id),
            eq(
              students.instituteId,
              session.instituteId
            )
          )
        )
        .limit(1);

    if (!existing) {
      return Response.json(
        {
          error:
            "Student not found",
        },
        { status: 404 }
      );
    }

    const name =
      cleanText(body.name);

    const admissionDate =
      cleanText(
        body.admissionDate
      );

    if (
      !name ||
      !admissionDate
    ) {
      return Response.json(
        {
          error:
            "Name and admission date are required",
        },
        { status: 400 }
      );
    }

    let cleanedPhoto:
      | string
      | null
      | undefined;

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "photoUrl"
      )
    ) {
      cleanedPhoto =
        sanitizePhoto(
          body.photoUrl
        );

      if (
        cleanedPhoto ===
        undefined
      ) {
        return Response.json(
          {
            error:
              "Invalid student photo. Please choose a JPG, PNG, or WEBP image up to 2 MB.",
          },
          { status: 400 }
        );
      }
    }

    const updateData: Partial<
      typeof students.$inferInsert
    > = {
      name,

      phone:
        cleanText(
          body.phone
        ) || null,

      guardianName:
        cleanText(
          body.guardianName
        ) || null,

      guardianPhone:
        cleanText(
          body.guardianPhone
        ) || null,

      address:
        cleanText(
          body.address
        ) || null,

      dob:
        cleanText(
          body.dob
        ) || null,

      gender:
        validGender(
          body.gender
        ),

      admissionDate,

      updatedAt:
        new Date(),
    };

    /*
     * Photo handling:
     *
     * - photoUrl provided with data URL -> update photo
     * - photoUrl provided as empty string/null -> remove photo
     * - photoUrl not provided -> keep existing photo
     */
    if (
      cleanedPhoto !==
      undefined
    ) {
      updateData.photoUrl =
        cleanedPhoto;
    }

    const [updated] =
      await db
        .update(students)
        .set(updateData)
        .where(
          and(
            eq(students.id, id),
            eq(
              students.instituteId,
              session.instituteId
            )
          )
        )
        .returning();

    if (!updated) {
      return Response.json(
        {
          error:
            "Student could not be updated",
        },
        { status: 500 }
      );
    }

    /*
     * Batch update.
     *
     * If batchId is present:
     * - validate batch belongs to this institute
     * - update existing active enrollment
     * - otherwise create a new enrollment
     *
     * If batchId is empty:
     * - do not modify existing enrollment
     *
     * This keeps the existing student's batch safe
     * when the edit form doesn't send batchId.
     */
    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "batchId"
      )
    ) {
      const batchId =
        cleanText(
          body.batchId
        );

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
                  batchId
                ),
                eq(
                  batches.instituteId,
                  session.instituteId
                )
              )
            )
            .limit(1);

        if (!batch) {
          return Response.json(
            {
              error:
                "Invalid batch",
            },
            { status: 400 }
          );
        }

        const activeEnrollment =
          await db
            .select({
              id: enrollments.id,
            })
            .from(enrollments)
            .where(
              and(
                eq(
                  enrollments.studentId,
                  id
                ),
                eq(
                  enrollments.instituteId,
                  session.instituteId
                ),
                eq(
                  enrollments.status,
                  "ACTIVE"
                )
              )
            )
            .limit(1);

        if (
          activeEnrollment[0]
        ) {
          await db
            .update(enrollments)
            .set({
              batchId,
              enrollmentDate:
                admissionDate,
              status: "ACTIVE",
            })
            .where(
              eq(
                enrollments.id,
                activeEnrollment[0]
                  .id
              )
            );
        } else {
          await db
            .insert(enrollments)
            .values({
              instituteId:
                session.instituteId,

              studentId: id,

              batchId,

              enrollmentDate:
                admissionDate,

              status: "ACTIVE",
            });
        }
      }
    }

    return Response.json({
      student: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/students/[id] error:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to update student",
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      id: string;
    }>;
  }
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (
    session.role !==
      "INSTITUTE_ADMIN" &&
    session.role !==
      "SUPER_ADMIN"
  ) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  const { id } = await params;

  const [updated] =
    await db
      .update(students)
      .set({
        status: "ARCHIVED",
        updatedAt:
          new Date(),
      })
      .where(
        and(
          eq(students.id, id),
          eq(
            students.instituteId,
            session.instituteId
          )
        )
      )
      .returning();

  if (!updated) {
    return Response.json(
      {
        error:
          "Student not found",
      },
      { status: 404 }
    );
  }

  return Response.json({
    student: updated,
  });
}
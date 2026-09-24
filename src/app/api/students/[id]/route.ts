import { db } from "@/db";
import {
  students,
  enrollments,
  batches,
  courses,
  programmes,
  attendance,
  fees,
  payments,
  staff,
} from "@/db/schema";
import {
  eq,
  and,
  desc,
  sql,
  aliasedTable,
} from "drizzle-orm";
import {
  getSession,
  requireRoles,
} from "@/lib/session";

const MAX_PHOTO_CHARS = 5_000_000;

const STUDENT_VIEW_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
  "RECEPTIONIST",
];

const STUDENT_EDIT_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "RECEPTIONIST",
];

const STUDENT_DELETE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
];

function cleanText(value: unknown): string {
  return typeof value === "string"
    ? value.trim()
    : "";
}

function sanitizePhoto(value: unknown) {
  const valueText = cleanText(value);

  if (!valueText) return null;

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

async function getTeacherId(
  instituteId: string,
  userId: string,
) {
  const [teacher] = await db
    .select({
      id: staff.id,
    })
    .from(staff)
    .where(
      and(
        eq(staff.userId, userId),
        eq(staff.instituteId, instituteId),
      ),
    )
    .limit(1);

  return teacher?.id ?? null;
}

async function teacherCanAccessStudent(
  studentId: string,
  instituteId: string,
  userId: string,
) {
  const teacherId = await getTeacherId(
    instituteId,
    userId,
  );

  if (!teacherId) return false;

  const [access] = await db
    .select({
      enrollmentId: enrollments.id,
    })
    .from(enrollments)
    .innerJoin(
      batches,
      eq(
        enrollments.batchId,
        batches.id,
      ),
    )
    .where(
      and(
        eq(
          enrollments.studentId,
          studentId,
        ),
        eq(
          enrollments.instituteId,
          instituteId,
        ),
        eq(
          enrollments.status,
          "ACTIVE",
        ),
        eq(
          batches.instituteId,
          instituteId,
        ),
        eq(
          batches.teacherId,
          teacherId,
        ),
      ),
    )
    .limit(1);

  return Boolean(access);
}

export async function GET(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
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

  const { id } = await params;
  const instituteId = session.instituteId;

  if (session.role === "TEACHER") {
    const allowed =
      await teacherCanAccessStudent(
        id,
        instituteId,
        session.userId,
      );

    if (!allowed) {
      return Response.json(
        { error: "Not found" },
        { status: 404 },
      );
    }
  }

  try {
    const [student] = await db
      .select()
      .from(students)
      .where(
        and(
          eq(students.id, id),
          eq(
            students.instituteId,
            instituteId,
          ),
        ),
      )
      .limit(1);

    if (!student) {
      return Response.json(
        { error: "Not found" },
        { status: 404 },
      );
    }

    /*
     * Load the student's enrollments directly from
     * enrollment.courseId / enrollment.programmeId.
     *
     * We keep the batch course as a fallback because
     * older batch-based enrollments may not have a
     * direct courseId.
     */

    const batchCourses = aliasedTable(
  courses,
  "enrollment_batch_course",
);

    const existingEnrollments =
      await db
        .select({
          enrollment: enrollments,
          batch: batches,
          directCourse: courses,
          batchCourse: batchCourses,
          programme: programmes,
        })
        .from(enrollments)
        .leftJoin(
          batches,
          eq(
            enrollments.batchId,
            batches.id,
          ),
        )
        .leftJoin(
          courses,
          eq(
            enrollments.courseId,
            courses.id,
          ),
        )
        .leftJoin(
          batchCourses,
          eq(
            batches.courseId,
            batchCourses.id,
          ),
        )
        .leftJoin(
          programmes,
          eq(
            enrollments.programmeId,
            programmes.id,
          ),
        )
        .where(
          and(
            eq(
              enrollments.studentId,
              id,
            ),
            eq(
              enrollments.instituteId,
              instituteId,
            ),
          ),
        );

    const studentEnrollments =
      existingEnrollments.map(
        (item) => {
          const directCourse =
            item.directCourse
              ? {
                  id:
                    item.directCourse.id,
                  name:
                    item.directCourse.name,
                  description:
                    item.directCourse.description,
                  duration:
                    item.directCourse.duration,
                  fee:
                    item.directCourse.fee,
                }
              : null;

          const batchCourse =
            item.batchCourse
              ? {
                  id:
                    item.batchCourse.id,
                  name:
                    item.batchCourse.name,
                  description:
                    item.batchCourse.description,
                  duration:
                    item.batchCourse.duration,
                  fee:
                    item.batchCourse.fee,
                }
              : null;

          const programme =
            item.programme
              ? {
                  id:
                    item.programme.id,
                  name:
                    item.programme.name,
                  code:
                    item.programme.code,
                  description:
                    item.programme.description,
                  duration:
                    item.programme.duration,
                }
              : null;

          return {
            enrollment:
              item.enrollment,
            batch:
              item.batch,
            course:
              directCourse ||
              batchCourse ||
              null,
            programme,
          };
        },
      );

    const recentAttendance =
      await db
        .select({
          id: attendance.id,
          instituteId: attendance.instituteId,
          studentId: attendance.studentId,
          batchId: attendance.batchId,
          date: attendance.date,
          status: attendance.status,
          recordedBy: attendance.recordedBy,
          note: attendance.note,
          createdAt: attendance.createdAt,
        })
        .from(attendance)
        .where(
          and(
            eq(
              attendance.studentId,
              id,
            ),
            eq(
              attendance.instituteId,
              instituteId,
            ),
          ),
        )
        .orderBy(
          desc(attendance.date),
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
              id,
            ),
            eq(
              fees.instituteId,
              instituteId,
            ),
          ),
        )
        .orderBy(
          desc(fees.createdAt),
        );

    const studentPayments =
      await db
        .select({
          id: payments.id,
          instituteId: payments.instituteId,
          studentId: payments.studentId,
          feeId: payments.feeId,
          amount: payments.amount,
          method: payments.method,
          transactionReference:
            payments.transactionReference,
          receiptNumber:
            payments.receiptNumber,
          collectedBy:
            payments.collectedBy,
          paidAt: payments.paidAt,
          createdAt: payments.createdAt,
        })
        .from(payments)
        .where(
          and(
            eq(
              payments.studentId,
              id,
            ),
            eq(
              payments.instituteId,
              instituteId,
            ),
          ),
        )
        .orderBy(
          desc(payments.paidAt),
        );

    return Response.json({
      student,
      enrollments:
        studentEnrollments,
      attendance:
        recentAttendance,
      fees: studentFees,
      payments:
        studentPayments,
    });
  } catch (error) {
    console.error(
      "GET /api/students/[id] error:",
      error,
    );

    return Response.json(
      {
        error:
          "Failed to load student",
      },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const permissionError = requireRoles(
    session,
    STUDENT_EDIT_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  const { id } = await params;
  const instituteId = session.instituteId;

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
              instituteId,
            ),
          ),
        )
        .limit(1);

    if (!existing) {
      return Response.json(
        {
          error:
            "Student not found",
        },
        { status: 404 },
      );
    }

    const name =
      cleanText(body.name);

    const admissionDate =
      cleanText(
        body.admissionDate,
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
        { status: 400 },
      );
    }

    let cleanedPhoto:
      | string
      | null
      | undefined;

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "photoUrl",
      )
    ) {
      cleanedPhoto =
        sanitizePhoto(
          body.photoUrl,
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
          { status: 400 },
        );
      }
    }

    const updateData: Partial<
      typeof students.$inferInsert
    > = {
      name,

      phone:
        cleanText(
          body.phone,
        ) || null,

      guardianName:
        cleanText(
          body.guardianName,
        ) || null,

      guardianPhone:
        cleanText(
          body.guardianPhone,
        ) || null,

      address:
        cleanText(
          body.address,
        ) || null,

      dob:
        cleanText(
          body.dob,
        ) || null,

      gender:
        validGender(
          body.gender,
        ),

      admissionDate,

      updatedAt:
        new Date(),
    };

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
              instituteId,
            ),
          ),
        )
        .returning();

    if (!updated) {
      return Response.json(
        {
          error:
            "Student could not be updated",
        },
        { status: 500 },
      );
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "batchId",
      )
    ) {
      const batchId =
        cleanText(
          body.batchId,
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
                  id,
                ),
                eq(
                  enrollments.instituteId,
                  instituteId,
                ),
                eq(
                  enrollments.status,
                  "ACTIVE",
                ),
              ),
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
                  .id,
              ),
            );
        } else {
          await db
            .insert(enrollments)
            .values({
              instituteId,
              studentId: id,
              batchId,
              enrollmentDate:
                admissionDate,
              status: "ACTIVE",
            });
        }
      }
    }

    if (
      Object.prototype.hasOwnProperty.call(
        body,
        "courseId",
      ) ||
      Object.prototype.hasOwnProperty.call(
        body,
        "programmeId",
      )
    ) {
      const courseId =
        cleanText(
          body.courseId,
        );

      const programmeId =
        cleanText(
          body.programmeId,
        );

      if (
        (courseId &&
          programmeId) ||
        (!courseId &&
          !programmeId)
      ) {
        return Response.json(
          {
            error:
              "Please select exactly one Course or Programme.",
          },
          { status: 400 },
        );
      }

      if (courseId) {
        const courseResult =
          await db.execute(sql`
            SELECT id
            FROM courses
            WHERE id = ${courseId}
              AND institute_id = ${instituteId}
              AND status = 'ACTIVE'
            LIMIT 1
          `);

        const courseRows: any[] =
          Array.isArray(
            (courseResult as any)?.rows,
          )
            ? (courseResult as any).rows
            : [];

        if (!courseRows[0]) {
          return Response.json(
            {
              error:
                "Invalid course",
            },
            { status: 400 },
          );
        }
      }

      if (programmeId) {
        const programmeResult =
          await db.execute(sql`
            SELECT id
            FROM programmes
            WHERE id = ${programmeId}
              AND institute_id = ${instituteId}
              AND status = 'ACTIVE'
            LIMIT 1
          `);

        const programmeRows: any[] =
          Array.isArray(
            (programmeResult as any)?.rows,
          )
            ? (programmeResult as any).rows
            : [];

        if (!programmeRows[0]) {
          return Response.json(
            {
              error:
                "Invalid programme",
            },
            { status: 400 },
          );
        }
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
                id,
              ),
              eq(
                enrollments.instituteId,
                instituteId,
              ),
              eq(
                enrollments.status,
                "ACTIVE",
              ),
            ),
          )
          .limit(1);

      if (
        activeEnrollment[0]
      ) {
        await db.execute(sql`
          UPDATE enrollments
          SET
            batch_id = NULL,
            course_id = ${courseId || null},
            programme_id = ${programmeId || null},
            enrollment_date = ${admissionDate},
            status = 'ACTIVE'
          WHERE id = ${activeEnrollment[0].id}
        `);
      } else {
        await db.execute(sql`
          INSERT INTO enrollments (
            institute_id,
            student_id,
            batch_id,
            course_id,
            programme_id,
            enrollment_date,
            status
          )
          VALUES (
            ${instituteId},
            ${id},
            NULL,
            ${courseId || null},
            ${programmeId || null},
            ${admissionDate},
            'ACTIVE'
          )
        `);
      }
    }

    return Response.json({
      student: updated,
    });
  } catch (error) {
    console.error(
      "PATCH /api/students/[id] error:",
      error,
    );

    return Response.json(
      {
        error:
          "Failed to update student",
      },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const permissionError = requireRoles(
    session,
    STUDENT_DELETE_ROLES,
  );

  if (permissionError) {
    return permissionError;
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
            session.instituteId,
          ),
        ),
      )
      .returning();

  if (!updated) {
    return Response.json(
      {
        error:
          "Student not found",
      },
      { status: 404 },
    );
  }

  return Response.json({
    student: updated,
  });
}
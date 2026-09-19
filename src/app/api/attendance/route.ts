import { db } from "@/db";
import {
  attendance,
  students,
  batches,
  enrollments,
  staff,
} from "@/db/schema";
import {
  eq,
  and,
  desc,
  sql,
  inArray,
} from "drizzle-orm";
import {
  getSession,
  requireRoles,
} from "@/lib/session";

const ATTENDANCE_VIEW_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
];

const ATTENDANCE_WRITE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
];

const MAX_BULK_ATTENDANCE = 200;

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

async function getTeacherBatchIds(
  instituteId: string,
  userId: string,
) {
  const teacherId =
    await getTeacherId(
      instituteId,
      userId,
    );

  if (!teacherId) {
    return {
      teacherId: null,
      batchIds: [] as string[],
    };
  }

  const rows = await db
    .select({
      id: batches.id,
    })
    .from(batches)
    .where(
      eq(
        batches.instituteId,
        instituteId,
      ),
    );

  return {
    teacherId,
    batchIds: rows.map(
      (row) => row.id,
    ),
  };
}

// =========================================================
// GET ATTENDANCE
// =========================================================

export async function GET(
  request: Request,
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const permissionError =
    requireRoles(
      session,
      ATTENDANCE_VIEW_ROLES,
    );

  if (permissionError) {
    return permissionError;
  }

  try {
    await ensureAcademicCoreSchema();
    const instituteId =
      session.instituteId;

    const { searchParams } =
      new URL(request.url);

    const batchId =
      searchParams.get(
        "batchId",
      );

    const date =
      searchParams.get(
        "date",
      );

    const studentId =
      searchParams.get(
        "studentId",
      );

    const classId =
      searchParams.get(
        "classId",
      );

    const month =
      searchParams.get(
        "month",
      );

    // =====================================================
    // TEACHER BATCH SECURITY
    // =====================================================

    let teacherBatchIds:
      | string[]
      | null = null;

    if (
      session.role ===
      "TEACHER"
    ) {
      const teacherData =
        await getTeacherBatchIds(
          instituteId,
          session.userId,
        );

      if (
        !teacherData.teacherId
      ) {
        return Response.json(
          {
            error:
              "Teacher profile is not linked to this account",
          },
          { status: 403 },
        );
      }

      teacherBatchIds =
        teacherData.batchIds;
    }

    // =====================================================
    // MONTHLY ATTENDANCE REPORT
    // =====================================================

    if (
      month &&
      batchId
    ) {
      if (
        session.role ===
        "TEACHER"
      ) {
        const allowed =
          teacherBatchIds?.includes(
            batchId,
          );

        if (!allowed) {
          return Response.json(
            {
              error:
                "You can only view attendance for your assigned batches.",
            },
            { status: 403 },
          );
        }
      }

      const monthStart =
        `${month}-01`;

      const [
        year,
        monthNumber,
      ] =
        month
          .split("-")
          .map(Number);

      const nextMonthDate =
        new Date(
          year,
          monthNumber,
          1,
        );

      const nextYear =
        nextMonthDate.getFullYear();

      const nextMonth =
        String(
          nextMonthDate.getMonth() +
            1,
        ).padStart(2, "0");

      const monthEnd =
        `${nextYear}-${nextMonth}-01`;

      const rows = await db
        .select({
          attendance:
            attendance,
          studentName:
            students.name,
          studentId:
            students.studentId,
        })
        .from(attendance)
        .leftJoin(
          students,
          eq(
            attendance.studentId,
            students.id,
          ),
        )
        .where(
          and(
            eq(
              attendance.instituteId,
              instituteId,
            ),
            eq(
              attendance.batchId,
              batchId,
            ),
            sql`${attendance.date} >= ${monthStart}`,
            sql`${attendance.date} < ${monthEnd}`,
          ),
        )
        .orderBy(
          attendance.date,
        );

      const grouped =
        new Map<
          string,
          {
            studentId: string;
            studentName: string;
            present: number;
            absent: number;
            late: number;
            EXCUSED: number;
            total: number;
          }
        >();

      for (const row of rows) {
        const key =
          row.attendance.studentId;

        if (!grouped.has(key)) {
          grouped.set(key, {
            studentId:
              row.attendance
                .studentId,
            studentName:
              row.studentName ||
              "Unknown Student",
            present: 0,
            absent: 0,
            late: 0,
            EXCUSED: 0,
            total: 0,
          });
        }

        const student =
          grouped.get(key)!;

        student.total += 1;

        const currentStatus = row.attendance.status as string;

        switch (currentStatus) {
          case "PRESENT":
            student.present += 1;
            break;

          case "ABSENT":
            student.absent += 1;
            break;

          case "LATE":
            student.late += 1;
            break;

          case "EXCUSED":
          case "LEAVE":
            student.EXCUSED += 1;
            break;
        }
      }

      const report =
        Array.from(
          grouped.values(),
        ).map(
          (student) => {
            const attended =
              student.present +
              student.late;

            const percentage =
              student.total > 0
                ? Math.round(
                    (attended /
                      student.total) *
                      100,
                  )
                : 0;

            return {
              ...student,
              percentage,
            };
          },
        );

      const summary =
        report.reduce(
          (
            acc,
            student,
          ) => {
            acc.present +=
              student.present;

            acc.absent +=
              student.absent;

            acc.late +=
              student.late;

            acc.EXCUSED +=
              student.EXCUSED;

            acc.total +=
              student.total;

            return acc;
          },
          {
            present: 0,
            absent: 0,
            late: 0,
            EXCUSED: 0,
            total: 0,
          },
        );

      const attended =
        summary.present +
        summary.late;

      const percentage =
        summary.total > 0
          ? Math.round(
              (attended /
                summary.total) *
                100,
            )
          : 0;

      return Response.json({
        report,
        summary: {
          ...summary,
          percentage,
        },
        month,
        batchId,
      });
    }

    // =====================================================
    // DAILY ATTENDANCE
    // =====================================================

    const conditions = [
      eq(
        attendance.instituteId,
        instituteId,
      ),
    ];

    if (batchId) {
      if (
        session.role ===
        "TEACHER"
      ) {
        const allowed =
          teacherBatchIds?.includes(
            batchId,
          );

        if (!allowed) {
          return Response.json(
            {
              error:
                "You can only view attendance for your assigned batches.",
            },
            { status: 403 },
          );
        }
      }

      conditions.push(
        eq(
          attendance.batchId,
          batchId,
        ),
      );
    } else if (
      session.role ===
      "TEACHER"
    ) {
      if (
        !teacherBatchIds ||
        teacherBatchIds.length ===
          0
      ) {
        return Response.json({
          attendance: [],
        });
      }

      conditions.push(
        inArray(
          attendance.batchId,
          teacherBatchIds,
        ),
      );
    }

    if (classId) {
      conditions.push(
        eq(attendance.classId, classId),
      );
    }

    if (date) {
      conditions.push(
        eq(
          attendance.date,
          date,
        ),
      );
    }

    if (studentId) {
      conditions.push(
        eq(
          attendance.studentId,
          studentId,
        ),
      );
    }

    const rows = await db
      .select({
        attendance:
          attendance,
        studentName:
          students.name,
        studentId:
          students.studentId,
      })
      .from(attendance)
      .leftJoin(
        students,
        eq(
          attendance.studentId,
          students.id,
        ),
      )
      .where(
        and(...conditions),
      )
      .orderBy(
        desc(
          attendance.date,
        ),
      );

    return Response.json({
      attendance: rows,
    });
  } catch (error) {
    console.error(
      "GET /api/attendance error:",
      error,
    );

    return Response.json(
      {
        error:
          "Failed to load attendance",
      },
      { status: 500 },
    );
  }
}

// =========================================================
// SAVE / UPDATE ATTENDANCE
// =========================================================

export async function POST(
  request: Request,
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      { status: 401 },
    );
  }

  const permissionError =
    requireRoles(
      session,
      ATTENDANCE_WRITE_ROLES,
    );

  if (permissionError) {
    return permissionError;
  }

  try {
    const body =
      await request.json();

    const { records } = body;

    if (
      !records ||
      !Array.isArray(records)
    ) {
      return Response.json(
        {
          error:
            "Records array required",
        },
        { status: 400 },
      );
    }

    if (
      records.length === 0
    ) {
      return Response.json(
        {
          error:
            "At least one attendance record is required",
        },
        { status: 400 },
      );
    }

    if (
      records.length >
      MAX_BULK_ATTENDANCE
    ) {
      return Response.json(
        {
          error:
            `Maximum ${MAX_BULK_ATTENDANCE} attendance records can be submitted at once`,
        },
        { status: 400 },
      );
    }

    let teacherId:
      | string
      | null = null;

    if (
      session.role ===
      "TEACHER"
    ) {
      teacherId =
        await getTeacherId(
          session.instituteId,
          session.userId,
        );

      if (!teacherId) {
        return Response.json(
          {
            error:
              "Teacher profile is not linked to this account",
          },
          { status: 403 },
        );
      }
    }

    for (const record of records) {
      if (
        !record?.studentId ||
        !record?.batchId ||
        !record?.classId ||
        !record?.date ||
        !record?.status
      ) {
        return Response.json(
          {
            error:
              "studentId, batchId, classId, date and status are required",
          },
          { status: 400 },
        );
      }

      if (
        ![
          "PRESENT",
          "ABSENT",
          "LATE",
          "EXCUSED",
          "LEAVE",
        ].includes(
          record.status,
        )
      ) {
        return Response.json(
          {
            error:
              "Invalid attendance status",
          },
          { status: 400 },
        );
      }

      const batchConditions = [
        eq(
          batches.id,
          record.batchId,
        ),
        eq(
          batches.instituteId,
          session.instituteId,
        ),
      ];

      const [batch] =
        await db
          .select({
            id: batches.id,
          })
          .from(batches)
          .where(
            and(
              ...batchConditions,
            ),
          )
          .limit(1);

      if (!batch) {
        return Response.json(
          {
            error:
              teacherId
                ? "You can only manage attendance for your assigned batches."
                : "Invalid batch",
          },
          { status: 403 },
        );
      }

      const [enrollment] =
        await db
          .select({
            id:
              enrollments.id,
          })
          .from(enrollments)
          .where(
            and(
              eq(
                enrollments.studentId,
                record.studentId,
              ),
              eq(
                enrollments.batchId,
                record.batchId,
              ),
              eq(
                enrollments.instituteId,
                session.instituteId,
              ),
              eq(
                enrollments.status,
                "ACTIVE",
              ),
            ),
          )
          .limit(1);

      if (!enrollment) {
        return Response.json(
          {
            error:
              "Student is not actively enrolled in this batch",
          },
          { status: 400 },
        );
      }
    }

    const values =
      records.map(
        (record: {
          studentId: string;
          batchId: string;
          classId: string;
          classType?: string;
          date: string;
          status: string;
          note?: string;
        }) => ({
          instituteId:
            session.instituteId!,
          studentId:
            record.studentId,
          batchId:
            record.batchId,
          date:
            record.date,
          status:
            record.status as any,
          recordedBy:
            session.userId,
          note:
            record.note ||
            null,
          classId: record.classId,
          classType: record.classType || null,
        }),
      );

    const inserted =
      await db
        .insert(attendance)
        .values(values)
        .onConflictDoUpdate({
          target: [
            attendance.studentId,
            attendance.batchId,
            attendance.date,
          ],
          set: {
            status:
              sql`EXCLUDED.status`,
          },
        })
        .returning();

    return Response.json({
      attendance:
        inserted,
    });
  } catch (error) {
    console.error(
      "POST /api/attendance error:",
      error,
    );

    return Response.json(
      {
        error:
          "Failed to save attendance",
      },
      { status: 500 },
    );
  }
}
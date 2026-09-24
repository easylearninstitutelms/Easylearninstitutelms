import { db } from "@/db";
import {
  batches,
  enrollments,
  students,
  routines,
  courses,
  staff,
  attendance,
  homework,
  assignments,
  exams,
  examSubjects,
  results,
} from "@/db/schema";
import { eq, and, desc, inArray, sql } from "drizzle-orm";
import {
  getSession,
  requireRoles,
} from "@/lib/session";

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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
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
    BATCH_VIEW_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  try {
    const { id } = await params;

    const conditions = [
      eq(batches.id, id),
      eq(
        batches.instituteId,
        session.instituteId,
      ),
    ];

    if (session.role === "TEACHER") {
      const [teacher] = await db
        .select({
          id: staff.id,
        })
        .from(staff)
        .where(
          and(
            eq(staff.userId, session.userId),
            eq(
              staff.instituteId,
              session.instituteId,
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
        eq(batches.teacherId, teacher.id),
      );
    }

    const [batch] = await db
      .select({
        batch: batches,
        courseName: courses.name,
        teacherName: staff.name,
      })
      .from(batches)
      .leftJoin(
        courses,
        eq(batches.courseId, courses.id),
      )
      .leftJoin(
        staff,
        eq(batches.teacherId, staff.id),
      )
      .where(and(...conditions))
      .limit(1);

    if (!batch) {
      return Response.json(
        { error: "Not found" },
        { status: 404 },
      );
    }

    const batchStudents = await db
      .select({
        enrollment: enrollments,
        student: students,
      })
      .from(enrollments)
      .leftJoin(
        students,
        eq(enrollments.studentId, students.id),
      )
      .where(
        and(
          eq(enrollments.batchId, id),
          eq(
            enrollments.status,
            "ACTIVE",
          ),
        ),
      );

    const batchRoutines = await db
      .select()
      .from(routines)
      .where(
        and(
          eq(routines.batchId, id),
          eq(
            routines.instituteId,
            session.instituteId,
          ),
        ),
      )
      .orderBy(desc(routines.createdAt));

    return Response.json({
      batch,
      students: batchStudents,
      routines: batchRoutines,
    });
  } catch (error) {
    console.error(
      "Batch GET error:",
      error,
    );

    return Response.json(
      { error: "Failed to load batch" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!BATCH_VIEW_ROLES.includes(session.role)) {
    return Response.json({ error: "You do not have permission to edit batches" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();

    const conditions = [
      eq(batches.id, id),
      eq(batches.instituteId, session.instituteId),
    ];

    if (session.role === "TEACHER") {
      const [teacher] = await db
        .select({ id: staff.id })
        .from(staff)
        .where(
          and(
            eq(staff.userId, session.userId),
            eq(staff.instituteId, session.instituteId),
          ),
        )
        .limit(1);

      if (!teacher) {
        return Response.json({ error: "Teacher profile is not linked to this account." }, { status: 403 });
      }

      conditions.push(eq(batches.teacherId, teacher.id));
    }

    const [existing] = await db
      .select({ id: batches.id })
      .from(batches)
      .where(and(...conditions))
      .limit(1);

    if (!existing) {
      return Response.json({ error: "Batch not found or you are not assigned to it." }, { status: 404 });
    }

    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) {
      return Response.json({ error: "Batch name is required" }, { status: 400 });
    }

    const semesterId = body.semesterId || null;
    const courseId = body.courseId || null;
    const room = body.room === undefined ? undefined : (String(body.room || "").trim() || null);
    const startDate = body.startDate === undefined ? undefined : (body.startDate || null);
    const endDate = body.endDate === undefined ? undefined : (body.endDate || null);
    const fee = body.fee === undefined ? undefined : (body.fee === "" || body.fee == null ? null : String(body.fee));

    const current = await db.execute(sql`
      SELECT programme_id AS "programmeId"
      FROM batches
      WHERE id = ${id} AND institute_id = ${session.instituteId}
      LIMIT 1
    `);
    const currentRows = current && typeof current === "object" && "rows" in current ? (current as { rows: Array<Record<string, unknown>> }).rows : [];
    const programmeId = currentRows[0]?.programmeId;

    if (semesterId) {
      const semester = await db.execute(sql`
        SELECT id
        FROM programme_semesters
        WHERE id = ${semesterId}
          AND programme_id = ${programmeId}
          AND institute_id = ${session.instituteId}
        LIMIT 1
      `);
      const rows = semester && typeof semester === "object" && "rows" in semester ? (semester as { rows: Array<Record<string, unknown>> }).rows : [];
      if (!rows[0]) return Response.json({ error: "Invalid semester for this programme" }, { status: 400 });
    }

    if (courseId) {
      const course = await db.execute(sql`
        SELECT id FROM courses
        WHERE id = ${courseId} AND institute_id = ${session.instituteId}
        LIMIT 1
      `);
      const rows = course && typeof course === "object" && "rows" in course ? (course as { rows: Array<Record<string, unknown>> }).rows : [];
      if (!rows[0]) return Response.json({ error: "Invalid course" }, { status: 400 });
    }

    const [updated] = await db
      .update(batches)
      .set({
        name,
        semesterId,
        ...(courseId !== undefined ? { courseId } : {}),
        ...(room !== undefined ? { room } : {}),
        ...(startDate !== undefined ? { startDate } : {}),
        ...(endDate !== undefined ? { endDate } : {}),
        ...(fee !== undefined ? { fee } : {}),
        updatedAt: new Date(),
      })
      .where(and(...conditions))
      .returning();

    if (!updated) {
      return Response.json({ error: "Batch not found" }, { status: 404 });
    }

    return Response.json({ success: true, batch: updated });
  } catch (error) {
    console.error("Batch PATCH error:", error);
    return Response.json({ error: "Failed to update batch" }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const instituteId = session.instituteId;

  const permissionError = requireRoles(
    session,
    BATCH_MANAGE_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  try {
    const { id } = await params;

    const [existingBatch] = await db
      .select({ id: batches.id })
      .from(batches)
      .where(
        and(
          eq(batches.id, id),
          eq(
            batches.instituteId,
            instituteId,
          ),
        ),
      )
      .limit(1);

    if (!existingBatch) {
      return Response.json(
        { error: "Batch not found" },
        { status: 404 },
      );
    }

    await db.transaction(async (tx) => {
      const batchExamRows = await tx
        .select({ id: exams.id })
        .from(exams)
        .where(
          and(
            eq(exams.batchId, id),
            eq(
              exams.instituteId,
              instituteId,
            ),
          ),
        );

      const examIds = batchExamRows.map(
        (row) => row.id,
      );

      if (examIds.length > 0) {
        await tx
          .delete(results)
          .where(
            inArray(
              results.examId,
              examIds,
            ),
          );

        await tx
          .delete(examSubjects)
          .where(
            inArray(
              examSubjects.examId,
              examIds,
            ),
          );

        await tx
          .delete(exams)
          .where(
            inArray(exams.id, examIds),
          );
      }

      await tx
        .delete(homework)
        .where(
          and(
            eq(homework.batchId, id),
            eq(
              homework.instituteId,
              instituteId,
            ),
          ),
        );

      await tx
        .delete(assignments)
        .where(
          and(
            eq(assignments.batchId, id),
            eq(
              assignments.instituteId,
              instituteId,
            ),
          ),
        );

      await tx
        .delete(routines)
        .where(
          and(
            eq(routines.batchId, id),
            eq(
              routines.instituteId,
              instituteId,
            ),
          ),
        );

      await tx
        .delete(attendance)
        .where(
          and(
            eq(attendance.batchId, id),
            eq(
              attendance.instituteId,
              instituteId,
            ),
          ),
        );

      await tx
        .delete(enrollments)
        .where(
          and(
            eq(enrollments.batchId, id),
            eq(
              enrollments.instituteId,
              instituteId,
            ),
          ),
        );

      await tx
        .delete(batches)
        .where(
          and(
            eq(batches.id, id),
            eq(
              batches.instituteId,
              instituteId,
            ),
          ),
        );
    });

    return Response.json({
      success: true,
      deletedBatchId: id,
    });
  } catch (error) {
    console.error(
      "Batch DELETE error:",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete batch",
      },
      { status: 500 },
    );
  }
}


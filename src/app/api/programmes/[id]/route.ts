import { db } from "@/db";
import {
  assignments,
  attendance,
  batches,
  enrollments,
  examSubjects,
  exams,
  homework,
  programmeSemesters,
  programmes,
  results,
  routines,
} from "@/db/schema";
import { and, eq, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

const PROGRAMME_DELETE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
];

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

  if (
    !PROGRAMME_DELETE_ROLES.includes(
      session.role,
    )
  ) {
    return Response.json(
      {
        error:
          "You do not have permission to delete programmes",
      },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;

    await ensureAcademicSchema();

    const [programme] = await db
      .select({ id: programmes.id })
      .from(programmes)
      .where(
        and(
          eq(programmes.id, id),
          eq(
            programmes.instituteId,
            instituteId,
          ),
        ),
      )
      .limit(1);

    if (!programme) {
      return Response.json(
        { error: "Programme not found" },
        { status: 404 },
      );
    }

    await db.transaction(async (tx) => {
      const batchRows = await tx
        .select({ id: batches.id })
        .from(batches)
        .where(
          and(
            eq(
              batches.programmeId,
              id,
            ),
            eq(
              batches.instituteId,
              instituteId,
            ),
          ),
        );

      const batchIds = batchRows.map(
        (row) => row.id,
      );

      const examRows = await tx
        .select({ id: exams.id })
        .from(exams)
        .where(
          and(
            eq(
              exams.instituteId,
              instituteId,
            ),
            eq(
              exams.programmeId,
              id,
            ),
          ),
        );

      const examIds = examRows.map(
        (row) => row.id,
      );

      if (batchIds.length > 0) {
        const batchExamRows = await tx
          .select({ id: exams.id })
          .from(exams)
          .where(
            and(
              eq(
                exams.instituteId,
                instituteId,
              ),
              inArray(
                exams.batchId,
                batchIds,
              ),
            ),
          );

        for (const row of batchExamRows) {
          if (!examIds.includes(row.id)) {
            examIds.push(row.id);
          }
        }
      }

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

      if (batchIds.length > 0) {
        await tx
          .delete(homework)
          .where(
            and(
              eq(
                homework.instituteId,
                instituteId,
              ),
              inArray(
                homework.batchId,
                batchIds,
              ),
            ),
          );

        await tx
          .delete(assignments)
          .where(
            and(
              eq(
                assignments.instituteId,
                instituteId,
              ),
              inArray(
                assignments.batchId,
                batchIds,
              ),
            ),
          );

        await tx
          .delete(routines)
          .where(
            and(
              eq(
                routines.instituteId,
                instituteId,
              ),
              inArray(
                routines.batchId,
                batchIds,
              ),
            ),
          );

        await tx
          .delete(attendance)
          .where(
            and(
              eq(
                attendance.instituteId,
                instituteId,
              ),
              inArray(
                attendance.batchId,
                batchIds,
              ),
            ),
          );

        await tx
          .delete(enrollments)
          .where(
            and(
              eq(
                enrollments.instituteId,
                instituteId,
              ),
              inArray(
                enrollments.batchId,
                batchIds,
              ),
            ),
          );

        await tx
          .delete(batches)
          .where(
            and(
              eq(
                batches.instituteId,
                instituteId,
              ),
              inArray(
                batches.id,
                batchIds,
              ),
            ),
          );
      }

      await tx
        .delete(programmeSemesters)
        .where(
          and(
            eq(
              programmeSemesters.programmeId,
              id,
            ),
            eq(
              programmeSemesters.instituteId,
              instituteId,
            ),
          ),
        );

      await tx
        .delete(programmes)
        .where(
          and(
            eq(programmes.id, id),
            eq(
              programmes.instituteId,
              instituteId,
            ),
          ),
        );
    });

    return Response.json({
      success: true,
      deletedProgrammeId: id,
    });
  } catch (error) {
    console.error(
      "Programme DELETE error:",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to delete programme",
      },
      { status: 500 },
    );
  }
}
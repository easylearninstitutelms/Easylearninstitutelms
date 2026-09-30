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
import { and, eq, inArray, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

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

      const semesterRows = await tx
        .select({ id: programmeSemesters.id })
        .from(programmeSemesters)
        .where(
          and(
            eq(programmeSemesters.programmeId, id),
            eq(programmeSemesters.instituteId, instituteId),
          ),
        );

      const semesterIds = semesterRows.map((row) => row.id);

      if (semesterIds.length > 0) {
        await tx.execute(sql`
          DELETE FROM homework
          WHERE institute_id = ${instituteId}
            AND (
              programme_id = ${id}
              OR semester_id IN (${sql.join(
                semesterIds.map((semesterId) => sql`${semesterId}`),
                sql`, `,
              )})
            )
        `);
      }

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
          .update(batches)
          .set({
            programmeId: null,
            semesterId: null,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(batches.instituteId, instituteId),
              inArray(batches.id, batchIds),
            ),
          );

        await tx.execute(sql`
          DELETE FROM homework
          WHERE institute_id = ${instituteId}
            AND batch_id IN (${sql.join(
              batchIds.map((batchId) => sql`${batchId}`),
              sql`, `,
            )})
        `);

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

      // Clean up every live foreign-key reference to programme_semesters.
      // The production database can differ from the current Drizzle schema, so
      // inspect the actual PostgreSQL constraints before removing semesters.
      const semesterForeignKeys = await tx.execute(sql`
        SELECT
          child_ns.nspname AS child_schema,
          child_tbl.relname AS child_table,
          child_col.attname AS child_column,
          child_col.attnotnull AS child_not_null,
          fk.confdeltype AS delete_action,
          array_length(fk.conkey, 1) AS column_count
        FROM pg_constraint fk
        JOIN pg_class child_tbl
          ON child_tbl.oid = fk.conrelid
        JOIN pg_namespace child_ns
          ON child_ns.oid = child_tbl.relnamespace
        JOIN pg_attribute child_col
          ON child_col.attrelid = fk.conrelid
         AND child_col.attnum = fk.conkey[1]
        WHERE fk.contype = 'f'
          AND fk.confrelid = 'public.programme_semesters'::regclass
          AND array_length(fk.conkey, 1) = 1
          AND array_length(fk.confkey, 1) = 1
          AND child_ns.nspname = 'public'
      `);

      for (const foreignKey of semesterForeignKeys.rows as Array<{
        child_schema: string;
        child_table: string;
        child_column: string;
        child_not_null: boolean;
        delete_action: string;
        column_count: number;
      }>) {
        // PostgreSQL handles CASCADE / SET NULL itself.
        if (
          foreignKey.delete_action === "c" ||
          foreignKey.delete_action === "n"
        ) {
          continue;
        }

        const qualifiedTable =
          `"${foreignKey.child_schema.replace(/"/g, '""')}"."${foreignKey.child_table.replace(/"/g, '""')}"`;
        const quotedColumn =
          `"${foreignKey.child_column.replace(/"/g, '""')}"`;

        if (foreignKey.child_not_null) {
          await tx.execute(sql.raw(`
            DELETE FROM ${qualifiedTable}
            WHERE ${quotedColumn} IN (
              SELECT id
              FROM public.programme_semesters
              WHERE programme_id = '${id.replace(/'/g, "''")}'
                AND institute_id = '${instituteId.replace(/'/g, "''")}'
            )
          `));
        } else {
          await tx.execute(sql.raw(`
            UPDATE ${qualifiedTable}
            SET ${quotedColumn} = NULL
            WHERE ${quotedColumn} IN (
              SELECT id
              FROM public.programme_semesters
              WHERE programme_id = '${id.replace(/'/g, "''")}'
                AND institute_id = '${instituteId.replace(/'/g, "''")}'
            )
          `));
        }
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
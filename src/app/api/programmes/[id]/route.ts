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

      // Clean up every live foreign-key reference to these semester rows.
      // Production may contain composite foreign keys that are not represented
      // in the current Drizzle schema, so handle both single and composite FKs.
      if (semesterIds.length > 0) {
        const fkResult = await tx.execute(sql`
          SELECT
            n.nspname AS child_schema,
            c.relname AS child_table,
            con.confdeltype AS delete_action,
            ARRAY(
              SELECT ca.attname
              FROM unnest(con.conkey) WITH ORDINALITY AS ck(attnum, ord)
              JOIN pg_attribute ca
                ON ca.attrelid = con.conrelid
               AND ca.attnum = ck.attnum
              ORDER BY ck.ord
            ) AS child_columns,
            ARRAY(
              SELECT pa.attname
              FROM unnest(con.confkey) WITH ORDINALITY AS pk(attnum, ord)
              JOIN pg_attribute pa
                ON pa.attrelid = con.confrelid
               AND pa.attnum = pk.attnum
              ORDER BY pk.ord
            ) AS parent_columns
          FROM pg_constraint con
          JOIN pg_class c ON c.oid = con.conrelid
          JOIN pg_namespace n ON n.oid = c.relnamespace
          WHERE con.contype = 'f'
            AND con.confrelid = 'public.programme_semesters'::regclass
            AND n.nspname = 'public'
            AND con.confdeltype NOT IN ('c', 'n')
        `);

        const foreignKeys = Array.isArray(fkResult)
          ? fkResult
          : Array.isArray((fkResult as { rows?: unknown[] }).rows)
            ? (fkResult as { rows: unknown[] }).rows
            : [];

        for (const fk of foreignKeys as Array<{
          child_schema: string;
          child_table: string;
          child_columns: string[];
          parent_columns: string[];
        }>) {
          if (
            !Array.isArray(fk.child_columns) ||
            !Array.isArray(fk.parent_columns) ||
            fk.child_columns.length === 0 ||
            fk.child_columns.length !== fk.parent_columns.length
          ) {
            continue;
          }

          const childTable = `"${fk.child_schema.replace(/"/g, '""')}"."${fk.child_table.replace(/"/g, '""')}"`;
          const joinConditions = fk.child_columns
            .map(
              (childColumn, index) =>
                `child."${childColumn.replace(/"/g, '""')}" = parent."${fk.parent_columns[index].replace(/"/g, '""')}"`,
            )
            .join(" AND ");
          const semesterList = semesterIds
            .map((semesterId) => `'${semesterId.replace(/'/g, "''")}'`)
            .join(", ");

          await tx.execute(
            sql.raw(`
              DELETE FROM ${childTable} AS child
              USING public.programme_semesters AS parent
              WHERE ${joinConditions}
                AND parent.id IN (${semesterList})
            `),
          );
        }
      }

      await tx
        .delete(programmeSemesters)
        .where(
          and(
            eq(programmeSemesters.programmeId, id),
            eq(programmeSemesters.instituteId, instituteId),
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
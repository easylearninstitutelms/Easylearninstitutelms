import { db } from "@/db";
import { students, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  getSession,
  requireRoles,
} from "@/lib/session";

const STUDENT_HARD_DELETE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
];

export async function DELETE(
  _request: Request,
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
    STUDENT_HARD_DELETE_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  const { id } = await params;
  const instituteId = session.instituteId;

  try {
    const result = await db.transaction(async (tx) => {
      const [student] = await tx
        .select({
          id: students.id,
          userId: students.userId,
          name: students.name,
          studentId: students.studentId,
        })
        .from(students)
        .where(
          and(
            eq(students.id, id),
            eq(students.instituteId, instituteId),
          ),
        )
        .limit(1);

      if (!student) {
        return null;
      }

      // Dependent student records cascade from students.id.
      await tx
        .delete(students)
        .where(
          and(
            eq(students.id, id),
            eq(students.instituteId, instituteId),
          ),
        );

      // Keep the login record for audit/history, but disable it.
      if (student.userId) {
        await tx
          .update(users)
          .set({
            status: "INACTIVE",
            updatedAt: new Date(),
          })
          .where(
            eq(users.id, student.userId),
          );
      }

      return student;
    });

    if (!result) {
      return Response.json(
        { error: "Student not found" },
        { status: 404 },
      );
    }

    return Response.json({
      success: true,
      student: result,
      loginDisabled: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/students/[id]/hard-delete error:",
      error,
    );

    return Response.json(
      {
        error: "Failed to permanently delete student",
      },
      { status: 500 },
    );
  }
}

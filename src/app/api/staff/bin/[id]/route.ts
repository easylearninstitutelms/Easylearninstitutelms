import { db } from "@/db";
import { staff, users, batches, routines, homework, assignments, salaries } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureStaffSchema } from "@/lib/staff";

const ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER"];

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissionError = requireRoles(session, ROLES);
  if (permissionError) return permissionError;

  await ensureStaffSchema();
  const { id } = await params;

  const [member] = await db.select().from(staff)
    .where(and(
      eq(staff.id, id),
      eq(staff.instituteId, session.instituteId),
      )
    )
    .limit(1);

  if (!member || !member.deletedAt) {
    return Response.json({ error: "Staff member not found in bin" }, { status: 404 });
  }

  try {
    await db.transaction(async (tx) => {
      // Clear nullable teacher references before removing the staff profile.
      await tx.update(batches)
        .set({ teacherId: null })
        .where(and(eq(batches.teacherId, id), eq(batches.instituteId, session.instituteId)));

      await tx.update(routines)
        .set({ teacherId: null })
        .where(and(eq(routines.teacherId, id), eq(routines.instituteId, session.instituteId)));

      await tx.update(homework)
        .set({ teacherId: null })
        .where(and(eq(homework.teacherId, id), eq(homework.instituteId, session.instituteId)));

      await tx.update(assignments)
        .set({ teacherId: null })
        .where(and(eq(assignments.teacherId, id), eq(assignments.instituteId, session.instituteId)));

      await tx.delete(salaries)
        .where(and(eq(salaries.staffId, id), eq(salaries.instituteId, session.instituteId)));

      await tx.delete(staff)
        .where(and(
          eq(staff.id, id),
          eq(staff.instituteId, session.instituteId),
        ));

      if (member.userId) {
        await tx.update(users)
          .set({ status: "INACTIVE", updatedAt: new Date() })
          .where(and(
            eq(users.id, member.userId),
            eq(users.instituteId, session.instituteId),
          ));
      }
    });
  } catch (error) {
    console.error("Permanent staff delete error:", error);
    return Response.json(
      {
        error:
          "This staff member cannot be permanently deleted because other records still reference the staff profile. Restore it or remove those references first.",
      },
      { status: 409 }
    );
  }

  return Response.json({ success: true });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession();
  if (!session?.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissionError = requireRoles(session, ROLES);
  if (permissionError) return permissionError;

  await ensureStaffSchema();
  const { id } = await params;

  const [member] = await db.select().from(staff)
    .where(and(
      eq(staff.id, id),
      eq(staff.instituteId, session.instituteId),
    ))
    .limit(1);

  if (!member || !member.deletedAt) {
    return Response.json({ error: "Staff member not found in bin" }, { status: 404 });
  }

  const [updated] = await db.update(staff)
    .set({ deletedAt: null, status: "ACTIVE", updatedAt: new Date() })
    .where(and(eq(staff.id, id), eq(staff.instituteId, session.instituteId)))
    .returning();

  if (member.userId) {
    await db.update(users)
      .set({ status: "ACTIVE", updatedAt: new Date() })
      .where(and(eq(users.id, member.userId), eq(users.instituteId, session.instituteId)));
  }

  return Response.json({ success: true, staff: updated });
}

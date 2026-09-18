import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureStaffSchema } from "@/lib/staff";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  await ensureStaffSchema();
  const { id } = await params;
  const [member] = await db.select().from(staff)
    .where(and(eq(staff.id, id), eq(staff.instituteId, session.instituteId))).limit(1);
  if (!member) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ staff: member });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissionError = requireRoles(session, ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER"]);
  if (permissionError) return permissionError;
  await ensureStaffSchema();
  const { id } = await params;
  const body = await request.json();
  const [updated] = await db.update(staff).set({ ...body, updatedAt: new Date() })
    .where(and(eq(staff.id, id), eq(staff.instituteId, session.instituteId))).returning();
  return Response.json({ staff: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissionError = requireRoles(session, ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER"]);
  if (permissionError) return permissionError;
  await ensureStaffSchema();
  const { id } = await params;
  const [updated] = await db.update(staff).set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(staff.id, id), eq(staff.instituteId, session.instituteId))).returning();
  if (!updated) return Response.json({ error: "Staff member not found" }, { status: 404 });
  return Response.json({ success: true, staff: updated });
}

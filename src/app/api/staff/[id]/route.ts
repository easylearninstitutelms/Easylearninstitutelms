import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [member] = await db.select().from(staff)
    .where(and(eq(staff.id, id), eq(staff.instituteId, session.instituteId))).limit(1);
  if (!member) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ staff: member });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const [updated] = await db.update(staff).set({ ...body, updatedAt: new Date() })
    .where(and(eq(staff.id, id), eq(staff.instituteId, session.instituteId))).returning();
  return Response.json({ staff: updated });
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "INSTITUTE_ADMIN" && session.role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const [updated] = await db.update(staff).set({ status: "ARCHIVED", updatedAt: new Date() })
    .where(and(eq(staff.id, id), eq(staff.instituteId, session.instituteId))).returning();
  return Response.json({ staff: updated });
}

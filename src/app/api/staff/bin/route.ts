import { db } from "@/db";
import { staff } from "@/db/schema";
import { and, desc, eq, isNotNull, like, or } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureStaffSchema } from "@/lib/staff";

const ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER"];

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissionError = requireRoles(session, ROLES);
  if (permissionError) return permissionError;

  await ensureStaffSchema();
  const search = new URL(request.url).searchParams.get("search")?.trim() || "";
  const conditions = [
    eq(staff.instituteId, session.instituteId),
    isNotNull(staff.deletedAt),
  ];

  if (search) {
    conditions.push(or(
      like(staff.name, `%${search}%`),
      like(staff.phone, `%${search}%`),
      like(staff.email, `%${search}%`),
      like(staff.designation, `%${search}%`)
    )!);
  }

  const rows = await db.select().from(staff)
    .where(and(...conditions))
    .orderBy(desc(staff.updatedAt));

  return Response.json({ staff: rows });
}

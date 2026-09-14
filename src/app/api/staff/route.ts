import { db } from "@/db";
import { staff } from "@/db/schema";
import { eq, and, like, or, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const conditions = [eq(staff.instituteId, session.instituteId)];
  if (status && status !== "ALL") {
    conditions.push(eq(staff.status, status as "ACTIVE" | "INACTIVE" | "ARCHIVED"));
  }
  if (search) {
    conditions.push(
      or(like(staff.name, `%${search}%`), like(staff.phone, `%${search}%`))!
    );
  }

  const rows = await db
    .select()
    .from(staff)
    .where(and(...conditions))
    .orderBy(desc(staff.createdAt));

  return Response.json({ staff: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (session.role !== "INSTITUTE_ADMIN" && session.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { name, phone, email, designation, joiningDate, salary, address } = body;

  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const [member] = await db
    .insert(staff)
    .values({
      instituteId: session.instituteId,
      name,
      phone: phone || null,
      email: email || null,
      designation: designation || null,
      joiningDate: joiningDate || null,
      salary: salary || null,
      status: "ACTIVE",
    })
    .returning();

  return Response.json({ staff: member });
}

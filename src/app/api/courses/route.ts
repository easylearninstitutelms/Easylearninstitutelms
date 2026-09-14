import { db } from "@/db";
import { courses } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await db.select().from(courses)
    .where(eq(courses.instituteId, session.instituteId))
    .orderBy(desc(courses.createdAt));
  return Response.json({ courses: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "INSTITUTE_ADMIN" && session.role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json();
  const { name, description, duration, fee } = body;
  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });
  const [course] = await db.insert(courses).values({
    instituteId: session.instituteId,
    name, description: description || null,
    duration: duration || null,
    fee: fee || null,
    status: "ACTIVE",
  }).returning();
  return Response.json({ course });
}

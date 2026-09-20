import { db } from "@/db";
import { enquiries, courses, batches } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  const conditions = [eq(enquiries.instituteId, session.instituteId)];
  if (status && status !== "ALL") {
    conditions.push(eq(enquiries.status, status as "NEW" | "CONTACTED" | "INTERESTED" | "ADMITTED" | "NOT_INTERESTED" | "LOST"));
  }

  const rows = await db
    .select({
      enquiry: enquiries,
      courseName: courses.name,
    })
    .from(enquiries)
    .leftJoin(courses, eq(enquiries.courseId, courses.id))
    .where(and(...conditions))
    .orderBy(desc(enquiries.createdAt));

  return Response.json({ enquiries: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { name, phone, courseId, batchId, source, notes, followUpDate } = body;

  if (!name) return Response.json({ error: "Name is required" }, { status: 400 });

  const [enquiry] = await db.insert(enquiries).values({
    instituteId: session.instituteId,
    name,
    phone: phone || null,
    courseId: courseId || null,
    batchId: batchId || null,
    source: source || null,
    notes: notes || null,
    followUpDate: followUpDate || null,
    status: "NEW",
  }).returning();

  return Response.json({ enquiry });
}

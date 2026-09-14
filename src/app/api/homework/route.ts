import { db } from "@/db";
import { homework, batches, staff } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");

  const conditions = [eq(homework.instituteId, session.instituteId)];
  if (batchId) conditions.push(eq(homework.batchId, batchId));

  const rows = await db
    .select({
      homework: homework,
      batchName: batches.name,
      teacherName: staff.name,
    })
    .from(homework)
    .leftJoin(batches, eq(homework.batchId, batches.id))
    .leftJoin(staff, eq(homework.teacherId, staff.id))
    .where(and(...conditions))
    .orderBy(desc(homework.createdAt));

  return Response.json({ homework: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { batchId, teacherId, title, description, deadline } = body;

  if (!batchId || !title) return Response.json({ error: "Batch and title required" }, { status: 400 });

  const [hw] = await db.insert(homework).values({
    instituteId: session.instituteId,
    batchId,
    teacherId: teacherId || null,
    title,
    description: description || null,
    deadline: deadline || null,
  }).returning();

  return Response.json({ homework: hw });
}

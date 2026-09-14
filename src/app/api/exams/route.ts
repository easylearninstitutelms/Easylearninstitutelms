import { db } from "@/db";
import { exams, examSubjects, results, students, batches } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");

  const conditions = [eq(exams.instituteId, session.instituteId)];
  if (batchId) conditions.push(eq(exams.batchId, batchId));

  const rows = await db
    .select({
      exam: exams,
      batchName: batches.name,
    })
    .from(exams)
    .leftJoin(batches, eq(exams.batchId, batches.id))
    .where(and(...conditions))
    .orderBy(desc(exams.createdAt));

  return Response.json({ exams: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { batchId, name, examDate, subjects } = body;

  if (!batchId || !name) return Response.json({ error: "Batch and name required" }, { status: 400 });

  const [exam] = await db.insert(exams).values({
    instituteId: session.instituteId,
    batchId,
    name,
    examDate: examDate || null,
  }).returning();

  if (subjects && subjects.length > 0) {
    await db.insert(examSubjects).values(
      subjects.map((s: { subjectName: string; totalMarks: number }) => ({
        instituteId: session.instituteId!,
        examId: exam.id,
        subjectName: s.subjectName,
        totalMarks: s.totalMarks,
      }))
    );
  }

  return Response.json({ exam });
}

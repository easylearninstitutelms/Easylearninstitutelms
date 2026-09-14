import { db } from "@/db";
import { attendance, students, batches } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const batchId = searchParams.get("batchId");
  const date = searchParams.get("date");
  const studentId = searchParams.get("studentId");

  const conditions = [eq(attendance.instituteId, session.instituteId)];
  if (batchId) conditions.push(eq(attendance.batchId, batchId));
  if (date) conditions.push(eq(attendance.date, date));
  if (studentId) conditions.push(eq(attendance.studentId, studentId));

  const rows = await db
    .select({
      attendance: attendance,
      studentName: students.name,
      studentId: students.studentId,
    })
    .from(attendance)
    .leftJoin(students, eq(attendance.studentId, students.id))
    .where(and(...conditions))
    .orderBy(desc(attendance.date));

  return Response.json({ attendance: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { records } = body; // Array of { studentId, batchId, date, status, note }

  if (!records || !Array.isArray(records)) {
    return Response.json({ error: "Records array required" }, { status: 400 });
  }

  const values = records.map((r: {
    studentId: string;
    batchId: string;
    date: string;
    status: string;
    note?: string;
  }) => ({
    instituteId: session.instituteId!,
    studentId: r.studentId,
    batchId: r.batchId,
    date: r.date,
    status: r.status as "PRESENT" | "ABSENT" | "LATE" | "LEAVE",
    recordedBy: session.userId,
    note: r.note || null,
  }));

  const inserted = await db
    .insert(attendance)
    .values(values)
    .onConflictDoUpdate({
      target: [attendance.studentId, attendance.batchId, attendance.date],
      set: {
        status: sql`EXCLUDED.status`,
        note: sql`EXCLUDED.note`,
      },
    })
    .returning();

  return Response.json({ attendance: inserted });
}

import { db } from "@/db";
import { students, enrollments, batches, courses } from "@/db/schema";
import { eq, and, like, or, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { generateStudentId } from "@/lib/utils";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";
  const page = parseInt(searchParams.get("page") || "1");
  const limit = parseInt(searchParams.get("limit") || "20");
  const offset = (page - 1) * limit;

  const conditions = [eq(students.instituteId, session.instituteId)];
  if (status && status !== "ALL") {
    conditions.push(eq(students.status, status as "ACTIVE" | "INACTIVE" | "ARCHIVED"));
  }
  if (search) {
    conditions.push(
      or(
        like(students.name, `%${search}%`),
        like(students.studentId, `%${search}%`),
        like(students.phone, `%${search}%`)
      )!
    );
  }

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(students)
    .where(and(...conditions));

  const rows = await db
    .select()
    .from(students)
    .where(and(...conditions))
    .orderBy(desc(students.createdAt))
    .limit(limit)
    .offset(offset);

  return Response.json({ students: rows, total, page, limit });
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
  const {
    name, phone, guardianName, guardianPhone, address, dob, gender,
    admissionDate, batchId,
  } = body;

  if (!name || !admissionDate) {
    return Response.json({ error: "Name and admission date required" }, { status: 400 });
  }

  const studentId = generateStudentId();

  const [student] = await db
    .insert(students)
    .values({
      instituteId: session.instituteId,
      studentId,
      name,
      phone: phone || null,
      guardianName: guardianName || null,
      guardianPhone: guardianPhone || null,
      address: address || null,
      dob: dob || null,
      gender: gender || null,
      admissionDate,
      status: "ACTIVE",
    })
    .returning();

  if (batchId) {
    await db.insert(enrollments).values({
      instituteId: session.instituteId,
      studentId: student.id,
      batchId,
      enrollmentDate: admissionDate,
      status: "ACTIVE",
    });
  }

  return Response.json({ student });
}

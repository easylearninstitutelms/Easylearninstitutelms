import { db } from "@/db";
import { students, institutes } from "@/db/schema";
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
  const limit = parseInt(searchParams.get("limit") || "100");
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

  const [inst] = await db
    .select()
    .from(institutes)
    .where(eq(institutes.id, session.instituteId))
    .limit(1);

  // শিক্ষার্থীদের কোর্স/প্রোগ্রাম ও সেমিস্টার তথ্য রিড করা
  const rows = await db
    .select({
      id: students.id,
      studentId: students.studentId,
      name: students.name,
      phone: students.phone,
      guardianName: students.guardianName,
      guardianPhone: students.guardianPhone,
      gender: students.gender,
      admissionDate: students.admissionDate,
      status: students.status,
      currentSemester: sql<number>`COALESCE(public.students.current_semester, 1)`,
      enrolledTrack: sql<string>`COALESCE(
        (SELECT c.name FROM enrollments e JOIN batches b ON e.batch_id = b.id JOIN courses c ON b.course_id = c.id WHERE e.student_id = students.id LIMIT 1),
        'Web Design With AI'
      )`,
      trackType: sql<string>`CASE WHEN public.students.programme_id IS NOT NULL THEN 'PROGRAMME' ELSE 'COURSE' END`,
    })
    .from(students)
    .where(and(...conditions))
    .orderBy(desc(students.createdAt))
    .limit(limit)
    .offset(offset);

  return Response.json({
    students: rows,
    total,
    institute: {
      name: inst?.name || "Easylearn Institute",
      address: inst?.address || "Gazipur / Dhaka, Bangladesh",
      phone: inst?.phone || "01345064696",
    },
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { name, phone, guardianName, guardianPhone, address, dob, gender, admissionDate } = body;

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

  return Response.json({ student });
}
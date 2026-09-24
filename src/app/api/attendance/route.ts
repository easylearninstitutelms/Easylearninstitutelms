import { db } from "@/db";
import { attendance, students, enrollments } from "@/db/schema";
import { eq, and, desc, sql, inArray } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureAcademicCoreSchema } from "@/lib/academic";

const ROLES = ["SUPER_ADMIN", "INSTITUTE_ADMIN", "MANAGER", "TEACHER"];
const MAX_BULK_ATTENDANCE = 200;

type Target = { courseId: string | null; programmeId: string | null; semesterId: string | null };

function targetFromParams(params: URLSearchParams): Target {
  const courseId = params.get("courseId");
  const programmeId = params.get("programmeId");
  const semesterId = params.get("semesterId");
  if (courseId) return { courseId, programmeId: null, semesterId: null };
  if (programmeId && semesterId) return { courseId: null, programmeId, semesterId };
  return { courseId: null, programmeId: null, semesterId: null };
}

async function validateClassTarget(classId: string, classType: string, instituteId: string, target: Target) {
  if (classType === "COURSE") {
    const r = await db.execute(sql`
      SELECT id FROM course_syllabus_classes
      WHERE id = ${classId} AND institute_id = ${instituteId} AND course_id = ${target.courseId}
      LIMIT 1
    `);
    return r.rows?.length > 0;
  }
  const r = await db.execute(sql`
    SELECT id FROM programme_syllabus_classes
    WHERE id = ${classId} AND institute_id = ${instituteId}
      AND programme_id = ${target.programmeId} AND semester_id = ${target.semesterId}
    LIMIT 1
  `);
  return r.rows?.length > 0;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissionError = requireRoles(session, ROLES);
  if (permissionError) return permissionError;

  try {
    await ensureAcademicCoreSchema();
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const studentId = searchParams.get("studentId");
    const classId = searchParams.get("classId");
    const month = searchParams.get("month");
    const target = targetFromParams(searchParams);

    const conditions = [
      eq(attendance.instituteId, session.instituteId),
    ];

    if (target.courseId) conditions.push(eq(attendance.courseId, target.courseId));
    if (target.programmeId) conditions.push(eq(attendance.programmeId, target.programmeId));
    if (target.semesterId) conditions.push(eq(attendance.semesterId, target.semesterId));
    if (classId) conditions.push(eq(attendance.classId, classId));
    if (date) conditions.push(eq(attendance.date, date));
    if (studentId) conditions.push(eq(attendance.studentId, studentId));

    if (month) {
      const [year, monthNumber] = month.split("-").map(Number);
      const nextMonthDate = new Date(year, monthNumber, 1);
      const monthEnd = `${nextMonthDate.getFullYear()}-${String(nextMonthDate.getMonth() + 1).padStart(2, "0")}-01`;
      const rows = await db.select({
        attendance,
        studentName: students.name,
        studentId: students.studentId,
      }).from(attendance)
        .leftJoin(students, eq(attendance.studentId, students.id))
        .where(and(...conditions, sql`${attendance.date} >= ${month + "-01"}`, sql`${attendance.date} < ${monthEnd}`))
        .orderBy(attendance.date);

      const grouped = new Map<string, { studentId: string; studentName: string; present: number; absent: number; late: number; EXCUSED: number; total: number }>();
      for (const row of rows) {
        const key = row.attendance.studentId;
        if (!grouped.has(key)) grouped.set(key, { studentId: key, studentName: row.studentName || "Unknown Student", present: 0, absent: 0, late: 0, EXCUSED: 0, total: 0 });
        const s = grouped.get(key)!;
        s.total++;
        if (row.attendance.status === "PRESENT") s.present++;
        else if (row.attendance.status === "ABSENT") s.absent++;
        else if (row.attendance.status === "LATE") s.late++;
        else s.EXCUSED++;
      }
      const report = Array.from(grouped.values()).map((s) => ({ ...s, percentage: s.total ? Math.round(((s.present + s.late) / s.total) * 100) : 0 }));
      const summary = report.reduce((a, s) => ({ present: a.present + s.present, absent: a.absent + s.absent, late: a.late + s.late, EXCUSED: a.EXCUSED + s.EXCUSED, total: a.total + s.total }), { present: 0, absent: 0, late: 0, EXCUSED: 0, total: 0 });
      return Response.json({ report, summary: { ...summary, percentage: summary.total ? Math.round(((summary.present + summary.late) / summary.total) * 100) : 0 }, month, courseId: target.courseId, programmeId: target.programmeId, semesterId: target.semesterId });
    }

    const result = await db.select({
      attendance,
      studentName: students.name,
      studentId: students.studentId,
    }).from(attendance)
      .leftJoin(students, eq(attendance.studentId, students.id))
      .where(and(...conditions))
      .orderBy(desc(attendance.date));

    return Response.json({ attendance: result });
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return Response.json({ error: "Failed to load attendance" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session?.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const permissionError = requireRoles(session, ROLES);
  if (permissionError) return permissionError;

  try {
    await ensureAcademicCoreSchema();
    const body = await request.json();
    const records = body?.records;

    if (!Array.isArray(records) || records.length === 0) return Response.json({ error: "At least one attendance record is required" }, { status: 400 });
    if (records.length > MAX_BULK_ATTENDANCE) return Response.json({ error: `Maximum ${MAX_BULK_ATTENDANCE} attendance records can be submitted at once` }, { status: 400 });

    const values = [];
    for (const record of records) {
      const isCourse = record?.classType === "COURSE";
      const isProgramme = record?.classType === "PROGRAMME";
      if (!record?.studentId || !record?.classId || !record?.date || !record?.status) return Response.json({ error: "studentId, classId, date and status are required" }, { status: 400 });
      if (!["PRESENT", "ABSENT", "LATE", "EXCUSED", "LEAVE"].includes(record.status)) return Response.json({ error: "Invalid attendance status" }, { status: 400 });

      const target: Target = isCourse
        ? { courseId: record.courseId || null, programmeId: null, semesterId: null }
        : { courseId: null, programmeId: record.programmeId || null, semesterId: record.semesterId || null };

      if (isCourse ? !target.courseId : !target.programmeId || !target.semesterId) return Response.json({ error: "A valid Course or Programme + Semester target is required" }, { status: 400 });
      if (!await validateClassTarget(record.classId, record.classType, session.instituteId, target)) return Response.json({ error: "Invalid class for the selected Course or Programme + Semester" }, { status: 400 });

      const enrollmentWhere = isCourse
        ? sql`e.student_id = ${record.studentId} AND e.course_id = ${target.courseId}`
        : sql`e.student_id = ${record.studentId} AND e.programme_id = ${target.programmeId} AND e.semester_id = ${target.semesterId}`;

      const enrollmentResult = await db.execute(sql`
        SELECT e.id FROM enrollments e
        WHERE e.institute_id = ${session.instituteId}
          AND e.status = 'ACTIVE'
          AND ${enrollmentWhere}
        LIMIT 1
      `);
      if (!enrollmentResult.rows?.length) return Response.json({ error: "Student is not actively enrolled in the selected Course or Programme + Semester" }, { status: 400 });

      values.push({
        instituteId: session.instituteId,
        studentId: record.studentId,
        batchId: null,
        courseId: target.courseId,
        programmeId: target.programmeId,
        semesterId: target.semesterId,
        classId: record.classId,
        classType: record.classType,
        date: record.date,
        status: record.status,
        recordedBy: session.userId,
        note: record.note || null,
      });
    }

    const inserted = await db.insert(attendance).values(values as any).onConflictDoUpdate({
      target: [attendance.studentId, attendance.courseId, attendance.programmeId, attendance.semesterId, attendance.date, attendance.classId],
      set: { status: sql`EXCLUDED.status`, note: sql`EXCLUDED.note` },
    }).returning();

    return Response.json({ attendance: inserted });
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return Response.json({ error: "Failed to save attendance" }, { status: 500 });
  }
}

import { db } from "@/db";
import { attendance, students, batches } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);

  const batchId = searchParams.get("batchId");
  const date = searchParams.get("date");
  const studentId = searchParams.get("studentId");
  const month = searchParams.get("month");

  // =========================================================
  // MONTHLY ATTENDANCE REPORT
  // =========================================================

  if (month && batchId) {
    const monthStart = `${month}-01`;

    const [year, monthNumber] = month.split("-").map(Number);

    const nextMonthDate = new Date(year, monthNumber, 1);

    const nextYear = nextMonthDate.getFullYear();
    const nextMonth = String(nextMonthDate.getMonth() + 1).padStart(2, "0");

    const monthEnd = `${nextYear}-${nextMonth}-01`;

    const rows = await db
      .select({
        attendance: attendance,
        studentName: students.name,
        studentId: students.studentId,
      })
      .from(attendance)
      .leftJoin(students, eq(attendance.studentId, students.id))
      .where(
        and(
          eq(attendance.instituteId, session.instituteId),
          eq(attendance.batchId, batchId),
          sql`${attendance.date} >= ${monthStart}`,
          sql`${attendance.date} < ${monthEnd}`
        )
      )
      .orderBy(attendance.date);

    // Group attendance by student
    const grouped = new Map<
      string,
      {
        studentId: string;
        studentName: string;
        present: number;
        absent: number;
        late: number;
        leave: number;
        total: number;
      }
    >();

    for (const row of rows) {
      const key = row.attendance.studentId;

      if (!grouped.has(key)) {
        grouped.set(key, {
          studentId: row.attendance.studentId,
          studentName: row.studentName || "Unknown Student",
          present: 0,
          absent: 0,
          late: 0,
          leave: 0,
          total: 0,
        });
      }

      const student = grouped.get(key)!;

      student.total += 1;

      switch (row.attendance.status) {
        case "PRESENT":
          student.present += 1;
          break;

        case "ABSENT":
          student.absent += 1;
          break;

        case "LATE":
          student.late += 1;
          break;

        case "LEAVE":
          student.leave += 1;
          break;
      }
    }

    // Create report with percentage
    const report = Array.from(grouped.values()).map((student) => {
      const attended = student.present + student.late;

      const percentage =
        student.total > 0
          ? Math.round((attended / student.total) * 100)
          : 0;

      return {
        ...student,
        percentage,
      };
    });

    // Overall monthly summary
    const summary = report.reduce(
      (acc, student) => {
        acc.present += student.present;
        acc.absent += student.absent;
        acc.late += student.late;
        acc.leave += student.leave;
        acc.total += student.total;

        return acc;
      },
      {
        present: 0,
        absent: 0,
        late: 0,
        leave: 0,
        total: 0,
      }
    );

    const attended = summary.present + summary.late;

    const percentage =
      summary.total > 0
        ? Math.round((attended / summary.total) * 100)
        : 0;

    return Response.json({
      report,
      summary: {
        ...summary,
        percentage,
      },
      month,
      batchId,
    });
  }

  // =========================================================
  // DAILY ATTENDANCE
  // =========================================================

  const conditions = [eq(attendance.instituteId, session.instituteId)];

  if (batchId) {
    conditions.push(eq(attendance.batchId, batchId));
  }

  if (date) {
    conditions.push(eq(attendance.date, date));
  }

  if (studentId) {
    conditions.push(eq(attendance.studentId, studentId));
  }

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

  return Response.json({
    attendance: rows,
  });
}

// =========================================================
// SAVE / UPDATE ATTENDANCE
// =========================================================

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();

  const { records } = body;

  if (!records || !Array.isArray(records)) {
    return Response.json(
      { error: "Records array required" },
      { status: 400 }
    );
  }

  if (records.length === 0) {
    return Response.json(
      { error: "At least one attendance record is required" },
      { status: 400 }
    );
  }

  const values = records.map(
    (r: {
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
      status: r.status as
        | "PRESENT"
        | "ABSENT"
        | "LATE"
        | "LEAVE",
      recordedBy: session.userId,
      note: r.note || null,
    })
  );

  const inserted = await db
    .insert(attendance)
    .values(values)
    .onConflictDoUpdate({
      target: [
        attendance.studentId,
        attendance.batchId,
        attendance.date,
      ],
      set: {
        status: sql`EXCLUDED.status`,
        note: sql`EXCLUDED.note`,
      },
    })
    .returning();

  return Response.json({
    attendance: inserted,
  });
}
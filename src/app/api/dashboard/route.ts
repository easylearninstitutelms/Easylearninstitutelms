import { db } from "@/db";
import {
  students,
  staff,
  batches,
  attendance,
  payments,
  fees,
  expenses,
  subscriptions,
} from "@/db/schema";
import { eq, and, count, sum, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const instituteId = session.instituteId;
  const today = new Date().toISOString().split("T")[0];
  const thisMonth = new Date().toISOString().slice(0, 7);

  // Student count
  const [studentCount] = await db
    .select({ count: count() })
    .from(students)
    .where(and(eq(students.instituteId, instituteId), eq(students.status, "ACTIVE")));

  // Staff count
  const [staffCount] = await db
    .select({ count: count() })
    .from(staff)
    .where(and(eq(staff.instituteId, instituteId), eq(staff.status, "ACTIVE")));

  // Batch count
  const [batchCount] = await db
    .select({ count: count() })
    .from(batches)
    .where(and(eq(batches.instituteId, instituteId), eq(batches.status, "ACTIVE")));

  // Today's attendance
  const [presentToday] = await db
    .select({ count: count() })
    .from(attendance)
    .where(
      and(
        eq(attendance.instituteId, instituteId),
        eq(attendance.date, today),
        eq(attendance.status, "PRESENT")
      )
    );

  const [absentToday] = await db
    .select({ count: count() })
    .from(attendance)
    .where(
      and(
        eq(attendance.instituteId, instituteId),
        eq(attendance.date, today),
        eq(attendance.status, "ABSENT")
      )
    );

  const [lateToday] = await db
    .select({ count: count() })
    .from(attendance)
    .where(
      and(
        eq(attendance.instituteId, instituteId),
        eq(attendance.date, today),
        eq(attendance.status, "LATE")
      )
    );

  // Today's collection
  const [todayCollection] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(
      and(
        eq(payments.instituteId, instituteId),
        sql`DATE(${payments.paidAt}) = ${today}`
      )
    );

  // Monthly collection
  const [monthlyCollection] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(
      and(
        eq(payments.instituteId, instituteId),
        sql`TO_CHAR(${payments.paidAt}, 'YYYY-MM') = ${thisMonth}`
      )
    );

  // Total due
  const [totalDue] = await db
    .select({ total: sum(fees.dueAmount) })
    .from(fees)
    .where(
      and(
        eq(fees.instituteId, instituteId),
        sql`${fees.status} IN ('DUE', 'PARTIAL')`
      )
    );

  // Monthly expenses
  const [monthlyExpenses] = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(
      and(
        eq(expenses.instituteId, instituteId),
        sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM') = ${thisMonth}`
      )
    );

  // Recent payments
  const recentPayments = await db
    .select({
      id: payments.id,
      amount: payments.amount,
      method: payments.method,
      receiptNumber: payments.receiptNumber,
      paidAt: payments.paidAt,
      studentName: students.name,
      studentId: students.studentId,
    })
    .from(payments)
    .leftJoin(students, eq(payments.studentId, students.id))
    .where(eq(payments.instituteId, instituteId))
    .orderBy(sql`${payments.paidAt} DESC`)
    .limit(5);

  // Recent admissions
  const recentAdmissions = await db
    .select()
    .from(students)
    .where(eq(students.instituteId, instituteId))
    .orderBy(sql`${students.createdAt} DESC`)
    .limit(5);

  // Subscription
  const [subscription] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.instituteId, instituteId))
    .orderBy(sql`${subscriptions.createdAt} DESC`)
    .limit(1);

  const monthlyIncome = parseFloat(String(monthlyCollection?.total ?? "0"));
  const monthlyExp = parseFloat(String(monthlyExpenses?.total ?? "0"));

  return Response.json({
    studentCount: studentCount?.count ?? 0,
    staffCount: staffCount?.count ?? 0,
    batchCount: batchCount?.count ?? 0,
    attendance: {
      present: presentToday?.count ?? 0,
      absent: absentToday?.count ?? 0,
      late: lateToday?.count ?? 0,
    },
    todayCollection: parseFloat(String(todayCollection?.total ?? "0")),
    monthlyCollection: monthlyIncome,
    totalDue: parseFloat(String(totalDue?.total ?? "0")),
    monthlyExpenses: monthlyExp,
    profitLoss: monthlyIncome - monthlyExp,
    recentPayments,
    recentAdmissions,
    subscription,
  });
}

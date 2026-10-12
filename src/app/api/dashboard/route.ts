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

  // বাংলাদেশ টাইমজোন (Asia/Dhaka) অনুযায়ী আজকের দিন ও চলতি মাস নির্ধারণ
  const now = new Date();
  const bdDateFormatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Dhaka",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const today = bdDateFormatter.format(now); // "YYYY-MM-DD"
  const thisMonth = today.slice(0, 7); // "YYYY-MM"

  try {
    // ১. স্টুডেন্ট কাউন্ট (সফট-ডিলিট না হওয়া বা ACTIVE সকল ছাত্র)
    const [studentCount] = await db
      .select({ count: count() })
      .from(students)
      .where(
        and(
          eq(students.instituteId, instituteId),
          sql`${students.status} != 'ARCHIVED' OR ${students.status} IS NULL`
        )
      );

    // ২. অ্যাক্টিভ স্টাফ কাউন্ট
    const [staffCount] = await db
      .select({ count: count() })
      .from(staff)
      .where(
        and(
          eq(staff.instituteId, instituteId),
          sql`${staff.status} != 'ARCHIVED' OR ${staff.status} IS NULL`
        )
      );

    // ৩. অ্যাক্টিভ ব্যাচ কাউন্ট
    const [batchCount] = await db
      .select({ count: count() })
      .from(batches)
      .where(
        and(
          eq(batches.instituteId, instituteId),
          sql`${batches.status} != 'ARCHIVED' OR ${batches.status} IS NULL`
        )
      );

    // ৪. আজকের উপস্থিতি
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

    // ৫. আজকের কালেকশন (বাংলাদেশ টাইমজোনে কনভার্ট করে ম্যাচ করা)
    const [todayCollection] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.instituteId, instituteId),
          sql`TO_CHAR(timezone('Asia/Dhaka', ${payments.paidAt}), 'YYYY-MM-DD') = ${today}`
        )
      );

    // ৬. চলতি মাসের কালেকশন
    const [monthlyCollection] = await db
      .select({ total: sum(payments.amount) })
      .from(payments)
      .where(
        and(
          eq(payments.instituteId, instituteId),
          sql`TO_CHAR(timezone('Asia/Dhaka', ${payments.paidAt}), 'YYYY-MM') = ${thisMonth}`
        )
      );

    // ৭. মোট বকেয়া ফি
    const [totalDue] = await db
      .select({ total: sum(fees.dueAmount) })
      .from(fees)
      .where(
        and(
          eq(fees.instituteId, instituteId),
          sql`${fees.status} IN ('DUE', 'PARTIAL')`
        )
      );

    // ৮. চলতি মাসের খরচ
    const [monthlyExpenses] = await db
      .select({ total: sum(expenses.amount) })
      .from(expenses)
      .where(
        and(
          eq(expenses.instituteId, instituteId),
          sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM') = ${thisMonth}`
        )
      );

    // ৯. সাম্প্রতিক পেমেন্ট
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

    // ১০. সাম্প্রতিক ভর্তি
    const recentAdmissions = await db
      .select()
      .from(students)
      .where(eq(students.instituteId, instituteId))
      .orderBy(sql`${students.createdAt} DESC`)
      .limit(5);

    // ১১. সাবস্ক্রিপশন স্ট্যাটাস
    const [subscription] = await db
      .select()
      .from(subscriptions)
      .where(eq(subscriptions.instituteId, instituteId))
      .orderBy(sql`${subscriptions.createdAt} DESC`)
      .limit(1);

    const monthlyIncome = parseFloat(String(monthlyCollection?.total ?? "0")) || 0;
    const monthlyExp = parseFloat(String(monthlyExpenses?.total ?? "0")) || 0;

    return Response.json({
      studentCount: Number(studentCount?.count ?? 0),
      staffCount: Number(staffCount?.count ?? 0),
      batchCount: Number(batchCount?.count ?? 0),
      attendance: {
        present: Number(presentToday?.count ?? 0),
        absent: Number(absentToday?.count ?? 0),
        late: Number(lateToday?.count ?? 0),
      },
      todayCollection: parseFloat(String(todayCollection?.total ?? "0")) || 0,
      monthlyCollection: monthlyIncome,
      totalDue: parseFloat(String(totalDue?.total ?? "0")) || 0,
      monthlyExpenses: monthlyExp,
      profitLoss: monthlyIncome - monthlyExp,
      recentPayments,
      recentAdmissions,
      subscription,
    });
  } catch (err) {
    console.error("Dashboard calculation error:", err);
    return Response.json({ error: "Failed to load dashboard metrics" }, { status: 500 });
  }
}
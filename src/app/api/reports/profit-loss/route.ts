import { db } from "@/db";
import { payments, expenses, salaries } from "@/db/schema";
import { eq, and, sum, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month") || new Date().toISOString().slice(0, 7);

  const instituteId = session.instituteId;

  // Total income (payments)
  const [income] = await db
    .select({ total: sum(payments.amount) })
    .from(payments)
    .where(
      and(
        eq(payments.instituteId, instituteId),
        sql`TO_CHAR(${payments.paidAt}, 'YYYY-MM') = ${month}`
      )
    );

  // Total expenses
  const [exp] = await db
    .select({ total: sum(expenses.amount) })
    .from(expenses)
    .where(
      and(
        eq(expenses.instituteId, instituteId),
        sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM') = ${month}`
      )
    );

  // Salary paid
  const [sal] = await db
    .select({ total: sum(salaries.paid) })
    .from(salaries)
    .where(
      and(eq(salaries.instituteId, instituteId), eq(salaries.month, month))
    );

  // Expense breakdown
  const expenseBreakdown = await db
    .select({
      category: expenses.category,
      total: sum(expenses.amount),
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.instituteId, instituteId),
        sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM') = ${month}`
      )
    )
    .groupBy(expenses.category);

  const totalIncome = parseFloat(String(income?.total ?? "0"));
  const totalExpenses = parseFloat(String(exp?.total ?? "0"));
  const totalSalary = parseFloat(String(sal?.total ?? "0"));
  const totalExpensesAll = totalExpenses + totalSalary;

  return Response.json({
    month,
    income: totalIncome,
    expenses: totalExpensesAll,
    salaries: totalSalary,
    otherExpenses: totalExpenses,
    profitLoss: totalIncome - totalExpensesAll,
    expenseBreakdown,
  });
}

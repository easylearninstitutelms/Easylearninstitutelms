import { db } from "@/db";
import {
  expenses,
  fees,
  payments,
  salaries,
} from "@/db/schema";
import { and, eq, gte, lt } from "drizzle-orm";
import { getSession } from "@/lib/session";

const EXPENSE_CATEGORIES = new Set([
  "OTHER",
  "RENT",
  "ELECTRICITY",
  "INTERNET",
  "SALARY",
  "MARKETING",
  "STATIONERY",
  "EQUIPMENT",
]);

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function isValidMonth(value: string) {
  if (!/^\d{4}-\d{2}$/.test(value)) return false;

  const [year, month] = value.split("-").map(Number);
  return year >= 2000 && year <= 2100 && month >= 1 && month <= 12;
}

function nextMonth(month: string) {
  const [year, monthNumber] = month.split("-").map(Number);

  if (monthNumber === 12) {
    return `${year + 1}-01`;
  }

  return `${year}-${String(monthNumber + 1).padStart(2, "0")}`;
}

function toNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month")?.trim() || "";

  if (!isValidMonth(month)) {
    return errorResponse("Valid month is required in YYYY-MM format");
  }

  const followingMonth = nextMonth(month);
  const monthStart = `${month}-01`;
  const nextMonthStart = `${followingMonth}-01`;

  // Fee records are billed when they are created.
  const feeRows = await db
    .select({
      amount: fees.amount,
      discount: fees.discount,
      dueAmount: fees.dueAmount,
    })
    .from(fees)
    .where(
      and(
        eq(fees.instituteId, session.instituteId),
        gte(fees.createdAt, new Date(`${monthStart}T00:00:00.000Z`)),
        lt(fees.createdAt, new Date(`${nextMonthStart}T00:00:00.000Z`)),
      ),
    );

  // Payments are counted by their actual paidAt timestamp.
  const paymentRows = await db
    .select({ amount: payments.amount })
    .from(payments)
    .where(
      and(
        eq(payments.instituteId, session.instituteId),
        gte(payments.paidAt, new Date(`${monthStart}T00:00:00.000Z`)),
        lt(payments.paidAt, new Date(`${nextMonthStart}T00:00:00.000Z`)),
      ),
    );

  // Expenses are counted by expenseDate. Salary-category expenses are
  // excluded here because salary payments are tracked in the salaries table.
  const expenseRows = await db
    .select({
      category: expenses.category,
      amount: expenses.amount,
    })
    .from(expenses)
    .where(
      and(
        eq(expenses.instituteId, session.instituteId),
        gte(expenses.expenseDate, monthStart),
        lt(expenses.expenseDate, nextMonthStart),
      ),
    );

  const salaryRows = await db
    .select({
      paid: salaries.paid,
    })
    .from(salaries)
    .where(
      and(
        eq(salaries.instituteId, session.instituteId),
        eq(salaries.month, month),
      ),
    );

  const grossBilled = feeRows.reduce(
    (sum, row) => sum + toNumber(row.amount),
    0,
  );

  const discount = feeRows.reduce(
    (sum, row) => sum + toNumber(row.discount),
    0,
  );

  const netBilled = Math.max(0, grossBilled - discount);

  const dueAmount = feeRows.reduce(
    (sum, row) => sum + toNumber(row.dueAmount),
    0,
  );

  const income = paymentRows.reduce(
    (sum, row) => sum + toNumber(row.amount),
    0,
  );

  const salariesPaid = salaryRows.reduce(
    (sum, row) => sum + toNumber(row.paid),
    0,
  );

  const breakdownMap = new Map<string, number>();

  for (const row of expenseRows) {
    const category = String(row.category || "OTHER");

    if (category === "SALARY") continue;

    const amount = toNumber(row.amount);
    breakdownMap.set(
      category,
      (breakdownMap.get(category) || 0) + amount,
    );
  }

  const expenseBreakdown = Array.from(breakdownMap.entries())
    .filter(([category]) => EXPENSE_CATEGORIES.has(category))
    .map(([category, total]) => ({
      category,
      total: total.toFixed(2),
    }))
    .sort((a, b) => b.total.localeCompare(a.total, undefined, { numeric: true }));

  const otherExpenses = expenseBreakdown.reduce(
    (sum, row) => sum + toNumber(row.total),
    0,
  );

  const totalExpenses = salariesPaid + otherExpenses;
  const profitLoss = income - totalExpenses;

  return Response.json({
    month,
    income,
    expenses: totalExpenses,
    salaries: salariesPaid,
    otherExpenses,
    profitLoss,
    expenseBreakdown,
    feeSummary: {
      grossBilled,
      discount,
      netBilled,
      dueAmount,
      feeCount: feeRows.length,
    },
  });
}

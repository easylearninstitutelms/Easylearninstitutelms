import { db } from "@/db";
import { expenses, users } from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month"); // YYYY-MM

  const conditions = [eq(expenses.instituteId, session.instituteId)];
  if (month) {
    conditions.push(sql`TO_CHAR(${expenses.expenseDate}::date, 'YYYY-MM') = ${month}`);
  }

  const rows = await db.select().from(expenses)
    .where(and(...conditions))
    .orderBy(desc(expenses.expenseDate));

  return Response.json({ expenses: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { category, amount, method, description, expenseDate } = body;

  if (!category || !amount || !expenseDate) {
    return Response.json({ error: "Category, amount, and date required" }, { status: 400 });
  }

  const [expense] = await db.insert(expenses).values({
    instituteId: session.instituteId,
    category,
    amount: String(parseFloat(amount)),
    method: method || "CASH",
    description: description || null,
    expenseDate,
    addedBy: session.userId,
  }).returning();

  return Response.json({ expense });
}

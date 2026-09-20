import { db } from "@/db";
import { institutes, subscriptions, subscriptionPayments } from "@/db/schema";
import { sql, sum, count, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [{ totalInstitutes }] = await db.select({ totalInstitutes: count() }).from(institutes);

  const statusCounts = await db
    .select({ status: institutes.status, count: count() })
    .from(institutes)
    .groupBy(institutes.status);

  const [revenue] = await db
    .select({ total: sum(subscriptionPayments.amount) })
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.status, "APPROVED"));

  const [pendingPayments] = await db
    .select({ count: count() })
    .from(subscriptionPayments)
    .where(eq(subscriptionPayments.status, "PENDING"));

  return Response.json({
    totalInstitutes,
    statusCounts,
    revenue: parseFloat(String(revenue?.total ?? "0")),
    pendingPayments: pendingPayments?.count ?? 0,
  });
}

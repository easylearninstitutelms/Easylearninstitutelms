import { db } from "@/db";
import { subscriptionPayments, institutes, subscriptions } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const rows = await db
    .select({
      payment: subscriptionPayments,
      instituteName: institutes.name,
    })
    .from(subscriptionPayments)
    .leftJoin(institutes, eq(subscriptionPayments.instituteId, institutes.id))
    .orderBy(desc(subscriptionPayments.createdAt));

  return Response.json({ payments: rows });
}

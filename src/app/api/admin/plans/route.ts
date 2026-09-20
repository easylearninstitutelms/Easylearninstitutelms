import { db } from "@/db";
import { plans } from "@/db/schema";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });
  const allPlans = await db.select().from(plans);
  return Response.json({ plans: allPlans });
}

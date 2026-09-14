import { db } from "@/db";
import { institutes, subscriptions, users } from "@/db/schema";
import { eq, desc, sql, count } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db
    .select({
      institute: institutes,
      userCount: sql<number>`(SELECT COUNT(*) FROM users WHERE institute_id = ${institutes.id})`,
      studentCount: sql<number>`(SELECT COUNT(*) FROM students WHERE institute_id = ${institutes.id})`,
    })
    .from(institutes)
    .orderBy(desc(institutes.createdAt));

  return Response.json({ institutes: rows });
}

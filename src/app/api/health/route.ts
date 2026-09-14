import { db } from "@/db";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok", timestamp: new Date().toISOString() });
  } catch (error) {
    return Response.json({ status: "error", error: String(error) }, { status: 500 });
  }
}

import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, isNull, or } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET() {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const rows = await db.select().from(notifications)
    .where(
      or(
        eq(notifications.recipientUserId, session.userId),
        and(
          eq(notifications.instituteId, session.instituteId!),
          isNull(notifications.recipientUserId)
        )
      )
    )
    .orderBy(desc(notifications.createdAt))
    .limit(30);

  return Response.json({ notifications: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { title, body: notifBody, type, recipientUserId } = body;

  if (!title) return Response.json({ error: "Title required" }, { status: 400 });

  const [notification] = await db.insert(notifications).values({
    instituteId: session.instituteId,
    recipientUserId: recipientUserId || null,
    title,
    body: notifBody || null,
    type: type || "GENERAL",
  }).returning();

  return Response.json({ notification });
}

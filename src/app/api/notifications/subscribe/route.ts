import { db } from "@/db";
import { getSession } from "@/lib/session";
import { sql } from "drizzle-orm";
import { ensurePushSubscriptionsTable, getVapidPublicKey } from "@/lib/push";

export async function GET() {
  try {
    const publicKey = await getVapidPublicKey();
    return Response.json({ publicKey });
  } catch (error) {
    console.error("GET /api/notifications/subscribe error:", error);
    return Response.json({ error: "Push notifications are not configured yet." }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!(await getVapidPublicKey())) {
    return Response.json({ error: "Push notifications are not configured yet." }, { status: 503 });
  }

  try {
    const body = await request.json();
    const subscription = body?.subscription;

    if (
      !subscription ||
      typeof subscription.endpoint !== "string" ||
      !subscription.keys ||
      typeof subscription.keys.p256dh !== "string" ||
      typeof subscription.keys.auth !== "string"
    ) {
      return Response.json({ error: "Invalid push subscription." }, { status: 400 });
    }

    await ensurePushSubscriptionsTable();

    await db.execute(sql`
      INSERT INTO push_subscriptions (
        user_id, institute_id, endpoint, p256dh, auth, updated_at
      )
      VALUES (
        ${session.userId}, ${session.instituteId}, ${subscription.endpoint},
        ${subscription.keys.p256dh}, ${subscription.keys.auth}, now()
      )
      ON CONFLICT (endpoint)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        institute_id = EXCLUDED.institute_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        updated_at = now()
    `);

    return Response.json({ success: true });
  } catch (error) {
    console.error("POST /api/notifications/subscribe error:", error);
    return Response.json({ error: "Failed to save push subscription." }, { status: 500 });
  }
}

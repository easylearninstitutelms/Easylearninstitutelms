import webpush from "web-push";
import { db } from "@/db";
import { sql } from "drizzle-orm";

let vapidConfigured = false;

export async function ensurePushSubscriptionsTable() {
  await db.execute(sql\`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      institute_id uuid REFERENCES institutes(id) ON DELETE CASCADE,
      endpoint text NOT NULL UNIQUE,
      p256dh text NOT NULL,
      auth text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  \`);
  await db.execute(sql\`
    CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
    ON push_subscriptions(user_id)
  \`);
}

function configureVapid() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  if (!subject || !publicKey || !privateKey) return false;

  if (!vapidConfigured) {
    webpush.setVapidDetails(subject, publicKey, privateKey);
    vapidConfigured = true;
  }

  return true;
}

export function getVapidPublicKey() {
  return process.env.VAPID_PUBLIC_KEY || "";
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body?: string | null; url?: string },
) {
  if (userIds.length === 0 || !configureVapid()) {
    return { sent: 0, skipped: userIds.length };
  }

  await ensurePushSubscriptionsTable();

  const uniqueUserIds = [...new Set(userIds)];
  const subscriptions = await db.execute(sql\`
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id = ANY(\${uniqueUserIds}::uuid[])
  \`);

  let sent = 0;

  for (const subscription of subscriptions.rows as Array<{
    id: string;
    endpoint: string;
    p256dh: string;
    auth: string;
  }>) {
    try {
      await webpush.sendNotification(
        {
          endpoint: subscription.endpoint,
          keys: {
            p256dh: subscription.p256dh,
            auth: subscription.auth,
          },
        },
        JSON.stringify(payload),
        { TTL: 60 * 60 * 24 },
      );
      sent += 1;
    } catch (error: any) {
      const statusCode = error?.statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await db.execute(sql\`
          DELETE FROM push_subscriptions
          WHERE id = \${subscription.id}
        \`);
      } else {
        console.error("Web push delivery failed:", error);
      }
    }
  }

  return { sent, skipped: Math.max(0, uniqueUserIds.length - sent) };
}

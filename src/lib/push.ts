import webpush from "web-push";
import { db } from "@/db";
import { sql } from "drizzle-orm";

let vapidConfigured = false;

export async function ensurePushConfig() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS push_config (
      id integer PRIMARY KEY,
      subject text NOT NULL,
      public_key text NOT NULL,
      private_key text NOT NULL,
      created_at timestamp NOT NULL DEFAULT now(),
      updated_at timestamp NOT NULL DEFAULT now()
    )
  `);

  const result = await db.execute(sql`
    SELECT subject, public_key, private_key
    FROM push_config
    WHERE id = 1
    LIMIT 1
  `);

  const row = (result.rows as Array<{
    subject: string;
    public_key: string;
    private_key: string;
  }>)[0];

  if (row) return row;

  const subject = process.env.VAPID_SUBJECT || "mailto:easylearninstitute15@gmail.com";
  const keys = webpush.generateVAPIDKeys();

  await db.execute(sql`
    INSERT INTO push_config (id, subject, public_key, private_key)
    VALUES (1, ${subject}, ${keys.publicKey}, ${keys.privateKey})
    ON CONFLICT (id) DO NOTHING
  `);

  const created = await db.execute(sql`
    SELECT subject, public_key, private_key
    FROM push_config
    WHERE id = 1
    LIMIT 1
  `);

  return (created.rows as Array<{
    subject: string;
    public_key: string;
    private_key: string;
  }>)[0] || {
    subject,
    public_key: keys.publicKey,
    private_key: keys.privateKey,
  };
}

export async function ensurePushSubscriptionsTable() {
  await db.execute(sql`
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
  `);
  await db.execute(sql`
    CREATE INDEX IF NOT EXISTS push_subscriptions_user_idx
    ON push_subscriptions(user_id)
  `);
}

async function configureVapid() {
  const subject = process.env.VAPID_SUBJECT;
  const envPublicKey = process.env.VAPID_PUBLIC_KEY;
  const envPrivateKey = process.env.VAPID_PRIVATE_KEY;

  const config =
    subject && envPublicKey && envPrivateKey
      ? { subject, public_key: envPublicKey, private_key: envPrivateKey }
      : await ensurePushConfig();

  if (!vapidConfigured) {
    webpush.setVapidDetails(
      config.subject,
      config.public_key,
      config.private_key,
    );
    vapidConfigured = true;
  }

  return config;
}

export async function getVapidPublicKey() {
  const subject = process.env.VAPID_SUBJECT;
  const envPublicKey = process.env.VAPID_PUBLIC_KEY;
  const envPrivateKey = process.env.VAPID_PRIVATE_KEY;

  if (subject && envPublicKey && envPrivateKey) return envPublicKey;

  const config = await ensurePushConfig();
  return config.public_key;
}

export async function sendPushToUsers(
  userIds: string[],
  payload: { title: string; body?: string | null; url?: string },
) {
  if (userIds.length === 0) return { sent: 0, skipped: 0 };

  const config = await configureVapid();
  await ensurePushSubscriptionsTable();

  const uniqueUserIds = [...new Set(userIds)];
  const subscriptions = await db.execute(sql`
    SELECT id, endpoint, p256dh, auth
    FROM push_subscriptions
    WHERE user_id IN (${sql.join(uniqueUserIds.map((id) => sql`${id}::uuid`), sql`, `)})
  `);

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
        await db.execute(sql`
          DELETE FROM push_subscriptions
          WHERE id = ${subscription.id}
        `);
      } else {
        console.error("Web push delivery failed:", error);
      }
    }
  }

  return {
    sent,
    skipped: Math.max(0, uniqueUserIds.length - sent),
    configured: Boolean(config.public_key),
  };
}

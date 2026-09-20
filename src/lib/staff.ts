import { db } from "@/db";
import { sql } from "drizzle-orm";

let ready: Promise<void> | null = null;

export function ensureStaffSchema() {
  if (!ready) {
    ready = db.execute(sql`
      ALTER TABLE staff
        ADD COLUMN IF NOT EXISTS deleted_at timestamp;

      CREATE INDEX IF NOT EXISTS staff_deleted_idx
        ON staff(institute_id, deleted_at);
    `).then(() => undefined);
  }

  return ready;
}

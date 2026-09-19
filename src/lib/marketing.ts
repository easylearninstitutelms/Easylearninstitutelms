import { db } from "@/db";
import { sql } from "drizzle-orm";

let ready: Promise<void> | null = null;

export function ensureMarketingSchema() {
  if (!ready) {
    ready = db.execute(sql`
      DO $$
      BEGIN
        ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'DIGITAL_MARKETER';
      EXCEPTION
        WHEN duplicate_object THEN NULL;
      END $$;

      CREATE TABLE IF NOT EXISTS marketing_daily_reports (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id uuid NOT NULL,
        report_date date NOT NULL,
        leads_generated integer NOT NULL DEFAULT 0,
        conversions integer NOT NULL DEFAULT 0,
        notes text,
        created_at timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS marketing_ad_spends (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id uuid NOT NULL,
        platform varchar(100) NOT NULL,
        amount numeric(12,2) NOT NULL DEFAULT 0,
        spend_date date NOT NULL DEFAULT CURRENT_DATE,
        notes text,
        created_at timestamp NOT NULL DEFAULT now()
      );

      CREATE INDEX IF NOT EXISTS marketing_reports_institute_date_idx
        ON marketing_daily_reports(institute_id, report_date);
      CREATE INDEX IF NOT EXISTS marketing_ads_institute_date_idx
        ON marketing_ad_spends(institute_id, spend_date);
    `).then(() => undefined);
  }
  return ready;
}
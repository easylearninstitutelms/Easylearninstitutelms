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
        staff_id uuid,
        report_date date NOT NULL,
        summary text,
        tasks_completed text,
        posts_count integer NOT NULL DEFAULT 0,
        videos_count integer NOT NULL DEFAULT 0,
        creatives_count integer NOT NULL DEFAULT 0,
        leads_count integer NOT NULL DEFAULT 0,
        enrollments_count integer NOT NULL DEFAULT 0,
        messages_count integer NOT NULL DEFAULT 0,
        calls_count integer NOT NULL DEFAULT 0,
        website_visits integer NOT NULL DEFAULT 0,
        impressions integer NOT NULL DEFAULT 0,
        clicks integer NOT NULL DEFAULT 0,
        budget numeric(12,2) NOT NULL DEFAULT 0,
        budget_spent numeric(12,2) NOT NULL DEFAULT 0,
        notes text,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS marketing_ad_spends (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id uuid,
        report_id uuid,
        platform varchar(100) NOT NULL,
        campaign_name varchar(255),
        amount numeric(12,2) NOT NULL DEFAULT 0,
        leads_count integer NOT NULL DEFAULT 0,
        clicks integer NOT NULL DEFAULT 0,
        impressions integer NOT NULL DEFAULT 0,
        enrollments_count integer NOT NULL DEFAULT 0,
        note text,
        spend_date date NOT NULL DEFAULT CURRENT_DATE,
        notes text,
        created_at timestamp NOT NULL DEFAULT now()
      );

      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS staff_id uuid;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS summary text;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS tasks_completed text;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS posts_count integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS videos_count integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS creatives_count integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS leads_count integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS enrollments_count integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS messages_count integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS calls_count integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS website_visits integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS impressions integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS budget numeric(12,2) NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS budget_spent numeric(12,2) NOT NULL DEFAULT 0;
      ALTER TABLE marketing_daily_reports ADD COLUMN IF NOT EXISTS updated_at timestamp NOT NULL DEFAULT now();

      ALTER TABLE marketing_ad_spends ADD COLUMN IF NOT EXISTS report_id uuid;
      ALTER TABLE marketing_ad_spends ADD COLUMN IF NOT EXISTS campaign_name varchar(255);
      ALTER TABLE marketing_ad_spends ADD COLUMN IF NOT EXISTS leads_count integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_ad_spends ADD COLUMN IF NOT EXISTS clicks integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_ad_spends ADD COLUMN IF NOT EXISTS impressions integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_ad_spends ADD COLUMN IF NOT EXISTS enrollments_count integer NOT NULL DEFAULT 0;
      ALTER TABLE marketing_ad_spends ADD COLUMN IF NOT EXISTS note text;

      CREATE UNIQUE INDEX IF NOT EXISTS marketing_reports_staff_date_unique
        ON marketing_daily_reports(staff_id, report_date);

      CREATE INDEX IF NOT EXISTS marketing_reports_institute_date_idx
        ON marketing_daily_reports(institute_id, report_date);
      CREATE INDEX IF NOT EXISTS marketing_ads_institute_date_idx
        ON marketing_ad_spends(institute_id, spend_date);
      CREATE INDEX IF NOT EXISTS marketing_ads_report_idx
        ON marketing_ad_spends(report_id);
    `).then(() => undefined);
  }
  return ready;
}

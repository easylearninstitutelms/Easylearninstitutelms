import { db } from "@/db";
import { sql } from "drizzle-orm";

let ready: Promise<void> | null = null;

export function ensureAcademicSchema() {
  if (!ready) {
    ready = db.execute(sql`
      CREATE TABLE IF NOT EXISTS programmes (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id uuid NOT NULL,
        name varchar(255) NOT NULL,
        code varchar(50),
        description text,
        duration varchar(100),
        status varchar(20) NOT NULL DEFAULT 'ACTIVE',
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now(),
        UNIQUE (institute_id, name)
      );

      CREATE INDEX IF NOT EXISTS programmes_institute_idx
      ON programmes(institute_id);

      CREATE TABLE IF NOT EXISTS programme_semesters (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id uuid NOT NULL,
        programme_id uuid NOT NULL
          REFERENCES programmes(id) ON DELETE CASCADE,
        semester_no integer NOT NULL,
        name varchar(100) NOT NULL,
        created_at timestamp NOT NULL DEFAULT now(),
        UNIQUE (programme_id, semester_no)
      );

      CREATE INDEX IF NOT EXISTS programme_semesters_institute_idx
      ON programme_semesters(institute_id);

      CREATE INDEX IF NOT EXISTS programme_semesters_programme_idx
      ON programme_semesters(programme_id);

      ALTER TABLE batches
        ADD COLUMN IF NOT EXISTS programme_id uuid;

      ALTER TABLE batches
        ADD COLUMN IF NOT EXISTS semester_id uuid;

      CREATE INDEX IF NOT EXISTS batches_programme_semester_idx
      ON batches(programme_id, semester_id);

      ALTER TABLE exams
        ADD COLUMN IF NOT EXISTS programme_id uuid;

      ALTER TABLE exams
        ADD COLUMN IF NOT EXISTS semester_id uuid;

      CREATE INDEX IF NOT EXISTS exams_programme_semester_idx
      ON exams(programme_id, semester_id);
    `).then(() => undefined);
  }

  return ready;
}
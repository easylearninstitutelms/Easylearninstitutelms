import { db } from "@/db";
import { sql } from "drizzle-orm";

let ready: Promise<void> | null = null;

export function ensureTeacherAssignmentSchema() {
  if (!ready) {
    ready = db.execute(sql`
      CREATE TABLE IF NOT EXISTS teacher_assignments (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        institute_id uuid NOT NULL REFERENCES institutes(id) ON DELETE CASCADE,
        teacher_id uuid NOT NULL REFERENCES staff(id) ON DELETE CASCADE,
        course_id uuid REFERENCES courses(id) ON DELETE CASCADE,
        programme_id uuid REFERENCES programmes(id) ON DELETE CASCADE,
        created_at timestamp NOT NULL DEFAULT now(),
        updated_at timestamp NOT NULL DEFAULT now()
      );

      CREATE UNIQUE INDEX IF NOT EXISTS teacher_assignments_teacher_unique
        ON teacher_assignments(teacher_id);

      CREATE INDEX IF NOT EXISTS teacher_assignments_institute_idx
        ON teacher_assignments(institute_id);

      CREATE INDEX IF NOT EXISTS teacher_assignments_course_idx
        ON teacher_assignments(course_id);

      CREATE INDEX IF NOT EXISTS teacher_assignments_programme_idx
        ON teacher_assignments(programme_id);
    `);
  }
  return ready;
}

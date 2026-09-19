import { db } from "@/db";
import { sql } from "drizzle-orm";

let ready: Promise<void> | null = null;

export function ensureAcademicSchema() {
  if (!ready) {
    ready = db
      .execute(sql`
        /* =========================================================
           PROGRAMME
        ========================================================= */

        CREATE TABLE IF NOT EXISTS programmes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          institute_id uuid NOT NULL,
          name varchar(255) NOT NULL,
          code varchar(50),
          programme_no integer,
          description text,
          duration varchar(100),
          status varchar(20) NOT NULL DEFAULT 'ACTIVE',
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now(),
          UNIQUE (institute_id, name)
        );

        ALTER TABLE programmes
          ADD COLUMN IF NOT EXISTS programme_no integer;

        CREATE INDEX IF NOT EXISTS programmes_institute_idx
          ON programmes(institute_id);

        CREATE UNIQUE INDEX IF NOT EXISTS programmes_institute_no_idx
          ON programmes(institute_id, programme_no)
          WHERE programme_no IS NOT NULL;


        /* =========================================================
           PROGRAMME SEMESTERS
        ========================================================= */

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


        /* =========================================================
           BATCH ACADEMIC FIELDS
        ========================================================= */

        ALTER TABLE batches
          ADD COLUMN IF NOT EXISTS programme_id uuid;

        ALTER TABLE batches
          ADD COLUMN IF NOT EXISTS semester_id uuid;

        ALTER TABLE batches
          ADD COLUMN IF NOT EXISTS batch_no integer;

        CREATE INDEX IF NOT EXISTS batches_programme_semester_idx
          ON batches(programme_id, semester_id);

        CREATE UNIQUE INDEX IF NOT EXISTS batches_institute_no_idx
          ON batches(institute_id, batch_no)
          WHERE batch_no IS NOT NULL;


        /* =========================================================
           COURSE NUMBER
        ========================================================= */

        ALTER TABLE courses
          ADD COLUMN IF NOT EXISTS course_no integer;

        CREATE UNIQUE INDEX IF NOT EXISTS courses_institute_no_idx
          ON courses(institute_id, course_no)
          WHERE course_no IS NOT NULL;


        /* =========================================================
           BACKFILL COURSE NUMBERS
           Starts from 211
        ========================================================= */

        WITH missing_course_numbers AS (
          SELECT
            c.id,
            COALESCE(
              (
                SELECT MAX(c2.course_no)
                FROM courses c2
                WHERE c2.institute_id = c.institute_id
                  AND c2.course_no IS NOT NULL
              ),
              210
            )
            +
            ROW_NUMBER() OVER (
              PARTITION BY c.institute_id
              ORDER BY c.created_at, c.id
            ) AS next_no
          FROM courses c
          WHERE c.course_no IS NULL
        )
        UPDATE courses c
        SET course_no = m.next_no
        FROM missing_course_numbers m
        WHERE c.id = m.id;


        /* =========================================================
           ENROLLMENTS
           Direct Course / Programme enrollment support
        ========================================================= */

        ALTER TABLE enrollments
          ADD COLUMN IF NOT EXISTS course_id uuid;

        ALTER TABLE enrollments
          ADD COLUMN IF NOT EXISTS programme_id uuid;

        CREATE INDEX IF NOT EXISTS enrollments_course_idx
          ON enrollments(course_id);

        CREATE INDEX IF NOT EXISTS enrollments_programme_idx
          ON enrollments(programme_id);


        /* =========================================================
           EXAMS
        ========================================================= */

        ALTER TABLE exams
          ADD COLUMN IF NOT EXISTS programme_id uuid;

        ALTER TABLE exams
          ADD COLUMN IF NOT EXISTS semester_id uuid;

        CREATE INDEX IF NOT EXISTS exams_programme_semester_idx
          ON exams(programme_id, semester_id);


        /* =========================================================
           PROGRAMME SYLLABUS CLASSES
        ========================================================= */

        CREATE TABLE IF NOT EXISTS programme_syllabus_classes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          institute_id uuid NOT NULL,
          programme_id uuid NOT NULL
            REFERENCES programmes(id) ON DELETE CASCADE,
          semester_id uuid NOT NULL
            REFERENCES programme_semesters(id) ON DELETE CASCADE,
          class_no integer NOT NULL,
          title varchar(255) NOT NULL,
          description text,
          scheduled_date date,
          start_time time,
          end_time time,
          status varchar(20) NOT NULL DEFAULT 'UPCOMING',
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now(),
          UNIQUE (semester_id, class_no)
        );

        CREATE INDEX IF NOT EXISTS programme_syllabus_institute_idx
          ON programme_syllabus_classes(institute_id);

        CREATE INDEX IF NOT EXISTS programme_syllabus_programme_idx
          ON programme_syllabus_classes(programme_id);

        CREATE INDEX IF NOT EXISTS programme_syllabus_semester_idx
          ON programme_syllabus_classes(semester_id);


        /* =========================================================
           COURSE SYLLABUS CLASSES
        ========================================================= */

        CREATE TABLE IF NOT EXISTS course_syllabus_classes (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          institute_id uuid NOT NULL,
          course_id uuid NOT NULL
            REFERENCES courses(id) ON DELETE CASCADE,
          class_no integer NOT NULL,
          title varchar(255) NOT NULL,
          description text,
          scheduled_date date,
          start_time time,
          end_time time,
          status varchar(20) NOT NULL DEFAULT 'UPCOMING',
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now(),
          UNIQUE (course_id, class_no)
        );

        CREATE INDEX IF NOT EXISTS course_syllabus_institute_idx
          ON course_syllabus_classes(institute_id);

        CREATE INDEX IF NOT EXISTS course_syllabus_course_idx
          ON course_syllabus_classes(course_id);


        /* =========================================================
           PROGRAMME CLASS SESSIONS
        ========================================================= */

        CREATE TABLE IF NOT EXISTS programme_syllabus_class_sessions (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          institute_id uuid NOT NULL,
          syllabus_class_id uuid NOT NULL
            REFERENCES programme_syllabus_classes(id) ON DELETE CASCADE,
          batch_id uuid NOT NULL
            REFERENCES batches(id) ON DELETE CASCADE,
          teacher_id uuid NOT NULL
            REFERENCES staff(id) ON DELETE CASCADE,
          status varchar(20) NOT NULL DEFAULT 'PENDING',
          taken_at timestamp,
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now(),
          UNIQUE (syllabus_class_id, batch_id)
        );

        CREATE INDEX IF NOT EXISTS syllabus_sessions_institute_idx
          ON programme_syllabus_class_sessions(institute_id);

        CREATE INDEX IF NOT EXISTS syllabus_sessions_batch_idx
          ON programme_syllabus_class_sessions(batch_id);

        CREATE INDEX IF NOT EXISTS syllabus_sessions_teacher_idx
          ON programme_syllabus_class_sessions(teacher_id);


        /* =========================================================
           LEGACY PROGRAMME CLASS RECORDINGS
        ========================================================= */

        CREATE TABLE IF NOT EXISTS programme_class_recordings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          institute_id uuid NOT NULL,
          syllabus_class_id uuid NOT NULL
            REFERENCES programme_syllabus_classes(id) ON DELETE CASCADE,
          batch_id uuid NOT NULL
            REFERENCES batches(id) ON DELETE CASCADE,
          teacher_id uuid NOT NULL
            REFERENCES staff(id) ON DELETE CASCADE,
          title varchar(255) NOT NULL,
          video_url text NOT NULL,
          duration varchar(50),
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now(),
          UNIQUE (syllabus_class_id, batch_id)
        );

        CREATE INDEX IF NOT EXISTS programme_recordings_institute_idx
          ON programme_class_recordings(institute_id);

        CREATE INDEX IF NOT EXISTS programme_recordings_batch_idx
          ON programme_class_recordings(batch_id);

        CREATE INDEX IF NOT EXISTS programme_recordings_teacher_idx
          ON programme_class_recordings(teacher_id);

        ALTER TABLE programme_class_recordings
          ALTER COLUMN teacher_id DROP NOT NULL;


        /* =========================================================
           PROGRAMME SYLLABUS RECORDINGS
           One recording per programme syllabus class
        ========================================================= */

        CREATE TABLE IF NOT EXISTS programme_syllabus_recordings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          institute_id uuid NOT NULL,
          syllabus_class_id uuid NOT NULL
            REFERENCES programme_syllabus_classes(id) ON DELETE CASCADE,
          title varchar(255) NOT NULL,
          video_url text NOT NULL,
          duration varchar(50),
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now(),
          UNIQUE (syllabus_class_id)
        );

        CREATE INDEX IF NOT EXISTS programme_syllabus_recordings_institute_idx
          ON programme_syllabus_recordings(institute_id);

        CREATE INDEX IF NOT EXISTS programme_syllabus_recordings_class_idx
          ON programme_syllabus_recordings(syllabus_class_id);


        /* =========================================================
           COURSE CLASS RECORDINGS
        ========================================================= */

        CREATE TABLE IF NOT EXISTS course_class_recordings (
          id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
          institute_id uuid NOT NULL,
          course_class_id uuid NOT NULL
            REFERENCES course_syllabus_classes(id) ON DELETE CASCADE,
          title varchar(255) NOT NULL,
          video_url text NOT NULL,
          duration varchar(50),
          created_at timestamp NOT NULL DEFAULT now(),
          updated_at timestamp NOT NULL DEFAULT now(),
          UNIQUE (course_class_id)
        );

        CREATE INDEX IF NOT EXISTS course_recordings_institute_idx
          ON course_class_recordings(institute_id);

        CREATE INDEX IF NOT EXISTS course_recordings_class_idx
          ON course_class_recordings(course_class_id);


        /* =========================================================
           HOMEWORK / ASSIGNMENT TARGETING

           A homework can now belong to:
           1. Course + Course Syllabus Class
           2. Programme + Semester + Programme Syllabus Class
           3. Legacy Batch

           batch_id becomes optional for new Course/Programme homework.
        ========================================================= */

        ALTER TABLE homework
          ALTER COLUMN batch_id DROP NOT NULL;

        ALTER TABLE homework
          ADD COLUMN IF NOT EXISTS course_id uuid;

        ALTER TABLE homework
          ADD COLUMN IF NOT EXISTS programme_id uuid;

        ALTER TABLE homework
          ADD COLUMN IF NOT EXISTS semester_id uuid;

        ALTER TABLE homework
          ADD COLUMN IF NOT EXISTS course_class_id uuid;

        ALTER TABLE homework
          ADD COLUMN IF NOT EXISTS programme_class_id uuid;

        CREATE INDEX IF NOT EXISTS homework_course_idx
          ON homework(course_id);

        CREATE INDEX IF NOT EXISTS homework_programme_idx
          ON homework(programme_id);

        CREATE INDEX IF NOT EXISTS homework_semester_idx
          ON homework(semester_id);

        CREATE INDEX IF NOT EXISTS homework_course_class_idx
          ON homework(course_class_id);

        CREATE INDEX IF NOT EXISTS homework_programme_class_idx
          ON homework(programme_class_id);

        CREATE INDEX IF NOT EXISTS homework_target_idx
          ON homework(course_id, programme_id, semester_id);

        CREATE INDEX IF NOT EXISTS homework_class_target_idx
          ON homework(course_class_id, programme_class_id);
      `)
      .then(() => undefined);
  }

  return ready;
}
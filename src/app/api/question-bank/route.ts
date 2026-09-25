import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

type Row = Record<string, any>;

const MANAGE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
];

const QUESTION_TYPES = [
  "MCQ",
  "TRUE_FALSE",
  "SHORT_ANSWER",
  "DESCRIPTIVE",
] as const;

const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;

function rowsOf(result: unknown): Row[] {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: Row[] }).rows;
  }

  return Array.isArray(result) ? (result as Row[]) : [];
}

function text(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function validType(value: unknown): boolean {
  return QUESTION_TYPES.includes(
    value as (typeof QUESTION_TYPES)[number],
  );
}

function validDifficulty(value: unknown): boolean {
  return DIFFICULTIES.includes(
    value as (typeof DIFFICULTIES)[number],
  );
}

async function validateTarget(
  instituteId: string,
  courseId: string,
  programmeId: string,
  semesterId: string,
) {
  if (courseId && (programmeId || semesterId)) {
    return "Course cannot be combined with Programme or Semester.";
  }

  if (semesterId && !programmeId) {
    return "Semester requires a Programme.";
  }

  if (courseId) {
    const rows = rowsOf(
      await db.execute(sql`
        SELECT id
        FROM courses
        WHERE id = ${courseId}
          AND institute_id = ${instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `),
    );

    if (!rows[0]) {
      return "Selected course was not found or is inactive.";
    }
  }

  if (programmeId) {
    const rows = rowsOf(
      await db.execute(sql`
        SELECT id
        FROM programmes
        WHERE id = ${programmeId}
          AND institute_id = ${instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `),
    );

    if (!rows[0]) {
      return "Selected programme was not found or is inactive.";
    }
  }

  if (semesterId) {
    const rows = rowsOf(
      await db.execute(sql`
        SELECT id
        FROM programme_semesters
        WHERE id = ${semesterId}
          AND programme_id = ${programmeId}
          AND institute_id = ${instituteId}
        LIMIT 1
      `),
    );

    if (!rows[0]) {
      return "Selected semester was not found for this programme.";
    }
  }

  if (!courseId && !programmeId) {
    return "Please select a Course or Programme.";
  }

  return "";
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    const url = new URL(request.url);
    const options = url.searchParams.get("options") === "true";

    const courseId = text(url.searchParams.get("courseId"));
    const programmeId = text(url.searchParams.get("programmeId"));
    const semesterId = text(url.searchParams.get("semesterId"));

    if (options) {
      const [courses, programmes] = await Promise.all([
        db.execute(sql`
          SELECT
            id,
            name,
            course_no AS "courseNo"
          FROM courses
          WHERE institute_id = ${session.instituteId}
            AND status = 'ACTIVE'
          ORDER BY name ASC
        `),

        db.execute(sql`
          SELECT
            p.id,
            p.name,
            p.code,
            p.programme_no AS "programmeNo",
            COALESCE(
              (
                SELECT json_agg(
                  json_build_object(
                    'id', ps.id,
                    'name', ps.name,
                    'semesterNo', ps.semester_no
                  )
                  ORDER BY ps.semester_no
                )
                FROM programme_semesters ps
                WHERE ps.programme_id = p.id
                  AND ps.institute_id = p.institute_id
              ),
              '[]'::json
            ) AS semesters
          FROM programmes p
          WHERE p.institute_id = ${session.instituteId}
            AND p.status = 'ACTIVE'
          ORDER BY p.name ASC
        `),
      ]);

      return NextResponse.json({
        courses: rowsOf(courses),
        programmes: rowsOf(programmes),
      });
    }

    const result = await db.execute(sql`
      SELECT
        q.id,
        q.course_id AS "courseId",
        q.programme_id AS "programmeId",
        q.semester_id AS "semesterId",
        q.question,
        q.type,
        q.options_json AS "options",
        q.correct_answer AS "correctAnswer",
        q.explanation,
        q.difficulty,
        q.topic,
        q.marks,
        q.source,
        q.created_at AS "createdAt",
        COALESCE(c.name, '') AS "courseName",
        COALESCE(p.name, '') AS "programmeName",
        COALESCE(ps.name, '') AS "semesterName"
      FROM question_bank q
      LEFT JOIN courses c
        ON c.id = q.course_id
      LEFT JOIN programmes p
        ON p.id = q.programme_id
      LEFT JOIN programme_semesters ps
        ON ps.id = q.semester_id
      WHERE q.institute_id = ${session.instituteId}
        ${courseId ? sql`AND q.course_id = ${courseId}` : sql``}
        ${programmeId ? sql`AND q.programme_id = ${programmeId}` : sql``}
        ${semesterId ? sql`AND q.semester_id = ${semesterId}` : sql``}
      ORDER BY q.created_at DESC
    `);

    return NextResponse.json({
      questions: rowsOf(result),
    });
  } catch (error) {
    console.error("GET /api/question-bank error:", error);

    return NextResponse.json(
      { error: "Failed to load question bank." },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission." },
        { status: 403 },
      );
    }

    const body = await request.json();
    const action = text(body.action).toLowerCase();

    /*
     * GENERATE
     *
     * This does NOT use OpenAI.
     * Questions are selected from the local DEFAULT Question Bank.
     */
    if (action === "generate") {
      const courseId = text(body.courseId);
      const programmeId = text(body.programmeId);
      const semesterId = text(body.semesterId);

      const rawTopic = text(body.topic);

      const topic = rawTopic
        .replace(/\s+WITH\s+AI\s*$/i, "")
        .trim();

      const type = text(body.type).toUpperCase();
      const difficulty = text(body.difficulty).toUpperCase();

      const count = Math.min(
        Math.max(Number(body.count) || 5, 1),
        30,
      );

      const targetError = await validateTarget(
        session.instituteId,
        courseId,
        programmeId,
        semesterId,
      );

      if (targetError) {
        return NextResponse.json(
          { error: targetError },
          { status: 400 },
        );
      }

      if (!validType(type)) {
        return NextResponse.json(
          { error: "Invalid question type." },
          { status: 400 },
        );
      }

      if (!validDifficulty(difficulty)) {
        return NextResponse.json(
          { error: "Invalid difficulty." },
          { status: 400 },
        );
      }

      if (!topic) {
        return NextResponse.json(
          { error: "Topic is required." },
          { status: 400 },
        );
      }

      /*
       * First try:
       * exact topic match.
       */
      let result = await db.execute(sql`
        SELECT
          q.id,
          q.question,
          q.options_json AS "options",
          q.correct_answer AS "correctAnswer",
          q.explanation,
          q.type,
          q.difficulty,
          q.topic,
          q.marks
        FROM question_bank q
        WHERE q.institute_id = ${session.instituteId}
          AND q.source = 'DEFAULT'
          AND q.type = ${type}
          AND q.difficulty = ${difficulty}
          AND LOWER(TRIM(q.topic)) = LOWER(TRIM(${topic}))
        ORDER BY random()
        LIMIT ${count}
      `);

      let selectedRows = rowsOf(result);

      /*
       * Second try:
       * topic contained inside the DEFAULT topic/question.
       */
      if (selectedRows.length < count) {
        const existingIds = selectedRows
          .map((row) => text(row.id))
          .filter(Boolean);

        result = await db.execute(
          existingIds.length
            ? sql`
                SELECT
                  q.id,
                  q.question,
                  q.options_json AS "options",
                  q.correct_answer AS "correctAnswer",
                  q.explanation,
                  q.type,
                  q.difficulty,
                  q.topic,
                  q.marks
                FROM question_bank q
                WHERE q.institute_id = ${session.instituteId}
                  AND q.source = 'DEFAULT'
                  AND q.type = ${type}
                  AND q.difficulty = ${difficulty}
                  AND (
                    LOWER(q.topic) LIKE LOWER(${`%${topic}%`})
                    OR LOWER(q.question) LIKE LOWER(${`%${topic}%`})
                  )
                  AND q.id NOT IN (
                    ${sql.join(
                      existingIds.map((id) => sql`${id}`),
                      sql`, `,
                    )}
                  )
                ORDER BY random()
                LIMIT ${count - selectedRows.length}
              `
            : sql`
                SELECT
                  q.id,
                  q.question,
                  q.options_json AS "options",
                  q.correct_answer AS "correctAnswer",
                  q.explanation,
                  q.type,
                  q.difficulty,
                  q.topic,
                  q.marks
                FROM question_bank q
                WHERE q.institute_id = ${session.instituteId}
                  AND q.source = 'DEFAULT'
                  AND q.type = ${type}
                  AND q.difficulty = ${difficulty}
                  AND (
                    LOWER(q.topic) LIKE LOWER(${`%${topic}%`})
                    OR LOWER(q.question) LIKE LOWER(${`%${topic}%`})
                  )
                ORDER BY random()
                LIMIT ${count}
              `,
        );

        selectedRows = [
          ...selectedRows,
          ...rowsOf(result),
        ];
      }

      /*
       * Final fallback:
       * If the requested topic has fewer questions,
       * take random DEFAULT questions of the requested
       * type + difficulty so Generator still works.
       */
      if (selectedRows.length < count) {
        const existingIds = selectedRows
          .map((row) => text(row.id))
          .filter(Boolean);

        result = await db.execute(
          existingIds.length
            ? sql`
                SELECT
                  q.id,
                  q.question,
                  q.options_json AS "options",
                  q.correct_answer AS "correctAnswer",
                  q.explanation,
                  q.type,
                  q.difficulty,
                  q.topic,
                  q.marks
                FROM question_bank q
                WHERE q.institute_id = ${session.instituteId}
                  AND q.source = 'DEFAULT'
                  AND q.type = ${type}
                  AND q.difficulty = ${difficulty}
                  AND q.id NOT IN (
                    ${sql.join(
                      existingIds.map((id) => sql`${id}`),
                      sql`, `,
                    )}
                  )
                ORDER BY random()
                LIMIT ${count - selectedRows.length}
              `
            : sql`
                SELECT
                  q.id,
                  q.question,
                  q.options_json AS "options",
                  q.correct_answer AS "correctAnswer",
                  q.explanation,
                  q.type,
                  q.difficulty,
                  q.topic,
                  q.marks
                FROM question_bank q
                WHERE q.institute_id = ${session.instituteId}
                  AND q.source = 'DEFAULT'
                  AND q.type = ${type}
                  AND q.difficulty = ${difficulty}
                ORDER BY random()
                LIMIT ${count}
              `,
        );

        selectedRows = [
          ...selectedRows,
          ...rowsOf(result),
        ];
      }

      if (selectedRows.length < count) {
        return NextResponse.json(
          {
            error:
              `Only ${selectedRows.length} DEFAULT questions are available ` +
              `for ${type} / ${difficulty}.`,
          },
          { status: 422 },
        );
      }

      const questions = selectedRows
        .slice(0, count)
        .map((q) => {
          let options: string[] = [];

          if (Array.isArray(q.options)) {
            options = q.options.map(text).filter(Boolean);
          } else if (typeof q.options === "string") {
            try {
              const parsed = JSON.parse(q.options);

              if (Array.isArray(parsed)) {
                options = parsed
                  .map(text)
                  .filter(Boolean);
              }
            } catch {
              options = [];
            }
          }

          return {
            id: text(q.id) || undefined,
            question: text(q.question),
            options,
            correctAnswer: text(q.correctAnswer),
            explanation: text(q.explanation),
            type: text(q.type).toUpperCase(),
            difficulty: text(q.difficulty).toUpperCase(),
            marks: Number(q.marks) > 0 ? Number(q.marks) : 1,
            topic: text(q.topic) || topic,
            courseId: courseId || null,
            programmeId: programmeId || null,
            semesterId: semesterId || null,
            source: "DEFAULT",
          };
        });

      return NextResponse.json({
        questions,
        source: "DEFAULT",
        fallback: true,
        message:
          "Questions were generated from the local DEFAULT Question Bank. No OpenAI API is required.",
      });
    }

    /*
     * SAVE
     */
    if (action === "save") {
      const questions = Array.isArray(body.questions)
        ? body.questions
        : [];

      if (!questions.length || questions.length > 100) {
        return NextResponse.json(
          {
            error: "Please provide 1 to 100 questions.",
          },
          { status: 400 },
        );
      }

      const saved = [];

      for (const item of questions) {
        const question = text(item?.question);
        const type = text(item?.type).toUpperCase();
        const difficulty = text(item?.difficulty).toUpperCase();

        const courseId = text(item?.courseId);
        const programmeId = text(item?.programmeId);
        const semesterId = text(item?.semesterId);

        const targetError = await validateTarget(
          session.instituteId,
          courseId,
          programmeId,
          semesterId,
        );

        if (
          targetError ||
          !question ||
          !validType(type) ||
          !validDifficulty(difficulty)
        ) {
          return NextResponse.json(
            {
              error:
                targetError || "Invalid question data.",
            },
            { status: 400 },
          );
        }

        const options = Array.isArray(item?.options)
          ? item.options
          : [];

        const correctAnswer = text(
          item?.correctAnswer,
        );

        const explanation = text(
          item?.explanation,
        );

        const marks =
          Number(item?.marks) > 0
            ? Number(item.marks)
            : 1;

        const topic =
          text(item?.topic) || null;

        const source =
          text(item?.source) || "DEFAULT";

        const result = await db.execute(sql`
          INSERT INTO question_bank (
            institute_id,
            course_id,
            programme_id,
            semester_id,
            created_by,
            question,
            type,
            options_json,
            correct_answer,
            explanation,
            difficulty,
            topic,
            marks,
            source
          )
          VALUES (
            ${session.instituteId},
            ${courseId || null},
            ${programmeId || null},
            ${semesterId || null},
            ${session.userId},
            ${question},
            ${type},
            ${JSON.stringify(options)}::jsonb,
            ${correctAnswer || null},
            ${explanation || null},
            ${difficulty},
            ${topic},
            ${marks},
            ${source}
          )
          RETURNING id
        `);

        saved.push(rowsOf(result)[0]?.id);
      }

      return NextResponse.json({
        success: true,
        savedIds: saved,
      });
    }

    return NextResponse.json(
      { error: "Unknown action." },
      { status: 400 },
    );
  } catch (error) {
    console.error(
      "POST /api/question-bank error:",
      error,
    );

    return NextResponse.json(
      { error: "Question Bank request failed." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 },
      );
    }

    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json(
        { error: "You do not have permission." },
        { status: 403 },
      );
    }

    const id = text(
      new URL(request.url).searchParams.get("id"),
    );

    if (!id) {
      return NextResponse.json(
        { error: "Question id is required." },
        { status: 400 },
      );
    }

    const result = await db.execute(sql`
      DELETE FROM question_bank
      WHERE id = ${id}
        AND institute_id = ${session.instituteId}
      RETURNING id
    `);

    if (!rowsOf(result)[0]) {
      return NextResponse.json(
        { error: "Question not found." },
        { status: 404 },
      );
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    console.error(
      "DELETE /api/question-bank error:",
      error,
    );

    return NextResponse.json(
      { error: "Failed to delete question." },
      { status: 500 },
    );
  }
}
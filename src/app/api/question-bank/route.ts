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
  return QUESTION_TYPES.includes(value as (typeof QUESTION_TYPES)[number]);
}

function validDifficulty(value: unknown): boolean {
  return DIFFICULTIES.includes(value as (typeof DIFFICULTIES)[number]);
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
    const rows = rowsOf(await db.execute(sql`
      SELECT id FROM courses
      WHERE id = ${courseId}
        AND institute_id = ${instituteId}
        AND status = 'ACTIVE'
      LIMIT 1
    `));
    if (!rows[0]) return "Selected course was not found or is inactive.";
  }

  if (programmeId) {
    const rows = rowsOf(await db.execute(sql`
      SELECT id FROM programmes
      WHERE id = ${programmeId}
        AND institute_id = ${instituteId}
        AND status = 'ACTIVE'
      LIMIT 1
    `));
    if (!rows[0]) return "Selected programme was not found or is inactive.";
  }

  if (semesterId) {
    const rows = rowsOf(await db.execute(sql`
      SELECT id FROM programme_semesters
      WHERE id = ${semesterId}
        AND programme_id = ${programmeId}
        AND institute_id = ${instituteId}
      LIMIT 1
    `));
    if (!rows[0]) return "Selected semester was not found for this programme.";
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(request.url);
    const options = url.searchParams.get("options") === "true";
    const courseId = text(url.searchParams.get("courseId"));
    const programmeId = text(url.searchParams.get("programmeId"));
    const semesterId = text(url.searchParams.get("semesterId"));

    if (options) {
      const [courses, programmes] = await Promise.all([
        db.execute(sql`
          SELECT id, name, course_no AS "courseNo"
          FROM courses
          WHERE institute_id = ${session.instituteId}
            AND status = 'ACTIVE'
          ORDER BY name ASC
        `),
        db.execute(sql`
          SELECT
            p.id, p.name, p.code,
            p.programme_no AS "programmeNo",
            COALESCE((
              SELECT json_agg(
                json_build_object(
                  'id', ps.id,
                  'name', ps.name,
                  'semesterNo', ps.semester_no
                ) ORDER BY ps.semester_no
              )
              FROM programme_semesters ps
              WHERE ps.programme_id = p.id
                AND ps.institute_id = p.institute_id
            ), '[]'::json) AS semesters
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
      LEFT JOIN courses c ON c.id = q.course_id
      LEFT JOIN programmes p ON p.id = q.programme_id
      LEFT JOIN programme_semesters ps ON ps.id = q.semester_id
      WHERE q.institute_id = ${session.instituteId}
        ${courseId ? sql`AND q.course_id = ${courseId}` : sql``}
        ${programmeId ? sql`AND q.programme_id = ${programmeId}` : sql``}
        ${semesterId ? sql`AND q.semester_id = ${semesterId}` : sql``}
      ORDER BY q.created_at DESC
    `);

    return NextResponse.json({ questions: rowsOf(result) });
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "You do not have permission." }, { status: 403 });
    }

    const body = await request.json();
    const action = text(body.action).toLowerCase();

    if (action === "generate") {
      const courseId = text(body.courseId);
      const programmeId = text(body.programmeId);
      const semesterId = text(body.semesterId);
      const topic = text(body.topic);
      const type = text(body.type).toUpperCase();
      const difficulty = text(body.difficulty).toUpperCase();
      const count = Math.min(Math.max(Number(body.count) || 5, 1), 30);

      const targetError = await validateTarget(
        session.instituteId,
        courseId,
        programmeId,
        semesterId,
      );
      if (targetError) {
        return NextResponse.json({ error: targetError }, { status: 400 });
      }

      if (!validType(type)) {
        return NextResponse.json({ error: "Invalid question type." }, { status: 400 });
      }

      if (!validDifficulty(difficulty)) {
        return NextResponse.json({ error: "Invalid difficulty." }, { status: 400 });
      }

      if (!topic) {
        return NextResponse.json({ error: "Topic is required." }, { status: 400 });
      }

      const apiKey = process.env.OPENAI_API_KEY;
      if (!apiKey) {
        return NextResponse.json(
          { error: "AI is not configured. Add OPENAI_API_KEY to the environment." },
          { status: 503 },
        );
      }

      const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

      const targetRows = rowsOf(
        await db.execute(
          courseId
            ? sql`
                SELECT
                  c.name AS "targetName",
                  NULL AS "semesterName"
                FROM courses c
                WHERE c.id = ${courseId}
                  AND c.institute_id = ${session.instituteId}
                LIMIT 1
              `
            : sql`
                SELECT
                  p.name AS "targetName",
                  ${semesterId ? sql`ps.name` : sql`NULL`} AS "semesterName"
                FROM programmes p
                ${
                  semesterId
                    ? sql`
                        LEFT JOIN programme_semesters ps
                          ON ps.id = ${semesterId}
                         AND ps.programme_id = p.id
                         AND ps.institute_id = p.institute_id
                      `
                    : sql``
                }
                WHERE p.id = ${programmeId}
                  AND p.institute_id = ${session.instituteId}
                LIMIT 1
              `,
        ),
      );
      const targetName = String(targetRows[0]?.targetName || "the selected subject");
      const semesterName = String(targetRows[0]?.semesterName || "");

      const systemPrompt = `You are an educational question writer for an institute LMS.
Return ONLY valid JSON with this exact shape:
{"questions":[{"question":"...","options":["A","B","C","D"],"correctAnswer":"...","explanation":"...","type":"MCQ","difficulty":"MEDIUM","marks":1}]}
Rules:
- Generate exactly the requested number of questions.
- Stay strictly within the supplied topic.
- Do not invent course-specific facts that are not reasonably general knowledge.
- MCQ must have exactly 4 options and correctAnswer must exactly match one option.
- TRUE_FALSE must have options ["True","False"] and correctAnswer must be one of them.
- SHORT_ANSWER and DESCRIPTIVE should use options: [].
- Keep questions clear and suitable for students.
- No markdown outside JSON.`;

      const userPrompt = [
        `Target: ${targetName}`,
        semesterName ? `Semester: ${semesterName}` : "",
        `Topic: ${topic}`,
        `Question type: ${type}`,
        `Difficulty: ${difficulty}`,
        `Number of questions: ${count}`,
      ].filter(Boolean).join("\n");

      const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          temperature: 0.7,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
        }),
      });

      if (!aiResponse.ok) {
        const detail = await aiResponse.text();
        console.error("OpenAI question generation failed:", detail);

        const fallbackQuestions = Array.from(
          { length: count },
          (_, index) => {
            if (type === "TRUE_FALSE") {
              return {
                question: `${topic}: Is this statement true or false?`,
                options: ["True", "False"],
                correctAnswer: "True",
                explanation:
                  "This is a locally generated fallback question. Review it before using it in an exam.",
                type,
                difficulty,
                marks: 1,
              };
            }

            if (type === "SHORT_ANSWER") {
              return {
                question: `Write a short answer about ${topic}.`,
                options: [],
                correctAnswer: "",
                explanation:
                  "This is a locally generated fallback question. Add or review the expected answer before using it.",
                type,
                difficulty,
                marks: 1,
              };
            }

            if (type === "DESCRIPTIVE") {
              return {
                question: `Explain ${topic} in detail.`,
                options: [],
                correctAnswer: "",
                explanation:
                  "This is a locally generated fallback question. Review the expected answer before using it.",
                type,
                difficulty,
                marks: 5,
              };
            }

            return {
              question: `Which statement is most appropriate about ${topic}?`,
              options: [
                `It is related to ${topic}.`,
                "It has no relation to the topic.",
                "It is unrelated to the subject.",
                "None of the above.",
              ],
              correctAnswer: `It is related to ${topic}.`,
              explanation:
                "This is a locally generated fallback question. Review it before using it in an exam.",
              type: "MCQ",
              difficulty,
              marks: 1,
            };
          },
        );

        return NextResponse.json({
          questions: fallbackQuestions,
          fallback: true,
          message:
            "OpenAI is currently unavailable, so local fallback questions were generated. Please review them before use.",
        });
      }

      const aiJson = await aiResponse.json();
      const rawContent = aiJson?.choices?.[0]?.message?.content;

      let parsed: any;
      try {
        parsed = JSON.parse(rawContent || "{}");
      } catch {
        return NextResponse.json(
          { error: "AI returned invalid question data." },
          { status: 502 },
        );
      }

      const questions = Array.isArray(parsed?.questions)
        ? parsed.questions
            .slice(0, count)
            .map((q: any) => ({
              question: text(q?.question),
              options: Array.isArray(q?.options) ? q.options.map(text).filter(Boolean) : [],
              correctAnswer: text(q?.correctAnswer),
              explanation: text(q?.explanation),
              type,
              difficulty,
              marks: Number(q?.marks) > 0 ? Number(q.marks) : 1,
              topic,
              courseId: courseId || null,
              programmeId: programmeId || null,
              semesterId: semesterId || null,
              source: "AI",
            }))
            .filter((q: any) => q.question)
        : [];

      if (questions.length !== count) {
        return NextResponse.json(
          { error: "AI did not return the requested number of valid questions." },
          { status: 502 },
        );
      }

      return NextResponse.json({ questions });
    }

    if (action === "save") {
      const questions = Array.isArray(body.questions) ? body.questions : [];
      if (!questions.length || questions.length > 100) {
        return NextResponse.json({ error: "Please provide 1 to 100 questions." }, { status: 400 });
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

        if (targetError || !question || !validType(type) || !validDifficulty(difficulty)) {
          return NextResponse.json(
            { error: targetError || "Invalid question data." },
            { status: 400 },
          );
        }

        const options = Array.isArray(item?.options) ? item.options : [];
        const correctAnswer = text(item?.correctAnswer);
        const explanation = text(item?.explanation);
        const marks = Number(item?.marks) > 0 ? Number(item.marks) : 1;
        const topic = text(item?.topic) || null;

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
            ${text(item?.source) || "AI"}
          )
          RETURNING id
        `);

        saved.push(rowsOf(result)[0]?.id);
      }

      return NextResponse.json({ success: true, savedIds: saved });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (error) {
    console.error("POST /api/question-bank error:", error);
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!MANAGE_ROLES.includes(session.role)) {
      return NextResponse.json({ error: "You do not have permission." }, { status: 403 });
    }

    const id = text(new URL(request.url).searchParams.get("id"));
    if (!id) {
      return NextResponse.json({ error: "Question id is required." }, { status: 400 });
    }

    const result = await db.execute(sql`
      DELETE FROM question_bank
      WHERE id = ${id}
        AND institute_id = ${session.instituteId}
      RETURNING id
    `);

    if (!rowsOf(result)[0]) {
      return NextResponse.json({ error: "Question not found." }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/question-bank error:", error);
    return NextResponse.json({ error: "Failed to delete question." }, { status: 500 });
  }
}

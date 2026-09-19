import { db } from "@/db";
import {
  exams,
  examSubjects,
  batches,
  programmes,
  programmeSemesters,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureExamSchema } from "@/lib/academic";

type ExamMode = "BATCH" | "PROGRAMME" | "COURSE";

type PreparedSubject = {
  subjectName: string;
  totalMarks: number;
};

type CourseInfo = {
  id: string;
  name: string;
  courseNo: number | null;
};

type CourseClassInfo = {
  id: string;
  classNo: number | null;
  title: string;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function rows(result: any): any[] {
  return result?.rows ?? (Array.isArray(result) ? result : []);
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return jsonError("Unauthorized", 401);
    }

    await ensureExamSchema();

    const instituteId = session.instituteId;
    const { searchParams } = new URL(request.url);

    const batchId = searchParams.get("batchId")?.trim() || "";
    const programmeId = searchParams.get("programmeId")?.trim() || "";
    const semesterId = searchParams.get("semesterId")?.trim() || "";
    const courseId = searchParams.get("courseId")?.trim() || "";
    const courseClassId =
      searchParams.get("courseClassId")?.trim() || "";
    const programmeClassId = searchParams.get("programmeClassId")?.trim() || "";

    const conditions = [
      eq(exams.instituteId, instituteId),
    ];

    if (batchId) {
      conditions.push(eq(exams.batchId, batchId));
    }

    if (programmeId) {
      conditions.push(eq(exams.programmeId, programmeId));
    }

    if (semesterId) {
      conditions.push(eq(exams.semesterId, semesterId));
    }
    if (programmeClassId) {
      conditions.push(sql`e.programme_class_id = ${programmeClassId}` as any);
    }

    const examRows = await db
      .select({
        exam: exams,
        batchName: batches.name,
        programmeName: programmes.name,
        programmeCode: programmes.code,
        semesterName: programmeSemesters.name,
        semesterNo: programmeSemesters.semesterNo,
      })
      .from(exams)
      .leftJoin(
        batches,
        eq(exams.batchId, batches.id)
      )
      .leftJoin(
        programmes,
        eq(exams.programmeId, programmes.id)
      )
      .leftJoin(
        programmeSemesters,
        eq(
          exams.semesterId,
          programmeSemesters.id
        )
      )
      .where(and(...conditions))
      .orderBy(desc(exams.createdAt));

    let filteredExamRows = examRows;

    if (courseId || courseClassId) {
      const courseConditions = [
        sql`e.institute_id = ${instituteId}`,
      ];

      if (courseId) {
        courseConditions.push(
          sql`e.course_id = ${courseId}`
        );
      }

      if (courseClassId) {
        courseConditions.push(
          sql`e.course_class_id = ${courseClassId}`
        );
      }

      const courseExamResult = await db.execute(
        sql`
          SELECT
            e.id
          FROM exams e
          WHERE ${sql.join(courseConditions, sql` AND `)}
          ORDER BY e.created_at DESC
        `
      );

      const allowedIds = new Set(
        rows(courseExamResult).map((r) => r.id)
      );

      filteredExamRows = examRows.filter((row) =>
        allowedIds.has(row.exam.id)
      );
    }

    const examIds = filteredExamRows.map(
      (row) => row.exam.id
    );

    if (examIds.length === 0) {
      return Response.json({
        exams: [],
      });
    }

    const subjectRows = await db
      .select({
        id: examSubjects.id,
        instituteId: examSubjects.instituteId,
        examId: examSubjects.examId,
        subjectName: examSubjects.subjectName,
        totalMarks: examSubjects.totalMarks,
      })
      .from(examSubjects)
      .where(
        eq(
          examSubjects.instituteId,
          instituteId
        )
      );

    const subjectsByExam = new Map<
      string,
      Array<{
        id: string;
        instituteId: string;
        examId: string;
        subjectName: string;
        totalMarks: number;
      }>
    >();

    for (const subject of subjectRows) {
      if (!examIds.includes(subject.examId)) {
        continue;
      }

      const list =
        subjectsByExam.get(subject.examId) ?? [];

      list.push({
        id: subject.id,
        instituteId: subject.instituteId,
        examId: subject.examId,
        subjectName: subject.subjectName,
        totalMarks: Number(
          subject.totalMarks
        ),
      });

      subjectsByExam.set(
        subject.examId,
        list
      );
    }

    const courseExamIds = filteredExamRows
      .filter(
        (row) =>
          row.exam.id &&
          courseId
      )
      .map((row) => row.exam.id);

    const courseDetails = new Map<
      string,
      {
        courseId: string | null;
        courseName: string | null;
        courseNo: number | null;
        courseClassId: string | null;
        courseClassNo: number | null;
        courseClassTitle: string | null;
      }
    >();

    if (
      courseExamIds.length > 0 ||
      filteredExamRows.length > 0
    ) {
      const courseResult = await db.execute(
        sql`
          SELECT
            e.id AS exam_id,
            e.course_id,
            c.name AS course_name,
            c.course_no,
            e.course_class_id,
            cc.class_no AS course_class_no,
            cc.title AS course_class_title
          FROM exams e
          LEFT JOIN courses c
            ON c.id = e.course_id
          LEFT JOIN course_syllabus_classes cc
            ON cc.id = e.course_class_id
          WHERE e.institute_id = ${instituteId}
        `
      );

      for (const item of rows(courseResult)) {
        courseDetails.set(item.exam_id, {
          courseId: item.course_id ?? null,
          courseName:
            item.course_name ?? null,
          courseNo:
            item.course_no == null
              ? null
              : Number(item.course_no),
          courseClassId:
            item.course_class_id ?? null,
          courseClassNo:
            item.course_class_no == null
              ? null
              : Number(
                  item.course_class_no
                ),
          courseClassTitle:
            item.course_class_title ?? null,
        });
      }
    }

    return Response.json({
      exams: filteredExamRows.map((row) => {
        const course =
          courseDetails.get(row.exam.id);

        const mode: ExamMode =
          course?.courseId
            ? "COURSE"
            : row.exam.programmeId
              ? "PROGRAMME"
              : "BATCH";

        return {
          exam: {
            ...row.exam,
            courseId:
              course?.courseId ?? null,
            courseClassId:
              course?.courseClassId ?? null,
            programmeClassId: (row.exam as any).programmeClassId ?? null,
          },
          mode,
          batchName:
            row.batchName ?? null,
          programmeName:
            row.programmeName ?? null,
          programmeCode:
            row.programmeCode ?? null,
          semesterName:
            row.semesterName ?? null,
          semesterNo:
            row.semesterNo ?? null,
          courseName:
            course?.courseName ?? null,
          courseNo:
            course?.courseNo ?? null,
          courseClassNo:
            course?.courseClassNo ?? null,
          courseClassTitle:
            course?.courseClassTitle ?? null,
          subjects:
            subjectsByExam.get(
              row.exam.id
            ) ?? [],
        };
      }),
    });
  } catch (error) {
    console.error(
      "GET /api/exams error:",
      error
    );

    return jsonError(
      "Failed to load exams.",
      500
    );
  }
}

export async function POST(
  request: Request
) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return jsonError(
        "Unauthorized",
        401
      );
    }

    await ensureExamSchema();

    const instituteId =
      session.instituteId;

    const body = await request.json();

    const mode: ExamMode =
      body?.mode === "COURSE"
        ? "COURSE"
        : body?.mode === "PROGRAMME"
          ? "PROGRAMME"
          : "BATCH";

    const batchId =
      typeof body?.batchId === "string"
        ? body.batchId.trim()
        : "";

    const programmeId =
      typeof body?.programmeId === "string"
        ? body.programmeId.trim()
        : "";

    const semesterId =
      typeof body?.semesterId === "string"
        ? body.semesterId.trim()
        : "";

    const courseId =
      typeof body?.courseId === "string"
        ? body.courseId.trim()
        : "";

    const courseClassId =
      typeof body?.courseClassId === "string"
        ? body.courseClassId.trim()
        : "";
    const programmeClassId = typeof body?.programmeClassId === "string" ? body.programmeClassId.trim() : "";

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const examDate =
      typeof body?.examDate === "string" &&
      body.examDate.trim()
        ? body.examDate.trim()
        : null;

    const subjects = Array.isArray(
      body?.subjects
    )
      ? body.subjects
      : [];

    if (!name) {
      return jsonError(
        "Exam name is required.",
        400
      );
    }

    if (name.length > 255) {
      return jsonError(
        "Exam name must be 255 characters or less.",
        400
      );
    }

    if (subjects.length === 0) {
      return jsonError(
        "Add at least one subject.",
        400
      );
    }

    if (
      examDate &&
      !/^\d{4}-\d{2}-\d{2}$/.test(
        examDate
      )
    ) {
      return jsonError(
        "Exam date must be in YYYY-MM-DD format.",
        400
      );
    }

    const preparedSubjects: PreparedSubject[] =
      subjects.map(
        (subject: unknown) => {
          const item =
            subject &&
            typeof subject === "object"
              ? (subject as Record<
                  string,
                  unknown
                >)
              : {};

          return {
            subjectName:
              typeof item.subjectName ===
              "string"
                ? item.subjectName.trim()
                : "",
            totalMarks: Number(
              item.totalMarks
            ),
          };
        }
      );

    for (const subject of preparedSubjects) {
      if (!subject.subjectName) {
        return jsonError(
          "Every subject must have a name.",
          400
        );
      }

      if (
        subject.subjectName.length >
        255
      ) {
        return jsonError(
          "Subject name must be 255 characters or less.",
          400
        );
      }

      if (
        !Number.isInteger(
          subject.totalMarks
        ) ||
        subject.totalMarks <= 0
      ) {
        return jsonError(
          "Every subject must have a positive whole-number total mark.",
          400
        );
      }

      if (
        subject.totalMarks > 1000
      ) {
        return jsonError(
          "Total marks cannot exceed 1000.",
          400
        );
      }
    }

    const subjectNames =
      preparedSubjects.map(
        (subject) =>
          subject.subjectName.toLowerCase()
      );

    if (
      new Set(subjectNames).size !==
      subjectNames.length
    ) {
      return jsonError(
        "Duplicate subject names are not allowed.",
        400
      );
    }

    let batch: {
      id: string;
      name: string;
    } | null = null;

    let programme: {
      id: string;
      name: string;
    } | null = null;

    let semester: {
      id: string;
      name: string;
      semesterNo: number;
    } | null = null;

    let course: CourseInfo | null =
      null;

    let courseClass:
      | CourseClassInfo
      | null = null;

    if (mode === "BATCH") {
      if (!batchId) {
        return jsonError(
          "Batch is required for a Batch Exam.",
          400
        );
      }

      const batchRows =
        await db
          .select({
            id: batches.id,
            name: batches.name,
          })
          .from(batches)
          .where(
            and(
              eq(
                batches.id,
                batchId
              ),
              eq(
                batches.instituteId,
                instituteId
              )
            )
          )
          .limit(1);

      batch =
        batchRows[0] ?? null;

      if (!batch) {
        return jsonError(
          "Selected batch was not found.",
          404
        );
      }
    }

    if (mode === "PROGRAMME") {
      if (!programmeId) {
        return jsonError(
          "Programme is required for a Programme Exam.",
          400
        );
      }

      if (!semesterId) {
        return jsonError(
          "Semester is required for a Programme Exam.",
          400
        );
      }

      const programmeRows =
        await db
          .select({
            id: programmes.id,
            name: programmes.name,
          })
          .from(programmes)
          .where(
            and(
              eq(
                programmes.id,
                programmeId
              ),
              eq(
                programmes.instituteId,
                instituteId
              )
            )
          )
          .limit(1);

      programme =
        programmeRows[0] ?? null;

      if (!programme) {
        return jsonError(
          "Selected programme was not found.",
          404
        );
      }

      const classRows = await db.execute(sql`SELECT id, title, class_no FROM programme_syllabus_classes WHERE id = ${programmeClassId} AND programme_id = ${programmeId} AND semester_id = ${semesterId} AND institute_id = ${instituteId} LIMIT 1`);
       if (!rows(classRows)[0]) return jsonError("Selected programme class was not found.", 404);

       const semesterRows =
        await db
          .select({
            id: programmeSemesters.id,
            name: programmeSemesters.name,
            semesterNo:
              programmeSemesters.semesterNo,
          })
          .from(
            programmeSemesters
          )
          .where(
            and(
              eq(
                programmeSemesters.id,
                semesterId
              ),
              eq(
                programmeSemesters.programmeId,
                programmeId
              ),
              eq(
                programmeSemesters.instituteId,
                instituteId
              )
            )
          )
          .limit(1);

      semester =
        semesterRows[0] ?? null;

      if (!semester) {
        return jsonError(
          "Selected semester does not belong to the selected programme.",
          400
        );
      }
    }

    if (mode === "COURSE") {
      if (!courseId) {
        return jsonError(
          "Course is required for a Course Exam.",
          400
        );
      }

      if (!courseClassId) {
        return jsonError(
          "Course Class is required for a Course Exam.",
          400
        );
      }

      const courseResult =
        await db.execute(
          sql`
            SELECT
              id,
              name,
              course_no
            FROM courses
            WHERE id = ${courseId}
              AND institute_id = ${instituteId}
            LIMIT 1
          `
        );

      const courseRow =
        rows(courseResult)[0];

      if (!courseRow) {
        return jsonError(
          "Selected course was not found.",
          404
        );
      }

      course = {
        id: courseRow.id,
        name: courseRow.name,
        courseNo:
          courseRow.course_no == null
            ? null
            : Number(
                courseRow.course_no
              ),
      };

      const classResult =
        await db.execute(
          sql`
            SELECT
              id,
              class_no,
              title
            FROM course_syllabus_classes
            WHERE id = ${courseClassId}
              AND course_id = ${courseId}
              AND institute_id = ${instituteId}
            LIMIT 1
          `
        );

      const classRow =
        rows(classResult)[0];

      if (!classRow) {
        return jsonError(
          "Selected course class was not found.",
          404
        );
      }

      courseClass = {
        id: classRow.id,
        classNo:
          classRow.class_no == null
            ? null
            : Number(
                classRow.class_no
              ),
        title: classRow.title,
      };
    }

    const examResult =
      await db.execute(
        sql`
          INSERT INTO exams (
            institute_id,
            batch_id,
            programme_id,
            semester_id,
            course_id,
            course_class_id,
            programme_class_id,
            name,
            exam_date
          )
          VALUES (
            ${instituteId},
            ${batchId || null},
            ${
              mode === "PROGRAMME"
                ? programmeId
                : null
            },
            ${
              mode === "PROGRAMME"
                ? semesterId
                : null
            },
            ${
              mode === "COURSE"
                ? courseId
                : null
            },
            ${
              mode === "COURSE"
                ? courseClassId
                : null
            },
            ${mode === "PROGRAMME" ? programmeClassId : null},
            ${name},
            ${examDate}
          )
          RETURNING *
        `
      );

    const createdExam =
      rows(examResult)[0];

    if (!createdExam) {
      throw new Error(
        "Failed to create exam."
      );
    }

    const createdSubjects =
      await db
        .insert(examSubjects)
        .values(
          preparedSubjects.map(
            (subject) => ({
              instituteId,
              examId:
                createdExam.id,
              subjectName:
                subject.subjectName,
              totalMarks:
                subject.totalMarks,
            })
          )
        )
        .returning();

    return Response.json(
      {
        message:
          "Exam created successfully.",

        exam: createdExam,

        subjects:
          createdSubjects,

        academic: {
          mode,

          batchId:
            batch?.id ?? null,

          batchName:
            batch?.name ?? null,

          programmeId:
            programme?.id ?? null,

          programmeName:
            programme?.name ?? null,

          semesterId:
            semester?.id ?? null,

          semesterNo:
            semester?.semesterNo ??
            null,

          semesterName:
            semester?.name ?? null,

          courseId:
            course?.id ?? null,

          courseName:
            course?.name ?? null,

          courseNo:
            course?.courseNo ?? null,

          courseClassId:
            courseClass?.id ??
            null,

          courseClassNo:
            courseClass?.classNo ??
            null,

          courseClassTitle:
            courseClass?.title ??
            null,
        },
      },
      {
        status: 201,
      }
    );
  } catch (error) {
    console.error(
      "POST /api/exams error:",
      error
    );

    return jsonError(
      error instanceof Error
        ? error.message
        : "Failed to create exam.",
      500
    );
  }
}
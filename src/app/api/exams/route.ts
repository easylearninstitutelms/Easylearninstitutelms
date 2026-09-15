import { db } from "@/db";
import {
  exams,
  examSubjects,
  batches,
  programmes,
  programmeSemesters,
} from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

type PreparedSubject = {
  subjectName: string;
  totalMarks: number;
};

function jsonError(
  message: string,
  status: number
) {
  return Response.json(
    { error: message },
    { status }
  );
}

// ─────────────────────────────────────────────
// GET /api/exams
// ─────────────────────────────────────────────

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session || !session.instituteId) {
      return jsonError("Unauthorized", 401);
    }

    const instituteId = session.instituteId;

    const { searchParams } =
      new URL(request.url);

    const batchId =
      searchParams.get("batchId")?.trim() || "";

    const programmeId =
      searchParams
        .get("programmeId")
        ?.trim() || "";

    const semesterId =
      searchParams
        .get("semesterId")
        ?.trim() || "";

    const conditions = [
      eq(
        exams.instituteId,
        instituteId
      ),
    ];

    if (batchId) {
      conditions.push(
        eq(
          exams.batchId,
          batchId
        )
      );
    }

    if (programmeId) {
      conditions.push(
        eq(
          exams.programmeId,
          programmeId
        )
      );
    }

    if (semesterId) {
      conditions.push(
        eq(
          exams.semesterId,
          semesterId
        )
      );
    }

    const examRows = await db
      .select({
        exam: exams,

        batchName:
          batches.name,

        programmeName:
          programmes.name,

        programmeCode:
          programmes.code,

        semesterName:
          programmeSemesters.name,

        semesterNo:
          programmeSemesters.semesterNo,
      })
      .from(exams)
      .leftJoin(
        batches,
        eq(
          exams.batchId,
          batches.id
        )
      )
      .leftJoin(
        programmes,
        eq(
          exams.programmeId,
          programmes.id
        )
      )
      .leftJoin(
        programmeSemesters,
        eq(
          exams.semesterId,
          programmeSemesters.id
        )
      )
      .where(and(...conditions))
      .orderBy(
        desc(exams.createdAt)
      );

    if (examRows.length === 0) {
      return Response.json({
        exams: [],
      });
    }

    const examIds =
      examRows.map(
        (row) => row.exam.id
      );

    const subjectRows = await db
      .select({
        id:
          examSubjects.id,

        instituteId:
          examSubjects.instituteId,

        examId:
          examSubjects.examId,

        subjectName:
          examSubjects.subjectName,

        totalMarks:
          examSubjects.totalMarks,
      })
      .from(examSubjects)
      .where(
        eq(
          examSubjects.instituteId,
          instituteId
        )
      );

    const subjectsByExam =
      new Map<
        string,
        Array<{
          id: string;
          instituteId: string;
          examId: string;
          subjectName: string;
          totalMarks: number;
        }>
      >();

    for (
      const subject of subjectRows
    ) {
      if (
        !examIds.includes(
          subject.examId
        )
      ) {
        continue;
      }

      const existing =
        subjectsByExam.get(
          subject.examId
        ) ?? [];

      existing.push({
        id:
          subject.id,

        instituteId:
          subject.instituteId,

        examId:
          subject.examId,

        subjectName:
          subject.subjectName,

        totalMarks:
          Number(
            subject.totalMarks
          ),
      });

      subjectsByExam.set(
        subject.examId,
        existing
      );
    }

    const responseExams =
      examRows.map((row) => ({
        exam:
          row.exam,

        batchName:
          row.batchName ??
          "Unknown Batch",

        programmeName:
          row.programmeName ??
          "Unknown Programme",

        programmeCode:
          row.programmeCode ??
          null,

        semesterName:
          row.semesterName ??
          "Unknown Semester",

        semesterNo:
          row.semesterNo ??
          null,

        subjects:
          subjectsByExam.get(
            row.exam.id
          ) ?? [],
      }));

    return Response.json({
      exams: responseExams,
    });
  } catch (error) {
    console.error(
      "GET /api/exams error:",
      error
    );

    return Response.json(
      {
        error:
          "Failed to load exams.",
      },
      {
        status: 500,
      }
    );
  }
}

// ─────────────────────────────────────────────
// POST /api/exams
//
// Flow:
// Programme
//      ↓
// Semester
//      ↓
// Batch
//      ↓
// Exam
//      ↓
// Subjects
// ─────────────────────────────────────────────

export async function POST(
  request: Request
) {
  try {
    const session =
      await getSession();

    if (
      !session ||
      !session.instituteId
    ) {
      return jsonError(
        "Unauthorized",
        401
      );
    }

    // IMPORTANT:
    // Keep the institute ID in a
    // guaranteed string variable.
    const instituteId =
      session.instituteId;

    const body =
      await request.json();

    // ─────────────────────────────────────
    // Basic values
    // ─────────────────────────────────────

    const batchId =
      typeof body?.batchId ===
      "string"
        ? body.batchId.trim()
        : "";

    const programmeId =
      typeof body?.programmeId ===
      "string"
        ? body.programmeId.trim()
        : "";

    const semesterId =
      typeof body?.semesterId ===
      "string"
        ? body.semesterId.trim()
        : "";

    const name =
      typeof body?.name ===
      "string"
        ? body.name.trim()
        : "";

    const examDate =
      typeof body?.examDate ===
        "string" &&
      body.examDate.trim()
        ? body.examDate.trim()
        : undefined;

    const subjects =
      Array.isArray(
        body?.subjects
      )
        ? body.subjects
        : [];

    // ─────────────────────────────────────
    // Required validation
    // ─────────────────────────────────────

    if (!programmeId) {
      return jsonError(
        "Programme is required.",
        400
      );
    }

    if (!semesterId) {
      return jsonError(
        "Semester is required.",
        400
      );
    }

    if (!batchId) {
      return jsonError(
        "Batch is required.",
        400
      );
    }

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

    // ─────────────────────────────────────
    // Validate exam date
    // ─────────────────────────────────────

    if (examDate) {
      const validDate =
        /^\d{4}-\d{2}-\d{2}$/.test(
          examDate
        );

      if (!validDate) {
        return jsonError(
          "Exam date must be in YYYY-MM-DD format.",
          400
        );
      }
    }

    // ─────────────────────────────────────
    // Prepare subjects
    // ─────────────────────────────────────

    const preparedSubjects:
      PreparedSubject[] =
      subjects.map(
        (subject: unknown) => {
          const item =
            subject &&
            typeof subject ===
              "object"
              ? (subject as Record<
                  string,
                  unknown
                >)
              : {};

          const subjectName =
            typeof item.subjectName ===
            "string"
              ? item.subjectName.trim()
              : "";

          const totalMarks =
            Number(
              item.totalMarks
            );

          return {
            subjectName,
            totalMarks,
          };
        }
      );

    // ─────────────────────────────────────
    // Subject validation
    // ─────────────────────────────────────

    for (
      const subject of
        preparedSubjects
    ) {
      if (
        !subject.subjectName
      ) {
        return jsonError(
          "Every subject must have a name.",
          400
        );
      }

      if (
        subject.subjectName
          .length > 255
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
        subject.totalMarks >
        1000
      ) {
        return jsonError(
          "Total marks cannot exceed 1000.",
          400
        );
      }
    }

    // ─────────────────────────────────────
    // Duplicate subject validation
    // ─────────────────────────────────────

    const subjectNames =
      preparedSubjects.map(
        (subject) =>
          subject.subjectName
            .trim()
            .toLowerCase()
      );

    if (
      new Set(
        subjectNames
      ).size !==
      subjectNames.length
    ) {
      return jsonError(
        "Duplicate subject names are not allowed.",
        400
      );
    }

    // ─────────────────────────────────────
    // Validate Programme
    // ─────────────────────────────────────

    const [programme] =
      await db
        .select({
          id:
            programmes.id,

          instituteId:
            programmes
              .instituteId,

          name:
            programmes.name,
        })
        .from(
          programmes
        )
        .where(
          and(
            eq(
              programmes.id,
              programmeId
            ),

            eq(
              programmes
                .instituteId,
              instituteId
            )
          )
        )
        .limit(1);

    if (!programme) {
      return jsonError(
        "Selected programme was not found.",
        404
      );
    }

    // ─────────────────────────────────────
    // Validate Semester
    //
    // Semester must belong to
    // selected Programme.
    // ─────────────────────────────────────

    const [semester] =
      await db
        .select({
          id:
            programmeSemesters.id,

          instituteId:
            programmeSemesters
              .instituteId,

          programmeId:
            programmeSemesters
              .programmeId,

          semesterNo:
            programmeSemesters
              .semesterNo,

          name:
            programmeSemesters
              .name,
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
              programmeSemesters
                .programmeId,
              programmeId
            ),

            eq(
              programmeSemesters
                .instituteId,
              instituteId
            )
          )
        )
        .limit(1);

    if (!semester) {
      return jsonError(
        "Selected semester does not belong to the selected programme.",
        400
      );
    }

    // ─────────────────────────────────────
    // Validate Batch
    //
    // Batch must belong to:
    // same institute
    // same programme
    // same semester
    // ─────────────────────────────────────

    const [batch] =
      await db
        .select({
          id:
            batches.id,

          instituteId:
            batches
              .instituteId,

          programmeId:
            batches
              .programmeId,

          semesterId:
            batches
              .semesterId,

          name:
            batches.name,
        })
        .from(batches)
        .where(
          and(
            eq(
              batches.id,
              batchId
            ),

            eq(
              batches
                .instituteId,
              instituteId
            )
          )
        )
        .limit(1);

    if (!batch) {
      return jsonError(
        "Selected batch was not found.",
        404
      );
    }

    if (
      batch.programmeId !==
      programmeId
    ) {
      return jsonError(
        "Selected batch does not belong to the selected programme.",
        400
      );
    }

    if (
      batch.semesterId !==
      semesterId
    ) {
      return jsonError(
        "Selected batch does not belong to the selected semester.",
        400
      );
    }

    // ─────────────────────────────────────
    // Create Exam + Subjects
    // in one transaction
    // ─────────────────────────────────────

    const examValues = {
      instituteId:
        instituteId,

      batchId:
        batchId,

      programmeId:
        programmeId,

      semesterId:
        semesterId,

      name:
        name,

      ...(examDate !==
      undefined
        ? {
            examDate:
              examDate,
          }
        : {}),
    };

    const result =
      await db.transaction(
        async (tx) => {
          const [
            createdExam,
          ] = await tx
            .insert(exams)
            .values(
              examValues
            )
            .returning();

          if (
            !createdExam
          ) {
            throw new Error(
              "Failed to create exam."
            );
          }

          const createdSubjects =
            await tx
              .insert(
                examSubjects
              )
              .values(
                preparedSubjects.map(
                  (
                    subject
                  ) => ({
                    instituteId:
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

          return {
            exam:
              createdExam,

            subjects:
              createdSubjects,
          };
        }
      );

    // ─────────────────────────────────────
    // Success
    // ─────────────────────────────────────

    return Response.json(
      {
        message:
          "Exam created successfully.",

        exam:
          result.exam,

        subjects:
          result.subjects,

        academic: {
          programmeId:
            programme.id,

          programmeName:
            programme.name,

          semesterId:
            semester.id,

          semesterNo:
            semester.semesterNo,

          semesterName:
            semester.name,

          batchId:
            batch.id,

          batchName:
            batch.name,
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

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create exam.",
      },
      {
        status: 500,
      }
    );
  }
}
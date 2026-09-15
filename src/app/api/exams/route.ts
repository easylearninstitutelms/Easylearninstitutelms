import { db } from "@/db";
import {
  exams,
  examSubjects,
  batches,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId");

    const examConditions = [
      eq(exams.instituteId, session.instituteId),
    ];

    if (batchId) {
      examConditions.push(eq(exams.batchId, batchId));
    }

    const examRows = await db
      .select({
        exam: exams,
        batchName: batches.name,
      })
      .from(exams)
      .leftJoin(
        batches,
        eq(exams.batchId, batches.id)
      )
      .where(and(...examConditions))
      .orderBy(desc(exams.createdAt));

    if (examRows.length === 0) {
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
          session.instituteId
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
      const existing =
        subjectsByExam.get(subject.examId) ?? [];

      existing.push({
        id: subject.id,
        instituteId: subject.instituteId,
        examId: subject.examId,
        subjectName: subject.subjectName,
        totalMarks: Number(subject.totalMarks),
      });

      subjectsByExam.set(
        subject.examId,
        existing
      );
    }

    const responseExams = examRows.map(
      (row) => ({
        exam: row.exam,
        batchName:
          row.batchName ?? "Unknown Batch",
        subjects:
          subjectsByExam.get(row.exam.id) ?? [],
      })
    );

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
        error: "Failed to load exams.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const body = await request.json();

    const batchId =
      typeof body?.batchId === "string"
        ? body.batchId.trim()
        : "";

    const name =
      typeof body?.name === "string"
        ? body.name.trim()
        : "";

    const examDate =
      typeof body?.examDate === "string" &&
      body.examDate.trim()
        ? body.examDate.trim()
        : null;

    const subjects = Array.isArray(body?.subjects)
      ? body.subjects
      : [];

    if (!batchId || !name) {
      return Response.json(
        {
          error:
            "Batch and exam name are required.",
        },
        { status: 400 }
      );
    }

    if (name.length > 255) {
      return Response.json(
        {
          error:
            "Exam name must be 255 characters or less.",
        },
        { status: 400 }
      );
    }

    if (subjects.length === 0) {
      return Response.json(
        {
          error:
            "Add at least one subject.",
        },
        { status: 400 }
      );
    }

    const preparedSubjects: Array<{
      subjectName: string;
      totalMarks: number;
    }> = subjects.map(
      (subject: unknown) => {
        const item =
          subject &&
          typeof subject === "object"
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

        const totalMarks = Number(
          item.totalMarks
        );

        return {
          subjectName,
          totalMarks,
        };
      }
    );

    for (const subject of preparedSubjects) {
      if (!subject.subjectName) {
        return Response.json(
          {
            error:
              "Every subject must have a name.",
          },
          { status: 400 }
        );
      }

      if (
        !Number.isInteger(
          subject.totalMarks
        ) ||
        subject.totalMarks <= 0
      ) {
        return Response.json(
          {
            error:
              "Every subject must have a positive whole-number total mark.",
          },
          { status: 400 }
        );
      }
    }

    const subjectNames =
      preparedSubjects.map(
        (subject: {
          subjectName: string;
          totalMarks: number;
        }) =>
          subject.subjectName.toLowerCase()
      );

    if (
      new Set(subjectNames).size !==
      subjectNames.length
    ) {
      return Response.json(
        {
          error:
            "Duplicate subject names are not allowed.",
        },
        { status: 400 }
      );
    }

    const [batch] = await db
      .select({
        id: batches.id,
        instituteId: batches.instituteId,
      })
      .from(batches)
      .where(
        and(
          eq(batches.id, batchId),
          eq(
            batches.instituteId,
            session.instituteId
          )
        )
      )
      .limit(1);

    if (!batch) {
      return Response.json(
        {
          error:
            "Selected batch was not found.",
        },
        { status: 404 }
      );
    }

    const result = await db.transaction(
      async (tx) => {
        const [exam] = await tx
          .insert(exams)
          .values({
            instituteId:
              session.instituteId!,
            batchId,
            name,
            examDate,
          })
          .returning();

        if (!exam) {
          throw new Error(
            "Failed to create exam."
          );
        }

        const insertedSubjects =
          await tx
            .insert(examSubjects)
            .values(
              preparedSubjects.map(
                (subject) => ({
                  instituteId:
                    session.instituteId!,
                  examId: exam.id,
                  subjectName:
                    subject.subjectName,
                  totalMarks:
                    subject.totalMarks,
                })
              )
            )
            .returning();

        return {
          exam,
          subjects: insertedSubjects,
        };
      }
    );

    return Response.json(
      {
        message:
          "Exam created successfully.",
        exam: result.exam,
        subjects: result.subjects,
      },
      { status: 201 }
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
      { status: 500 }
    );
  }
}

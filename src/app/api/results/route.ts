import { db } from "@/db";
import {
  results,
  exams,
  examSubjects,
  students,
  batches,
  enrollments,
} from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

type ResultInput = {
  examId: string;
  examSubjectId: string;
  studentId: string;
  marks: number;
  remarks?: string | null;
};

const MAX_BULK_RESULTS = 500;

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function isValidUuid(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function calculateGrade(marks: number, totalMarks: number): string {
  const percentage = totalMarks > 0 ? (marks / totalMarks) * 100 : 0;

  if (percentage >= 80) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "A-";
  if (percentage >= 50) return "B";
  if (percentage >= 40) return "C";
  if (percentage >= 33) return "D";
  return "F";
}

function calculatePercentage(
  marks: number | string | null,
  totalMarks: number | string | null
): number {
  const markValue = Number(marks ?? 0);
  const totalValue = Number(totalMarks ?? 0);

  if (
    !Number.isFinite(markValue) ||
    !Number.isFinite(totalValue) ||
    totalValue <= 0
  ) {
    return 0;
  }

  return Number(((markValue / totalValue) * 100).toFixed(2));
}

function normalizeRemarks(value: unknown): string | null {
  if (value === undefined || value === null || value === "") {
    return null;
  }

  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 1000);
}

function normalizeMarks(value: unknown): number | null {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) {
      return null;
    }

    return value;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);

    if (!Number.isFinite(parsed)) {
      return null;
    }

    return parsed;
  }

  return null;
}

async function getExamContext(
  instituteId: string,
  examId: string,
  examSubjectId: string,
  studentId: string
) {
  const [exam] = await db
    .select({
      id: exams.id,
      batchId: exams.batchId,
      name: exams.name,
      examDate: exams.examDate,
    })
    .from(exams)
    .where(
      and(
        eq(exams.id, examId),
        eq(exams.instituteId, instituteId)
      )
    )
    .limit(1);

  if (!exam) {
    return {
      error: "Exam not found or does not belong to this institute.",
    };
  }

  const [subject] = await db
    .select({
      id: examSubjects.id,
      examId: examSubjects.examId,
      subjectName: examSubjects.subjectName,
      totalMarks: examSubjects.totalMarks,
    })
    .from(examSubjects)
    .where(
      and(
        eq(examSubjects.id, examSubjectId),
        eq(examSubjects.examId, examId),
        eq(examSubjects.instituteId, instituteId)
      )
    )
    .limit(1);

  if (!subject) {
    return {
      error: "Exam subject not found or does not belong to this exam.",
    };
  }

  const [student] = await db
    .select({
      id: students.id,
      name: students.name,
      studentId: students.studentId,
      photoUrl: students.photoUrl,
    })
    .from(students)
    .where(
      and(
        eq(students.id, studentId),
        eq(students.instituteId, instituteId)
      )
    )
    .limit(1);

  if (!student) {
    return {
      error: "Student not found or does not belong to this institute.",
    };
  }

  const [enrollment] = await db
    .select({
      id: enrollments.id,
    })
    .from(enrollments)
    .where(
      and(
        eq(enrollments.instituteId, instituteId),
        eq(enrollments.studentId, studentId),
        eq(enrollments.batchId, exam.batchId),
        eq(enrollments.status, "ACTIVE")
      )
    )
    .limit(1);

  if (!enrollment) {
    return {
      error: "Student is not actively enrolled in the exam batch.",
    };
  }

  return {
    exam,
    subject,
    student,
  };
}

export async function GET(request: Request) {
  try {
    const session = await getSession();

    if (!session || !session.instituteId) {
      return errorResponse("Unauthorized", 401);
    }

    const { searchParams } = new URL(request.url);

    const examId = searchParams.get("examId");
    const studentId = searchParams.get("studentId");
    const examSubjectId = searchParams.get("examSubjectId");
    const batchId = searchParams.get("batchId");

    const conditions = [
      eq(results.instituteId, session.instituteId),
    ];

    if (examId) {
      conditions.push(eq(results.examId, examId));
    }

    if (studentId) {
      conditions.push(eq(results.studentId, studentId));
    }

    if (examSubjectId) {
      conditions.push(eq(results.examSubjectId, examSubjectId));
    }

    const rows = await db
      .select({
        result: results,

        examName: exams.name,
        examDate: exams.examDate,

        subjectName: examSubjects.subjectName,
        totalMarks: examSubjects.totalMarks,

        studentName: students.name,
        studentCode: students.studentId,
        studentPhotoUrl: students.photoUrl,

        batchName: batches.name,
      })
      .from(results)
      .leftJoin(
        exams,
        and(
          eq(results.examId, exams.id),
          eq(exams.instituteId, session.instituteId)
        )
      )
      .leftJoin(
        examSubjects,
        and(
          eq(results.examSubjectId, examSubjects.id),
          eq(examSubjects.instituteId, session.instituteId)
        )
      )
      .leftJoin(
        students,
        and(
          eq(results.studentId, students.id),
          eq(students.instituteId, session.instituteId)
        )
      )
      .leftJoin(
        batches,
        and(
          eq(exams.batchId, batches.id),
          eq(batches.instituteId, session.instituteId)
        )
      )
      .where(
        and(
          ...conditions,
          ...(batchId
            ? [eq(exams.batchId, batchId)]
            : [])
        )
      )
      .orderBy(desc(results.createdAt));

    const formattedResults = rows.map((row) => ({
      ...row.result,

      examName: row.examName,
      examDate: row.examDate,

      subjectName: row.subjectName,
      totalMarks: row.totalMarks,

      studentName: row.studentName,
      studentCode: row.studentCode,

      // Student photo is now included in the Result API.
      photoUrl: row.studentPhotoUrl,

      batchName: row.batchName,

      percentage: calculatePercentage(
        row.result.marks,
        row.totalMarks
      ),
    }));

    return Response.json({
      results: formattedResults,
      count: formattedResults.length,
    });
  } catch (error) {
    console.error("GET /api/results error:", error);

    return errorResponse(
      "Failed to load results.",
      500
    );
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();

    if (!session || !session.instituteId) {
      return errorResponse("Unauthorized", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse("Invalid JSON request body.");
    }

    if (!body || typeof body !== "object") {
      return errorResponse("Request body is required.");
    }

    const rawBody = body as Record<string, unknown>;

    let inputs: unknown[];

    if (Array.isArray(rawBody.results)) {
      inputs = rawBody.results;
    } else {
      inputs = [rawBody];
    }

    if (inputs.length === 0) {
      return errorResponse(
        "At least one result is required."
      );
    }

    if (inputs.length > MAX_BULK_RESULTS) {
      return errorResponse(
        `Maximum ${MAX_BULK_RESULTS} results can be submitted at once.`
      );
    }

    const normalizedInputs: ResultInput[] = [];

    const incomingKeys = new Set<string>();

    for (let index = 0; index < inputs.length; index++) {
      const item = inputs[index];

      if (!item || typeof item !== "object") {
        return errorResponse(
          `Result ${index + 1} is invalid.`
        );
      }

      const data = item as Record<string, unknown>;

      const examId =
        typeof data.examId === "string"
          ? data.examId.trim()
          : "";

      const examSubjectId =
        typeof data.examSubjectId === "string"
          ? data.examSubjectId.trim()
          : "";

      const studentId =
        typeof data.studentId === "string"
          ? data.studentId.trim()
          : "";

      if (!isValidUuid(examId)) {
        return errorResponse(
          `Result ${index + 1}: examId is required.`
        );
      }

      if (!isValidUuid(examSubjectId)) {
        return errorResponse(
          `Result ${index + 1}: examSubjectId is required.`
        );
      }

      if (!isValidUuid(studentId)) {
        return errorResponse(
          `Result ${index + 1}: studentId is required.`
        );
      }

      const marks = normalizeMarks(data.marks);

      if (marks === null) {
        return errorResponse(
          `Result ${index + 1}: marks must be a valid number.`
        );
      }

      if (marks < 0) {
        return errorResponse(
          `Result ${index + 1}: marks cannot be negative.`
        );
      }

      const remarks = normalizeRemarks(data.remarks);

      const duplicateKey =
        `${examId}:${examSubjectId}:${studentId}`;

      if (incomingKeys.has(duplicateKey)) {
        return errorResponse(
          `Duplicate result found in the submitted data for result ${index + 1}.`
        );
      }

      incomingKeys.add(duplicateKey);

      normalizedInputs.push({
        examId,
        examSubjectId,
        studentId,
        marks,
        remarks,
      });
    }

    const insertedResults = await db.transaction(async (tx) => {
      const created = [];

      for (
        let index = 0;
        index < normalizedInputs.length;
        index++
      ) {
        const item = normalizedInputs[index];

        const [exam] = await tx
          .select({
            id: exams.id,
            batchId: exams.batchId,
            name: exams.name,
          })
          .from(exams)
          .where(
            and(
              eq(exams.id, item.examId),
              eq(
                exams.instituteId,
                session.instituteId!
              )
            )
          )
          .limit(1);

        if (!exam) {
          throw new Error(
            `Result ${index + 1}: exam not found or unauthorized.`
          );
        }

        const [subject] = await tx
          .select({
            id: examSubjects.id,
            examId: examSubjects.examId,
            subjectName: examSubjects.subjectName,
            totalMarks: examSubjects.totalMarks,
          })
          .from(examSubjects)
          .where(
            and(
              eq(
                examSubjects.id,
                item.examSubjectId
              ),
              eq(
                examSubjects.examId,
                item.examId
              ),
              eq(
                examSubjects.instituteId,
                session.instituteId!
              )
            )
          )
          .limit(1);

        if (!subject) {
          throw new Error(
            `Result ${index + 1}: exam subject not found or unauthorized.`
          );
        }

        const totalMarks = Number(
          subject.totalMarks
        );

        if (
          !Number.isFinite(totalMarks) ||
          totalMarks <= 0
        ) {
          throw new Error(
            `Result ${index + 1}: invalid total marks configured for subject.`
          );
        }

        if (item.marks > totalMarks) {
          throw new Error(
            `Result ${index + 1}: marks cannot exceed total marks (${totalMarks}).`
          );
        }

        const [student] = await tx
          .select({
            id: students.id,
            name: students.name,
          })
          .from(students)
          .where(
            and(
              eq(
                students.id,
                item.studentId
              ),
              eq(
                students.instituteId,
                session.instituteId!
              )
            )
          )
          .limit(1);

        if (!student) {
          throw new Error(
            `Result ${index + 1}: student not found or unauthorized.`
          );
        }

        const [enrollment] = await tx
          .select({
            id: enrollments.id,
          })
          .from(enrollments)
          .where(
            and(
              eq(
                enrollments.instituteId,
                session.instituteId!
              ),
              eq(
                enrollments.studentId,
                item.studentId
              ),
              eq(
                enrollments.batchId,
                exam.batchId
              ),
              eq(
                enrollments.status,
                "ACTIVE"
              )
            )
          )
          .limit(1);

        if (!enrollment) {
          throw new Error(
            `Result ${index + 1}: student is not actively enrolled in the exam batch.`
          );
        }

        const [existing] = await tx
          .select({
            id: results.id,
          })
          .from(results)
          .where(
            and(
              eq(
                results.instituteId,
                session.instituteId!
              ),
              eq(
                results.examId,
                item.examId
              ),
              eq(
                results.examSubjectId,
                item.examSubjectId
              ),
              eq(
                results.studentId,
                item.studentId
              )
            )
          )
          .limit(1);

        if (existing) {
          throw new Error(
            `Result ${index + 1}: a result already exists for this student and subject.`
          );
        }

        const grade = calculateGrade(
          item.marks,
          totalMarks
        );

        const [inserted] = await tx
          .insert(results)
          .values({
            instituteId:
              session.instituteId!,
            examId: item.examId,
            examSubjectId:
              item.examSubjectId,
            studentId: item.studentId,
            marks: item.marks.toFixed(2),
            grade,
            remarks: item.remarks,
          })
          .returning();

        created.push({
          ...inserted,

          percentage: calculatePercentage(
            inserted.marks,
            totalMarks
          ),
        });
      }

      return created;
    });

    return Response.json(
      {
        success: true,

        message:
          insertedResults.length === 1
            ? "Result saved successfully."
            : `${insertedResults.length} results saved successfully.`,

        results: insertedResults,
        count: insertedResults.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/results error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save results.";

    return errorResponse(message, 400);
  }
}

export async function PUT(request: Request) {
  try {
    const session = await getSession();

    if (!session || !session.instituteId) {
      return errorResponse("Unauthorized", 401);
    }

    let body: unknown;

    try {
      body = await request.json();
    } catch {
      return errorResponse(
        "Invalid JSON request body."
      );
    }

    if (!body || typeof body !== "object") {
      return errorResponse(
        "Request body is required."
      );
    }

    const data =
      body as Record<string, unknown>;

    const id =
      typeof data.id === "string"
        ? data.id.trim()
        : "";

    if (!id) {
      return errorResponse(
        "Result id is required."
      );
    }

    const marks = normalizeMarks(
      data.marks
    );

    if (marks === null) {
      return errorResponse(
        "Marks must be a valid number."
      );
    }

    if (marks < 0) {
      return errorResponse(
        "Marks cannot be negative."
      );
    }

    const remarks = normalizeRemarks(
      data.remarks
    );

    const updated =
      await db.transaction(async (tx) => {
        const [existing] = await tx
          .select({
            id: results.id,
            examId: results.examId,
            examSubjectId:
              results.examSubjectId,
            studentId: results.studentId,
          })
          .from(results)
          .where(
            and(
              eq(results.id, id),
              eq(
                results.instituteId,
                session.instituteId!
              )
            )
          )
          .limit(1);

        if (!existing) {
          throw new Error(
            "Result not found."
          );
        }

        if (!existing.examSubjectId) {
          throw new Error(
            "This result is not linked to an exam subject."
          );
        }

        const [subject] = await tx
          .select({
            id: examSubjects.id,
            totalMarks:
              examSubjects.totalMarks,
          })
          .from(examSubjects)
          .where(
            and(
              eq(
                examSubjects.id,
                existing.examSubjectId
              ),
              eq(
                examSubjects.examId,
                existing.examId
              ),
              eq(
                examSubjects.instituteId,
                session.instituteId!
              )
            )
          )
          .limit(1);

        if (!subject) {
          throw new Error(
            "Exam subject not found."
          );
        }

        const totalMarks =
          Number(subject.totalMarks);

        if (
          !Number.isFinite(totalMarks) ||
          totalMarks <= 0
        ) {
          throw new Error(
            "Invalid total marks configured for this subject."
          );
        }

        if (marks > totalMarks) {
          throw new Error(
            `Marks cannot exceed total marks (${totalMarks}).`
          );
        }

        const [exam] = await tx
          .select({
            id: exams.id,
            batchId: exams.batchId,
          })
          .from(exams)
          .where(
            and(
              eq(
                exams.id,
                existing.examId
              ),
              eq(
                exams.instituteId,
                session.instituteId!
              )
            )
          )
          .limit(1);

        if (!exam) {
          throw new Error(
            "Exam not found."
          );
        }

        const [enrollment] =
          await tx
            .select({
              id: enrollments.id,
            })
            .from(enrollments)
            .where(
              and(
                eq(
                  enrollments.instituteId,
                  session.instituteId!
                ),
                eq(
                  enrollments.studentId,
                  existing.studentId
                ),
                eq(
                  enrollments.batchId,
                  exam.batchId
                ),
                eq(
                  enrollments.status,
                  "ACTIVE"
                )
              )
            )
            .limit(1);

        if (!enrollment) {
          throw new Error(
            "Student is not actively enrolled in the exam batch."
          );
        }

        const grade = calculateGrade(
          marks,
          totalMarks
        );

        const [updatedResult] =
          await tx
            .update(results)
            .set({
              marks: marks.toFixed(2),
              grade,
              remarks,
            })
            .where(
              and(
                eq(results.id, id),
                eq(
                  results.instituteId,
                  session.instituteId!
                )
              )
            )
            .returning();

        return {
          ...updatedResult,

          percentage:
            calculatePercentage(
              updatedResult.marks,
              totalMarks
            ),
        };
      });

    return Response.json({
      success: true,
      message:
        "Result updated successfully.",
      result: updated,
    });
  } catch (error) {
    console.error(
      "PUT /api/results error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "Failed to update result.";

    return errorResponse(
      message,
      400
    );
  }
}

export async function DELETE(
  request: Request
) {
  try {
    const session = await getSession();

    if (
      !session ||
      !session.instituteId
    ) {
      return errorResponse(
        "Unauthorized",
        401
      );
    }

    const { searchParams } =
      new URL(request.url);

    const id =
      searchParams.get("id");

    if (!id) {
      return errorResponse(
        "Result id is required."
      );
    }

    const deleted = await db
      .delete(results)
      .where(
        and(
          eq(results.id, id),
          eq(
            results.instituteId,
            session.instituteId
          )
        )
      )
      .returning({
        id: results.id,
      });

    if (deleted.length === 0) {
      return errorResponse(
        "Result not found.",
        404
      );
    }

    return Response.json({
      success: true,
      message:
        "Result deleted successfully.",
      id: deleted[0].id,
    });
  } catch (error) {
    console.error(
      "DELETE /api/results error:",
      error
    );

    return errorResponse(
      "Failed to delete result.",
      500
    );
  }
}
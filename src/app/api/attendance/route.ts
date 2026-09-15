import { db } from "@/db";
import {
  results,
  exams,
  examSubjects,
  students,
  batches,
  enrollments,
} from "@/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getSession } from "@/lib/session";

const MAX_BULK_RESULTS = 200;

type ResultInput = {
  examId: string;
  examSubjectId?: string | null;
  studentId: string;
  marks: number | string;
  grade?: string | null;
  remarks?: string | null;
};

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function isValidId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function parseMarks(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }

  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function calculateGrade(marks: number, totalMarks: number): string {
  if (totalMarks <= 0) {
    return "F";
  }

  const percentage = (marks / totalMarks) * 100;

  if (percentage >= 80) return "A+";
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "A-";
  if (percentage >= 50) return "B";
  if (percentage >= 40) return "C";
  if (percentage >= 33) return "D";

  return "F";
}

function normalizeRemarks(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed.slice(0, 2000) : null;
}

function normalizeGrade(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim().toUpperCase();

  if (!trimmed) {
    return null;
  }

  return trimmed.slice(0, 10);
}

// =========================================================
// GET RESULTS
// =========================================================

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { searchParams } = new URL(request.url);

    const examId = searchParams.get("examId");
    const examSubjectId = searchParams.get("examSubjectId");
    const studentId = searchParams.get("studentId");

    const conditions = [
      eq(results.instituteId, session.instituteId),
    ];

    if (examId) {
      conditions.push(eq(results.examId, examId));
    }

    if (examSubjectId) {
      conditions.push(eq(results.examSubjectId, examSubjectId));
    }

    if (studentId) {
      conditions.push(eq(results.studentId, studentId));
    }

    const rows = await db
      .select({
        result: results,
        exam: {
          id: exams.id,
          name: exams.name,
          examDate: exams.examDate,
          batchId: exams.batchId,
        },
        subject: {
          id: examSubjects.id,
          subjectName: examSubjects.subjectName,
          totalMarks: examSubjects.totalMarks,
        },
        student: {
          id: students.id,
          studentId: students.studentId,
          name: students.name,
          photoUrl: students.photoUrl,
        },
        batch: {
          id: batches.id,
          name: batches.name,
        },
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
      .where(and(...conditions))
      .orderBy(desc(results.createdAt));

    return Response.json({
      results: rows,
    });
  } catch (error) {
    console.error("GET /api/results error:", error);

    return errorResponse(
      "Failed to load results",
      500
    );
  }
}

// =========================================================
// CREATE RESULTS
// Supports:
// { examId, examSubjectId, studentId, marks }
// OR
// { results: [...] }
// =========================================================

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await request.json();

    let records: ResultInput[];

    if (Array.isArray(body?.results)) {
      records = body.results;
    } else {
      records = [body as ResultInput];
    }

    if (records.length === 0) {
      return errorResponse(
        "At least one result is required"
      );
    }

    if (records.length > MAX_BULK_RESULTS) {
      return errorResponse(
        `Maximum ${MAX_BULK_RESULTS} results can be submitted at once`
      );
    }

    for (const record of records) {
      if (!isValidId(record?.examId)) {
        return errorResponse(
          "Valid examId is required"
        );
      }

      if (!isValidId(record?.studentId)) {
        return errorResponse(
          "Valid studentId is required"
        );
      }

      if (!isValidId(record?.examSubjectId)) {
        return errorResponse(
          "Valid examSubjectId is required"
        );
      }

      const marks = parseMarks(record?.marks);

      if (marks === null) {
        return errorResponse(
          "Marks must be a valid number"
        );
      }

      if (marks < 0) {
        return errorResponse(
          "Marks cannot be negative"
        );
      }
    }

    const inserted = await db.transaction(async (tx) => {
      const insertedResults = [];

      // -----------------------------------------------------
      // Prevent duplicate records inside the same request
      // -----------------------------------------------------

      const requestKeys = new Set<string>();

      for (const record of records) {
        const key = [
          record.examId,
          record.examSubjectId,
          record.studentId,
        ].join(":");

        if (requestKeys.has(key)) {
          throw new Error(
            "Duplicate result found in submitted records"
          );
        }

        requestKeys.add(key);
      }

      // -----------------------------------------------------
      // Process each result
      // -----------------------------------------------------

      for (const record of records) {
        const examId = record.examId.trim();
        const examSubjectId = record.examSubjectId!.trim();
        const studentId = record.studentId.trim();

        const marks = parseMarks(record.marks)!;

        // ---------------------------------------------------
        // Verify exam belongs to current institute
        // ---------------------------------------------------

        const [exam] = await tx
          .select({
            id: exams.id,
            batchId: exams.batchId,
            name: exams.name,
          })
          .from(exams)
          .where(
            and(
              eq(exams.id, examId),
              eq(
                exams.instituteId,
                session.instituteId!
              )
            )
          )
          .limit(1);

        if (!exam) {
          throw new Error(
            "Exam not found or access denied"
          );
        }

        // ---------------------------------------------------
        // Verify subject belongs to exam
        // ---------------------------------------------------

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
                examSubjectId
              ),
              eq(
                examSubjects.examId,
                examId
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
            "Exam subject not found or does not belong to this exam"
          );
        }

        // ---------------------------------------------------
        // Validate marks against total marks
        // ---------------------------------------------------

        if (marks > subject.totalMarks) {
          throw new Error(
            `Marks for ${subject.subjectName} cannot exceed ${subject.totalMarks}`
          );
        }

        // ---------------------------------------------------
        // Verify student belongs to current institute
        // ---------------------------------------------------

        const [student] = await tx
          .select({
            id: students.id,
            name: students.name,
          })
          .from(students)
          .where(
            and(
              eq(students.id, studentId),
              eq(
                students.instituteId,
                session.instituteId!
              )
            )
          )
          .limit(1);

        if (!student) {
          throw new Error(
            "Student not found or access denied"
          );
        }

        // ---------------------------------------------------
        // Verify student is enrolled in exam batch
        // ---------------------------------------------------

        const [enrollment] = await tx
          .select({
            id: enrollments.id,
            status: enrollments.status,
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
                studentId
              ),
              eq(
                enrollments.batchId,
                exam.batchId
              )
            )
          )
          .limit(1);

        if (!enrollment) {
          throw new Error(
            `${student.name} is not enrolled in the exam batch`
          );
        }

        // ---------------------------------------------------
        // Prevent duplicate result
        // ---------------------------------------------------

        const existing = await tx
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
              eq(results.examId, examId),
              eq(
                results.examSubjectId,
                examSubjectId
              ),
              eq(
                results.studentId,
                studentId
              )
            )
          )
          .limit(1);

        if (existing.length > 0) {
          throw new Error(
            `Result already exists for ${student.name} in ${subject.subjectName}`
          );
        }

        // ---------------------------------------------------
        // Calculate grade server-side
        // ---------------------------------------------------

        const calculatedGrade =
          calculateGrade(
            marks,
            subject.totalMarks
          );

        const requestedGrade =
          normalizeGrade(record.grade);

        const finalGrade =
          requestedGrade || calculatedGrade;

        const remarks = normalizeRemarks(
          record.remarks
        );

        // ---------------------------------------------------
        // Insert
        // ---------------------------------------------------

        const [insertedResult] = await tx
          .insert(results)
          .values({
            instituteId: session.instituteId!,
            examId,
            examSubjectId,
            studentId,
            marks: marks.toFixed(2),
            grade: finalGrade,
            remarks,
          })
          .returning();

        insertedResults.push(insertedResult);
      }

      return insertedResults;
    });

    return Response.json(
      {
        results: inserted,
        count: inserted.length,
        message:
          inserted.length === 1
            ? "Result saved successfully"
            : `${inserted.length} results saved successfully`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/results error:", error);

    const message =
      error instanceof Error
        ? error.message
        : "Failed to save results";

    return errorResponse(message, 400);
  }
}

// =========================================================
// UPDATE RESULT
// =========================================================

export async function PUT(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const body = await request.json();

    const resultId = body?.id;

    if (!isValidId(resultId)) {
      return errorResponse(
        "Result id is required"
      );
    }

    // -----------------------------------------------------
    // Find existing result
    // -----------------------------------------------------

    const [existing] = await db
      .select({
        id: results.id,
        examId: results.examId,
        examSubjectId: results.examSubjectId,
        studentId: results.studentId,
        marks: results.marks,
      })
      .from(results)
      .where(
        and(
          eq(results.id, resultId),
          eq(
            results.instituteId,
            session.instituteId
          )
        )
      )
      .limit(1);

    if (!existing) {
      return errorResponse(
        "Result not found",
        404
      );
    }

    // -----------------------------------------------------
    // Subject / total marks
    // -----------------------------------------------------

    if (!existing.examSubjectId) {
      return errorResponse(
        "This result is not linked to an exam subject"
      );
    }

    const [subject] = await db
      .select({
        id: examSubjects.id,
        totalMarks: examSubjects.totalMarks,
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
            session.instituteId
          )
        )
      )
      .limit(1);

    if (!subject) {
      return errorResponse(
        "Exam subject not found",
        404
      );
    }

    const marks =
      body?.marks !== undefined
        ? parseMarks(body.marks)
        : parseMarks(existing.marks);

    if (marks === null) {
      return errorResponse(
        "Marks must be a valid number"
      );
    }

    if (marks < 0) {
      return errorResponse(
        "Marks cannot be negative"
      );
    }

    if (marks > subject.totalMarks) {
      return errorResponse(
        `Marks cannot exceed ${subject.totalMarks}`
      );
    }

    const grade =
      normalizeGrade(body?.grade) ||
      calculateGrade(
        marks,
        subject.totalMarks
      );

    const remarks =
      body?.remarks !== undefined
        ? normalizeRemarks(body.remarks)
        : undefined;

    const updateData: {
      marks: string;
      grade: string;
      remarks?: string | null;
    } = {
      marks: marks.toFixed(2),
      grade,
    };

    if (remarks !== undefined) {
      updateData.remarks = remarks;
    }

    const [updated] = await db
      .update(results)
      .set(updateData)
      .where(
        and(
          eq(results.id, resultId),
          eq(
            results.instituteId,
            session.instituteId
          )
        )
      )
      .returning();

    return Response.json({
      result: updated,
      message: "Result updated successfully",
    });
  } catch (error) {
    console.error("PUT /api/results error:", error);

    return errorResponse(
      error instanceof Error
        ? error.message
        : "Failed to update result",
      400
    );
  }
}

// =========================================================
// DELETE RESULT
// =========================================================

export async function DELETE(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return errorResponse("Unauthorized", 401);
  }

  try {
    const { searchParams } = new URL(request.url);

    const resultId = searchParams.get("id");

    if (!isValidId(resultId)) {
      return errorResponse(
        "Result id is required"
      );
    }

    const [deleted] = await db
      .delete(results)
      .where(
        and(
          eq(results.id, resultId),
          eq(
            results.instituteId,
            session.instituteId
          )
        )
      )
      .returning();

    if (!deleted) {
      return errorResponse(
        "Result not found",
        404
      );
    }

    return Response.json({
      result: deleted,
      message: "Result deleted successfully",
    });
  } catch (error) {
    console.error(
      "DELETE /api/results error:",
      error
    );

    return errorResponse(
      "Failed to delete result",
      500
    );
  }
}
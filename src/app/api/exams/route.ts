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

type ExamMode = "BATCH" | "PROGRAMME";

type PreparedSubject = {
  subjectName: string;
  totalMarks: number;
};

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return jsonError("Unauthorized", 401);

    const instituteId = session.instituteId;
    const { searchParams } = new URL(request.url);
    const batchId = searchParams.get("batchId")?.trim() || "";
    const programmeId = searchParams.get("programmeId")?.trim() || "";
    const semesterId = searchParams.get("semesterId")?.trim() || "";

    const conditions = [eq(exams.instituteId, instituteId)];
    if (batchId) conditions.push(eq(exams.batchId, batchId));
    if (programmeId) conditions.push(eq(exams.programmeId, programmeId));
    if (semesterId) conditions.push(eq(exams.semesterId, semesterId));

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
      .leftJoin(batches, eq(exams.batchId, batches.id))
      .leftJoin(programmes, eq(exams.programmeId, programmes.id))
      .leftJoin(
        programmeSemesters,
        eq(exams.semesterId, programmeSemesters.id)
      )
      .where(and(...conditions))
      .orderBy(desc(exams.createdAt));

    const examIds = examRows.map((row) => row.exam.id);
    if (examIds.length === 0) return Response.json({ exams: [] });

    const subjectRows = await db
      .select({
        id: examSubjects.id,
        instituteId: examSubjects.instituteId,
        examId: examSubjects.examId,
        subjectName: examSubjects.subjectName,
        totalMarks: examSubjects.totalMarks,
      })
      .from(examSubjects)
      .where(eq(examSubjects.instituteId, instituteId));

    const subjectsByExam = new Map<string, Array<{
      id: string;
      instituteId: string;
      examId: string;
      subjectName: string;
      totalMarks: number;
    }>>();

    for (const subject of subjectRows) {
      if (!examIds.includes(subject.examId)) continue;
      const list = subjectsByExam.get(subject.examId) ?? [];
      list.push({
        id: subject.id,
        instituteId: subject.instituteId,
        examId: subject.examId,
        subjectName: subject.subjectName,
        totalMarks: Number(subject.totalMarks),
      });
      subjectsByExam.set(subject.examId, list);
    }

    return Response.json({
      exams: examRows.map((row) => {
        const mode: ExamMode = row.exam.programmeId ? "PROGRAMME" : "BATCH";
        return {
          exam: row.exam,
          mode,
          batchName: row.batchName ?? null,
          programmeName: row.programmeName ?? null,
          programmeCode: row.programmeCode ?? null,
          semesterName: row.semesterName ?? null,
          semesterNo: row.semesterNo ?? null,
          subjects: subjectsByExam.get(row.exam.id) ?? [],
        };
      }),
    });
  } catch (error) {
    console.error("GET /api/exams error:", error);
    return jsonError("Failed to load exams.", 500);
  }
}

export async function POST(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return jsonError("Unauthorized", 401);

    const instituteId = session.instituteId;
    const body = await request.json();
    const mode: ExamMode = body?.mode === "PROGRAMME" ? "PROGRAMME" : "BATCH";

    const batchId = typeof body?.batchId === "string" ? body.batchId.trim() : "";
    const programmeId = typeof body?.programmeId === "string" ? body.programmeId.trim() : "";
    const semesterId = typeof body?.semesterId === "string" ? body.semesterId.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const examDate = typeof body?.examDate === "string" && body.examDate.trim() ? body.examDate.trim() : undefined;
    const subjects = Array.isArray(body?.subjects) ? body.subjects : [];

    if (!name) return jsonError("Exam name is required.", 400);
    if (name.length > 255) return jsonError("Exam name must be 255 characters or less.", 400);
    if (subjects.length === 0) return jsonError("Add at least one subject.", 400);
    if (examDate && !/^\d{4}-\d{2}-\d{2}$/.test(examDate)) {
      return jsonError("Exam date must be in YYYY-MM-DD format.", 400);
    }

    const preparedSubjects: PreparedSubject[] = subjects.map((subject: unknown) => {
      const item = subject && typeof subject === "object" ? (subject as Record<string, unknown>) : {};
      return {
        subjectName: typeof item.subjectName === "string" ? item.subjectName.trim() : "",
        totalMarks: Number(item.totalMarks),
      };
    });

    for (const subject of preparedSubjects) {
      if (!subject.subjectName) return jsonError("Every subject must have a name.", 400);
      if (subject.subjectName.length > 255) return jsonError("Subject name must be 255 characters or less.", 400);
      if (!Number.isInteger(subject.totalMarks) || subject.totalMarks <= 0) {
        return jsonError("Every subject must have a positive whole-number total mark.", 400);
      }
      if (subject.totalMarks > 1000) return jsonError("Total marks cannot exceed 1000.", 400);
    }

    const subjectNames = preparedSubjects.map((s) => s.subjectName.toLowerCase());
    if (new Set(subjectNames).size !== subjectNames.length) {
      return jsonError("Duplicate subject names are not allowed.", 400);
    }

    let batch: { id: string; name: string } | null = null;
    let programme: { id: string; name: string } | null = null;
    let semester: { id: string; name: string; semesterNo: number } | null = null;

    if (mode === "BATCH") {
      if (!batchId) return jsonError("Batch is required for a Batch Exam.", 400);
      const rows = await db
        .select({ id: batches.id, name: batches.name })
        .from(batches)
        .where(and(eq(batches.id, batchId), eq(batches.instituteId, instituteId)))
        .limit(1);
      batch = rows[0] ?? null;
      if (!batch) return jsonError("Selected batch was not found.", 404);
    } else {
      if (!programmeId) return jsonError("Programme is required for a Programme Exam.", 400);
      if (!semesterId) return jsonError("Semester is required for a Programme Exam.", 400);

      const programmeRows = await db
        .select({ id: programmes.id, name: programmes.name })
        .from(programmes)
        .where(and(eq(programmes.id, programmeId), eq(programmes.instituteId, instituteId)))
        .limit(1);
      programme = programmeRows[0] ?? null;
      if (!programme) return jsonError("Selected programme was not found.", 404);

      const semesterRows = await db
        .select({
          id: programmeSemesters.id,
          name: programmeSemesters.name,
          semesterNo: programmeSemesters.semesterNo,
        })
        .from(programmeSemesters)
        .where(
          and(
            eq(programmeSemesters.id, semesterId),
            eq(programmeSemesters.programmeId, programmeId),
            eq(programmeSemesters.instituteId, instituteId)
          )
        )
        .limit(1);
      semester = semesterRows[0] ?? null;
      if (!semester) return jsonError("Selected semester does not belong to the selected programme.", 400);

      if (batchId) {
        const batchRows = await db
          .select({ id: batches.id, name: batches.name })
          .from(batches)
          .where(and(eq(batches.id, batchId), eq(batches.instituteId, instituteId)))
          .limit(1);
        batch = batchRows[0] ?? null;
        if (!batch) return jsonError("Selected batch was not found.", 404);
      }
    }

    const [createdExam] = await db
      .insert(exams)
      .values({
        instituteId,
        batchId: batchId || null,
        programmeId: mode === "PROGRAMME" ? programmeId : null,
        semesterId: mode === "PROGRAMME" ? semesterId : null,
        name,
        ...(examDate !== undefined ? { examDate } : {}),
      })
      .returning();

    if (!createdExam) throw new Error("Failed to create exam.");

    const createdSubjects = await db
      .insert(examSubjects)
      .values(
        preparedSubjects.map((subject) => ({
          instituteId,
          examId: createdExam.id,
          subjectName: subject.subjectName,
          totalMarks: subject.totalMarks,
        }))
      )
      .returning();

    return Response.json(
      {
        message: "Exam created successfully.",
        exam: createdExam,
        subjects: createdSubjects,
        academic: {
          mode,
          programmeId: programme?.id ?? null,
          programmeName: programme?.name ?? null,
          semesterId: semester?.id ?? null,
          semesterNo: semester?.semesterNo ?? null,
          semesterName: semester?.name ?? null,
          batchId: batch?.id ?? null,
          batchName: batch?.name ?? null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("POST /api/exams error:", error);
    return jsonError(
      error instanceof Error ? error.message : "Failed to create exam.",
      500
    );
  }
}

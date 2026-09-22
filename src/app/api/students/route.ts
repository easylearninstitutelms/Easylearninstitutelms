import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import {
  students,
  enrollments,
  batches,
  staff,
  users,
} from "@/db/schema";
import {
  eq,
  and,
  like,
  or,
  desc,
  sql,
} from "drizzle-orm";
import {
  getSession,
  requireRoles,
} from "@/lib/session";
import { ensureAcademicCoreSchema } from "@/lib/academic";
import { ensureTeacherAssignmentSchema } from "@/lib/teacher-assignment";

const MAX_PHOTO_CHARS = 5_000_000;

const STUDENT_VIEW_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
  "RECEPTIONIST",
];

const STUDENT_MANAGE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "RECEPTIONIST",
  "DIGITAL_MARKETER",
  "TEACHER",
];

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function cleanPhotoUrl(value: unknown) {
  const valueText = cleanText(value);
  if (!valueText) return null;
  if (valueText.length > MAX_PHOTO_CHARS) return null;
  if (!valueText.startsWith("data:image/")) return null;
  return valueText;
}

function validGender(value: unknown) {
  if (
    value === "MALE" ||
    value === "FEMALE" ||
    value === "OTHER"
  ) {
    return value;
  }
  return null;
}

function generateTemporaryPassword(): string {
  return `EL@${randomBytes(9).toString("base64url")}`;
}

function suggestProgrammeCode(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  const raw = words
    .map((word) => {
      const normalized = word.replace(/[^a-zA-Z0-9]/g, "");

      if (!normalized) return "";

      if (/^[A-Z0-9]{2,3}$/.test(normalized)) {
        return normalized.toUpperCase();
      }

      return normalized[0].toUpperCase();
    })
    .join("");

  return raw.replace(/[^A-Z0-9]/g, "").slice(0, 12) || "PRG";
}

async function usernameTaken(email: string) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return Boolean(existing);
}

async function generateStudentLoginIdentifier(studentCode: string) {
  const base = `${studentCode.toLowerCase()}@student.easylearn.local`;

  if (!(await usernameTaken(base))) return base;

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomBytes(3).toString("hex");
    const email = `${studentCode.toLowerCase()}.${suffix}@student.easylearn.local`;
    if (!(await usernameTaken(email))) return email;
  }

  throw new Error("Could not generate a unique student login identifier.");
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissionError = requireRoles(session, STUDENT_VIEW_ROLES);
  if (permissionError) return permissionError;

  try {
    await ensureTeacherAssignmentSchema();

    const instituteId = session.instituteId;
    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search") || "";
    const status = searchParams.get("status") || "";
    const batchId = cleanText(searchParams.get("batchId"));
    const page = Math.max(
      1,
      Number.parseInt(searchParams.get("page") || "1", 10) || 1,
    );
    const limit = Math.min(
      100,
      Math.max(
        1,
        Number.parseInt(searchParams.get("limit") || "20", 10) || 20,
      ),
    );
    const offset = (page - 1) * limit;

    const conditions = [eq(students.instituteId, instituteId)];

    if (status && status !== "ALL") {
      conditions.push(
        eq(
          students.status,
          status as "ACTIVE" | "INACTIVE" | "ARCHIVED",
        ),
      );
    }

    if (search.trim()) {
      const q = `%${search.trim()}%`;
      conditions.push(
        or(
          like(students.name, q),
          like(students.studentId, q),
          like(students.phone, q),
        )!,
      );
    }

    if (batchId) {
      const [batch] = await db
        .select({
          id: batches.id,
          teacherId: batches.teacherId,
        })
        .from(batches)
        .where(
          and(
            eq(batches.id, batchId),
            eq(batches.instituteId, instituteId),
          ),
        )
        .limit(1);

      if (!batch) {
        return Response.json(
          { error: "Invalid batch" },
          { status: 400 },
        );
      }

      if (session.role === "TEACHER") {
        const [teacher] = await db
          .select({ id: staff.id })
          .from(staff)
          .where(
            and(
              eq(staff.userId, session.userId),
              eq(staff.instituteId, instituteId),
            ),
          )
          .limit(1);

        if (!teacher || batch.teacherId !== teacher.id) {
          return Response.json(
            { error: "Forbidden" },
            { status: 403 },
          );
        }
      }

      conditions.push(sql`
        EXISTS (
          SELECT 1 FROM ${enrollments}
          WHERE ${enrollments.studentId} = ${students.id}
            AND ${enrollments.batchId} = ${batchId}
            AND ${enrollments.status} = 'ACTIVE'
        )
      `);
    }

    if (session.role === "TEACHER" && !batchId) {
      const teacherRows = await db.execute(sql\`
        SELECT ta.course_id AS "courseId", ta.programme_id AS "programmeId"
        FROM teacher_assignments ta
        INNER JOIN staff s ON s.id = ta.teacher_id
        WHERE s.user_id = \${session.userId}
          AND ta.institute_id = \${instituteId}
        LIMIT 1
      \`);
      const assignment = (teacherRows as any).rows?.[0];

      if (!assignment) {
        return Response.json(
          { error: "No Course or Programme is assigned to this teacher." },
          { status: 403 },
        );
      }

      conditions.push(sql\`
        EXISTS (
          SELECT 1
          FROM \${enrollments} e
          WHERE e.student_id = \${students.id}
            AND e.status = 'ACTIVE'
            AND e.institute_id = \${instituteId}
            AND (
              (\${assignment.courseId || null}::uuid IS NOT NULL AND e.course_id = \${assignment.courseId || null})
              OR
              (\${assignment.programmeId || null}::uuid IS NOT NULL AND e.programme_id = \${assignment.programmeId || null})
            )
        )
      \`);
    }

    const [{ total }] = await db
      .select({ total: sql<number>`count(*)::int` })
      .from(students)
      .where(and(...conditions));

    const rows = await db
      .select()
      .from(students)
      .where(and(...conditions))
      .orderBy(desc(students.createdAt))
      .limit(limit)
      .offset(offset);

    return Response.json({
      students: rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    console.error("GET /api/students error:", error);
    return Response.json(
      { error: "Failed to load students" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const permissionError = requireRoles(
    session,
    STUDENT_MANAGE_ROLES,
  );
  if (permissionError) return permissionError;

  const instituteId = session.instituteId;

  try {
    // Use only the academic core schema repair here.
    // This avoids running unrelated homework/exam schema repairs
    // when creating a student.
    await ensureAcademicCoreSchema();
    await ensureTeacherAssignmentSchema();

    const body = await request.json();

    const name = cleanText(body.name);
    const phone = cleanText(body.phone);
    const email = cleanText(body.email).toLowerCase();
    const guardianName = cleanText(body.guardianName);
    const guardianPhone = cleanText(body.guardianPhone);
    const address = cleanText(body.address);
    const dob = cleanText(body.dob);
    const admissionDate = cleanText(body.admissionDate);
    const batchId = cleanText(body.batchId);
    const selectedCourseId = cleanText(body.courseId);
    const selectedProgrammeId = cleanText(body.programmeId);
    const gender = validGender(body.gender);
    const photoUrl = cleanPhotoUrl(body.photoUrl);

    if (!name || !email || !admissionDate) {
      return Response.json(
        {
          error:
            "Name, Gmail/email and admission date are required.",
        },
        { status: 400 },
      );
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(email)) {
      return Response.json(
        {
          error:
            "Please enter a valid Gmail/email address.",
        },
        { status: 400 },
      );
    }

    const existingEmailRows = await db.execute(sql`
      SELECT id
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `);

    if ((existingEmailRows as any).rows?.length > 0) {
      return Response.json(
        {
          error:
            "This Gmail/email is already registered.",
        },
        { status: 409 },
      );
    }

    const enrollmentChoices = [
      Boolean(selectedCourseId),
      Boolean(selectedProgrammeId),
      Boolean(batchId),
    ].filter(Boolean).length;

    if (enrollmentChoices !== 1) {
      return Response.json(
        {
          error:
            "Please select exactly one: Course or Programme. Batch is only for legacy enrollment.",
        },
        { status: 400 },
      );
    }

    if (body.photoUrl && !photoUrl) {
      return Response.json(
        {
          error:
            "Invalid student photo. Please choose a JPG, PNG, or WEBP image up to 2 MB.",
        },
        { status: 400 },
      );
    }

    let prefix = "";

    if (session.role === "TEACHER") {
      const assignmentRows = await db.execute(sql\`
        SELECT ta.course_id AS "courseId", ta.programme_id AS "programmeId"
        FROM teacher_assignments ta
        INNER JOIN staff s ON s.id = ta.teacher_id
        WHERE s.user_id = \${session.userId}
          AND ta.institute_id = \${instituteId}
        LIMIT 1
      \`);
      const assignment = (assignmentRows as any).rows?.[0];

      if (!assignment) {
        return Response.json(
          { error: "No Course or Programme is assigned to this teacher." },
          { status: 403 },
        );
      }

      const allowed =
        (selectedCourseId && String(assignment.courseId || "") === selectedCourseId) ||
        (selectedProgrammeId && String(assignment.programmeId || "") === selectedProgrammeId);

      if (!allowed) {
        return Response.json(
          { error: "You can only add students to your assigned Course or Programme." },
          { status: 403 },
        );
      }
    }

    if (selectedCourseId) {
      const courseRows = await db.execute(sql`
        SELECT
          id,
          name,
          course_no AS "courseNo"
        FROM courses
        WHERE id = ${selectedCourseId}
          AND institute_id = ${instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `);

      const course = (courseRows as any).rows?.[0];

      if (!course) {
        return Response.json(
          { error: "Invalid or inactive course." },
          { status: 400 },
        );
      }

      const courseNo = Number(course.courseNo);

      if (!Number.isInteger(courseNo) || courseNo < 211) {
        return Response.json(
          {
            error:
              "This course is missing a valid course number. Please edit/save the course first.",
          },
          { status: 400 },
        );
      }

      prefix = `C${suggestProgrammeCode(
        String(course.name),
      )}${courseNo}`;
    } else if (selectedProgrammeId) {
      const programmeRows = await db.execute(sql`
        SELECT
          id,
          name,
          code,
          programme_no AS "programmeNo"
        FROM programmes
        WHERE id = ${selectedProgrammeId}
          AND institute_id = ${instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `);

      const programme = (programmeRows as any).rows?.[0];

      if (!programme) {
        return Response.json(
          { error: "Invalid or inactive programme." },
          { status: 400 },
        );
      }

      const programmeNo = Number(programme.programmeNo);
      const programmeCode =
        cleanText(programme.code) ||
        suggestProgrammeCode(String(programme.name));

      if (
        !Number.isInteger(programmeNo) ||
        programmeNo < 211 ||
        !programmeCode
      ) {
        return Response.json(
          {
            error:
              "This programme is missing a valid programme number or code.",
          },
          { status: 400 },
        );
      }

      prefix = `${programmeCode}${programmeNo}`;
    } else {
      const batchRows = await db.execute(sql`
        SELECT
          b.id,
          b.batch_no AS "batchNo",
          p.code AS "programmeCode",
          p.name AS "programmeName"
        FROM batches b
        LEFT JOIN programmes p
          ON p.id = b.programme_id
        WHERE b.id = ${batchId}
          AND b.institute_id = ${instituteId}
        LIMIT 1
      `);

      const batch = (batchRows as any).rows?.[0];

      if (!batch) {
        return Response.json(
          { error: "Invalid batch." },
          { status: 400 },
        );
      }

      const programmeCode =
        cleanText(batch.programmeCode) ||
        suggestProgrammeCode(
          cleanText(batch.programmeName),
        );

      const batchNo = Number(batch.batchNo);

      if (
        !programmeCode ||
        !Number.isInteger(batchNo) ||
        batchNo < 211
      ) {
        return Response.json(
          {
            error:
              "This batch is missing a valid programme code or batch number. Please update the batch first.",
          },
          { status: 400 },
        );
      }

      prefix = `${programmeCode}${batchNo}`;
    }

    const existingStudentIds = await db.execute(sql`
      SELECT student_id
      FROM students
      WHERE institute_id = ${instituteId}
        AND student_id LIKE ${`${prefix}%`}
    `);

    const usedSerials = new Set<number>();

    for (const row of ((existingStudentIds as any).rows || [])) {
      const value = String(row.student_id || "");

      if (!value.startsWith(prefix)) continue;

      const suffix = value.slice(prefix.length);
      const number = Number(suffix);

      if (
        Number.isInteger(number) &&
        number > 0
      ) {
        usedSerials.add(number);
      }
    }

    let serial = 1;

    while (usedSerials.has(serial)) {
      serial += 1;
    }

    const studentId = `${prefix}${String(serial).padStart(
      4,
      "0",
    )}`;

    const loginEmail = email;

    const temporaryPassword =
      generateTemporaryPassword();

    const passwordHash = await bcrypt.hash(
      temporaryPassword,
      12,
    );

    const result = await db.transaction(async (tx) => {
      const [user] = await tx
        .insert(users)
        .values({
          instituteId,
          role: "STUDENT",
          name,
          phone: phone || null,
          email: loginEmail,
          passwordHash,
          status: "ACTIVE",
        })
        .returning({ id: users.id });

      if (!user) {
        throw new Error(
          "Failed to create student user account.",
        );
      }

      const [student] = await tx
        .insert(students)
        .values({
          userId: user.id,
          instituteId,
          studentId,
          name,
          phone: phone || null,
          guardianName: guardianName || null,
          guardianPhone: guardianPhone || null,
          address: address || null,
          dob: dob || null,
          gender,
          admissionDate,
          status: "ACTIVE",
          photoUrl,
        })
        .returning();

      if (!student) {
        throw new Error("Failed to create student.");
      }

      await tx.execute(sql`
        INSERT INTO enrollments (
          institute_id,
          student_id,
          batch_id,
          course_id,
          programme_id,
          enrollment_date,
          status
        )
        VALUES (
          ${instituteId},
          ${student.id},
          ${batchId || null},
          ${selectedCourseId || null},
          ${selectedProgrammeId || null},
          ${admissionDate},
          'ACTIVE'
        )
      `);

      return {
        student,
        userId: user.id,
      };
    });

    return Response.json(
      {
        student: result.student,
        account: {
          userId: result.userId,
          role: "STUDENT",
          username: loginEmail,
          loginEmail,
          loginUrl: "/",
          temporaryPassword,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/students error:",
      error,
    );

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create student and login account.",
      },
      { status: 500 },
    );
  }
}

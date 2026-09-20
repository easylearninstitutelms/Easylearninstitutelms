import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  and,
  desc,
  eq,
  inArray,
  like,
  or,
} from "drizzle-orm";
import { db } from "@/db";
import {
  guardianStudents,
  students,
  users,
} from "@/db/schema";
import { getSession } from "@/lib/session";

const ALLOWED_ADMIN_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "RECEPTIONIST",
] as const;

function cleanText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeUsernamePart(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.+|\.+$/g, "")
    .slice(0, 24);
}

function generateTemporaryPassword(): string {
  const raw = randomBytes(9).toString("base64url");
  return `EL@${raw}`;
}

async function usernameTaken(email: string): Promise<boolean> {
  const [existing] = await db
    .select({
      id: users.id,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return Boolean(existing);
}

async function generateLoginIdentifier(
  name: string,
  providedEmail: string
): Promise<string> {
  if (providedEmail) {
    return providedEmail.toLowerCase();
  }

  const base =
    normalizeUsernamePart(name) || "guardian";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomBytes(3).toString("hex");
    const email =
      `${base}.${suffix}@guardian.easylearn.local`;

    if (!(await usernameTaken(email))) {
      return email;
    }
  }

  throw new Error(
    "Could not generate a unique guardian login identifier."
  );
}

function isAllowedAdminRole(
  role: string
): boolean {
  return (
    ALLOWED_ADMIN_ROLES as readonly string[]
  ).includes(role);
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!isAllowedAdminRole(session.role)) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const { searchParams } =
      new URL(request.url);

    const search =
      searchParams.get("search")?.trim() || "";

    const conditions = [
      eq(users.instituteId, session.instituteId),
      eq(users.role, "GUARDIAN"),
    ];

    if (search) {
      conditions.push(
        or(
          like(users.name, `%${search}%`),
          like(users.email, `%${search}%`),
          like(users.phone, `%${search}%`)
        )!
      );
    }

    const guardianRows = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        phone: users.phone,
        status: users.status,
        createdAt: users.createdAt,
      })
      .from(users)
      .where(and(...conditions))
      .orderBy(desc(users.createdAt));

    const guardians = await Promise.all(
      guardianRows.map(async (guardian) => {
        const links = await db
          .select({
            id: guardianStudents.id,
            relation: guardianStudents.relation,
            studentId: students.id,
            studentCode: students.studentId,
            studentName: students.name,
            studentPhone: students.phone,
            studentStatus: students.status,
          })
          .from(guardianStudents)
          .leftJoin(
            students,
            and(
              eq(
                guardianStudents.studentId,
                students.id
              ),
              eq(
                students.instituteId,
                session.instituteId!
              )
            )
          )
          .where(
            and(
              eq(
                guardianStudents.guardianUserId,
                guardian.id
              ),
              eq(
                guardianStudents.instituteId,
                session.instituteId!
              )
            )
          )
          .orderBy(
            desc(guardianStudents.createdAt)
          );

        return {
          ...guardian,
          students: links,
        };
      })
    );

    return Response.json({
      guardians,
    });
  } catch (error) {
    console.error(
      "GET /api/guardians error:",
      error
    );

    return Response.json(
      {
        error: "Failed to load guardians.",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  if (!isAllowedAdminRole(session.role)) {
    return Response.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();

    const name = cleanText(body?.name);
    const email = cleanText(body?.email).toLowerCase();
    const phone = cleanText(body?.phone);
    const relation = cleanText(body?.relation);
    const providedPassword = cleanText(
      body?.password
    );

    const studentIds: string[] = Array.isArray(
      body?.studentIds
    )
      ? Array.from(
          new Set(
            body.studentIds.filter(
              (
                value: unknown
              ): value is string =>
                typeof value === "string" &&
                value.trim().length > 0
            )
          )
        )
      : [];

    if (!name) {
      return Response.json(
        { error: "Guardian name is required." },
        { status: 400 }
      );
    }

    if (
      email &&
      !/^\S+@\S+\.\S+$/.test(email)
    ) {
      return Response.json(
        {
          error:
            "Please enter a valid email address.",
        },
        { status: 400 }
      );
    }

    if (studentIds.length === 0) {
      return Response.json(
        {
          error:
            "At least one student must be linked.",
        },
        { status: 400 }
      );
    }

    const selectedStudents = await db
      .select({
        id: students.id,
        studentId: students.studentId,
        name: students.name,
      })
      .from(students)
      .where(
        and(
          eq(
            students.instituteId,
            session.instituteId
          ),
          inArray(students.id, studentIds)
        )
      );

    if (
      selectedStudents.length !==
      studentIds.length
    ) {
      return Response.json(
        {
          error:
            "One or more selected students do not belong to this institute.",
        },
        { status: 400 }
      );
    }

    const loginEmail =
      await generateLoginIdentifier(
        name,
        email
      );

    if (await usernameTaken(loginEmail)) {
      return Response.json(
        {
          error:
            "A user account already exists with this login.",
        },
        { status: 409 }
      );
    }

    const temporaryPassword =
      providedPassword ||
      generateTemporaryPassword();

    if (
      temporaryPassword.length < 6
    ) {
      return Response.json(
        {
          error:
            "Password must be at least 6 characters.",
        },
        { status: 400 }
      );
    }

    const passwordHash =
      await bcrypt.hash(
        temporaryPassword,
        12
      );

    const result = await db.transaction(
      async (tx) => {
        const [user] = await tx
          .insert(users)
          .values({
            instituteId:
              session.instituteId!,
            role: "GUARDIAN",
            name,
            phone: phone || null,
            email: loginEmail,
            passwordHash,
            status: "ACTIVE",
          })
          .returning({
            id: users.id,
            name: users.name,
            email: users.email,
            phone: users.phone,
            role: users.role,
          });

        if (!user) {
          throw new Error(
            "Failed to create guardian user account."
          );
        }

        const links = studentIds.map(
          (studentId: string) => ({
            instituteId:
              session.instituteId!,
            guardianUserId: user.id,
            studentId,
            relation: relation || null,
          })
        );

        const insertedLinks =
          await tx
            .insert(guardianStudents)
            .values(links)
            .returning();

        return {
          user,
          links: insertedLinks,
        };
      }
    );

    return Response.json(
      {
        guardian: result.user,
        linkedStudents:
          selectedStudents.map(
            (student) => ({
              id: student.id,
              studentId:
                student.studentId,
              name: student.name,
            })
          ),
        account: {
          userId: result.user.id,
          role: "GUARDIAN",
          username: loginEmail,
          loginEmail,
          loginUrl: "/",
          temporaryPassword,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "POST /api/guardians error:",
      error
    );

    const message =
      error instanceof Error
        ? error.message
        : "";

    if (
      message.includes(
        "users_email_unique"
      ) ||
      message.includes(
        "users_email"
      )
    ) {
      return Response.json(
        {
          error:
            "A user account already exists with this email.",
        },
        { status: 409 }
      );
    }

    return Response.json(
      {
        error:
          "Failed to create guardian account.",
      },
      { status: 500 }
    );
  }
}
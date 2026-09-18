import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import { and, desc, eq, isNull, like, or } from "drizzle-orm";
import { db } from "@/db";
import { staff, users } from "@/db/schema";
import {
  getSession,
  requireRoles,
} from "@/lib/session";
import { ensureStaffSchema } from "@/lib/staff";

const ALLOWED_ACCOUNT_ROLES = [
  "TEACHER",
  "ACCOUNTANT",
  "MANAGER",
  "RECEPTIONIST",
  "STAFF",
] as const;

type AccountRole = (typeof ALLOWED_ACCOUNT_ROLES)[number];

const STAFF_MANAGEMENT_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
];

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

async function usernameTaken(email: string) {
  const [existing] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  return Boolean(existing);
}

async function generateLoginIdentifier(
  name: string,
  providedEmail: string,
) {
  if (providedEmail) {
    return providedEmail.toLowerCase();
  }

  const base = normalizeUsernamePart(name) || "staff";

  for (let attempt = 0; attempt < 20; attempt += 1) {
    const suffix = randomBytes(3).toString("hex");
    const username = `${base}.${suffix}`;
    const email = `${username}@easylearn.local`;

    if (!(await usernameTaken(email))) {
      return email;
    }
  }

  throw new Error("Could not generate a unique login identifier.");
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const permissionError = requireRoles(
    session,
    STAFF_MANAGEMENT_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  const instituteId = session.instituteId;

  const { searchParams } = new URL(request.url);
  const search = searchParams.get("search") || "";
  const status = searchParams.get("status") || "";

  const conditions = [
    eq(staff.instituteId, instituteId),
  ];

  if (status && status !== "ALL") {
    conditions.push(
      eq(
        staff.status,
        status as "ACTIVE" | "INACTIVE" | "ARCHIVED",
      ),
    );
  }

  if (search) {
    conditions.push(
      or(
        like(staff.name, `%${search}%`),
        like(staff.phone, `%${search}%`),
        like(staff.email, `%${search}%`),
        like(staff.designation, `%${search}%`),
      )!,
    );
  }

  const rows = await db
    .select()
    .from(staff)
    .where(and(...conditions))
    .orderBy(desc(staff.createdAt));

  return Response.json({ staff: rows });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const permissionError = requireRoles(
    session,
    STAFF_MANAGEMENT_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  const instituteId = session.instituteId;

  try {
    const body = await request.json();

    const name = cleanText(body.name);
    const phone = cleanText(body.phone);
    const providedEmail = cleanText(body.email).toLowerCase();
    const designation = cleanText(body.designation);
    const joiningDate = cleanText(body.joiningDate);
    const salary = cleanText(body.salary);
    const accountRole = cleanText(
      body.accountRole,
    ) as AccountRole;

    if (!name) {
      return Response.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    const role: AccountRole =
      ALLOWED_ACCOUNT_ROLES.includes(accountRole)
        ? accountRole
        : designation.toLowerCase().includes("teacher")
          ? "TEACHER"
          : "STAFF";

    if (
      providedEmail &&
      !/^\S+@\S+\.\S+$/.test(providedEmail)
    ) {
      return Response.json(
        {
          error: "Please enter a valid email address.",
        },
        { status: 400 },
      );
    }

    const loginEmail = await generateLoginIdentifier(
      name,
      providedEmail,
    );

    if (await usernameTaken(loginEmail)) {
      return Response.json(
        {
          error:
            "A user account already exists with this login.",
        },
        { status: 409 },
      );
    }

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
          role,
          name,
          phone: phone || null,
          email: loginEmail,
          passwordHash,
          status: "ACTIVE",
        })
        .returning({
          id: users.id,
        });

      if (!user) {
        throw new Error(
          "Failed to create user account.",
        );
      }

      const [member] = await tx
        .insert(staff)
        .values({
          instituteId,
          userId: user.id,
          name,
          phone: phone || null,
          email: providedEmail || null,
          designation: designation || null,
          joiningDate: joiningDate || null,
          salary: salary || null,
          status: "ACTIVE",
        })
        .returning();

      if (!member) {
        throw new Error(
          "Failed to create staff member.",
        );
      }

      return {
        member,
        userId: user.id,
      };
    });

    return Response.json(
      {
        staff: result.member,
        account: {
          userId: result.userId,
          role,
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
      "POST /api/staff error:",
      error,
    );

    return Response.json(
      {
        error:
          "Failed to create staff member and user account.",
      },
      { status: 500 },
    );
  }
}
import { db } from "@/db";
import { courses } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import {
  getSession,
  requireRoles,
} from "@/lib/session";

const COURSE_VIEW_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
];

const COURSE_MANAGE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
];

export async function GET() {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const permissionError = requireRoles(
    session,
    COURSE_VIEW_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  try {
    const rows = await db
      .select()
      .from(courses)
      .where(
        eq(
          courses.instituteId,
          session.instituteId,
        ),
      )
      .orderBy(desc(courses.createdAt));

    return Response.json({
      courses: rows,
    });
  } catch (error) {
    console.error("Courses GET error:", error);

    return Response.json(
      { error: "Failed to load courses" },
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
    COURSE_MANAGE_ROLES,
  );

  if (permissionError) {
    return permissionError;
  }

  try {
    const body = await request.json();

    const {
      name,
      description,
      duration,
      fee,
    } = body;

    if (!name || !String(name).trim()) {
      return Response.json(
        { error: "Name is required" },
        { status: 400 },
      );
    }

    const [course] = await db
      .insert(courses)
      .values({
        instituteId: session.instituteId,
        name: String(name).trim(),
        description: description || null,
        duration: duration || null,
        fee: fee || null,
        status: "ACTIVE",
      })
      .returning();

    return Response.json({
      course,
    });
  } catch (error) {
    console.error("Courses POST error:", error);

    return Response.json(
      { error: "Failed to create course" },
      { status: 500 },
    );
  }
}
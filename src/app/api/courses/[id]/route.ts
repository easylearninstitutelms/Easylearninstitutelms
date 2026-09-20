import { db } from "@/db";
import { courses } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import {
  getSession,
  requireRoles,
} from "@/lib/session";

const COURSE_MANAGE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
];

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    const body = await request.json();

    const allowedFields = {
      name:
        typeof body.name === "string"
          ? body.name.trim()
          : undefined,
      description:
        body.description !== undefined
          ? body.description
          : undefined,
      duration:
        body.duration !== undefined
          ? body.duration
          : undefined,
      fee:
        body.fee !== undefined
          ? body.fee
          : undefined,
      status:
        body.status !== undefined
          ? body.status
          : undefined,
    };

    const [updated] = await db
      .update(courses)
      .set({
        ...allowedFields,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(courses.id, id),
          eq(
            courses.instituteId,
            session.instituteId,
          ),
        ),
      )
      .returning();

    if (!updated) {
      return Response.json(
        { error: "Course not found" },
        { status: 404 },
      );
    }

    return Response.json({
      course: updated,
    });
  } catch (error) {
    console.error(
      "Courses PATCH error:",
      error,
    );

    return Response.json(
      { error: "Failed to update course" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;

    const [updated] = await db
      .update(courses)
      .set({
        status: "INACTIVE",
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(courses.id, id),
          eq(
            courses.instituteId,
            session.instituteId,
          ),
        ),
      )
      .returning();

    if (!updated) {
      return Response.json(
        { error: "Course not found" },
        { status: 404 },
      );
    }

    return Response.json({
      course: updated,
    });
  } catch (error) {
    console.error(
      "Courses DELETE error:",
      error,
    );

    return Response.json(
      { error: "Failed to deactivate course" },
      { status: 500 },
    );
  }
}
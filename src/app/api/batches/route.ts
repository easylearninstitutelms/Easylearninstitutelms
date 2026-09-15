import { db } from "@/db";
import {
  batches,
  courses,
  staff,
  enrollments,
  programmes,
  programmeSemesters,
} from "@/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

export async function GET() {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await ensureAcademicSchema();

    const rows = await db
      .select({
        batch: batches,
        courseName: courses.name,
        teacherName: staff.name,
        programmeName: programmes.name,
        semesterName: programmeSemesters.name,
        studentCount: sql<number>`
          (
            SELECT COUNT(*)
            FROM enrollments
            WHERE batch_id = ${batches.id}
              AND status = 'ACTIVE'
          )
        `,
      })
      .from(batches)
      .leftJoin(courses, eq(batches.courseId, courses.id))
      .leftJoin(staff, eq(batches.teacherId, staff.id))
      .leftJoin(
        programmes,
        and(
          eq(batches.programmeId, programmes.id),
          eq(programmes.instituteId, session.instituteId)
        )
      )
      .leftJoin(
        programmeSemesters,
        and(
          eq(batches.semesterId, programmeSemesters.id),
          eq(programmeSemesters.instituteId, session.instituteId)
        )
      )
      .where(eq(batches.instituteId, session.instituteId))
      .orderBy(desc(batches.createdAt));

    return Response.json({ batches: rows });
  } catch (error) {
    console.error("Batches GET error:", error);

    return Response.json(
      { error: "Failed to load batches" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (
    session.role !== "INSTITUTE_ADMIN" &&
    session.role !== "SUPER_ADMIN"
  ) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    await ensureAcademicSchema();

    const body = await request.json();

    const {
      name,
      courseId,
      teacherId,
      programmeId,
      semesterId,
      room,
      startDate,
      endDate,
      fee,
    } = body;

    if (!name || !String(name).trim()) {
      return Response.json(
        { error: "Batch name is required" },
        { status: 400 }
      );
    }

    /*
     * Programme is required for new batches.
     */
    if (!programmeId) {
      return Response.json(
        { error: "Programme is required" },
        { status: 400 }
      );
    }

    /*
     * Semester is required for new batches.
     */
    if (!semesterId) {
      return Response.json(
        { error: "Semester is required" },
        { status: 400 }
      );
    }

    /*
     * Validate Programme belongs to current institute.
     */
    const [programme] = await db
      .select({
        id: programmes.id,
        name: programmes.name,
      })
      .from(programmes)
      .where(
        and(
          eq(programmes.id, programmeId),
          eq(programmes.instituteId, session.instituteId)
        )
      )
      .limit(1);

    if (!programme) {
      return Response.json(
        { error: "Invalid programme" },
        { status: 400 }
      );
    }

    /*
     * Validate Semester:
     * - belongs to current institute
     * - belongs to selected Programme
     */
    const [semester] = await db
      .select({
        id: programmeSemesters.id,
        name: programmeSemesters.name,
        programmeId: programmeSemesters.programmeId,
        semesterNo: programmeSemesters.semesterNo,
      })
      .from(programmeSemesters)
      .where(
        and(
          eq(programmeSemesters.id, semesterId),
          eq(programmeSemesters.programmeId, programmeId),
          eq(
            programmeSemesters.instituteId,
            session.instituteId
          )
        )
      )
      .limit(1);

    if (!semester) {
      return Response.json(
        { error: "Invalid semester for selected programme" },
        { status: 400 }
      );
    }

    /*
     * Validate optional Course.
     */
    if (courseId) {
      const [course] = await db
        .select({ id: courses.id })
        .from(courses)
        .where(
          and(
            eq(courses.id, courseId),
            eq(courses.instituteId, session.instituteId)
          )
        )
        .limit(1);

      if (!course) {
        return Response.json(
          { error: "Invalid course" },
          { status: 400 }
        );
      }
    }

    /*
     * Validate optional Teacher.
     */
    if (teacherId) {
      const [teacher] = await db
        .select({ id: staff.id })
        .from(staff)
        .where(
          and(
            eq(staff.id, teacherId),
            eq(staff.instituteId, session.instituteId)
          )
        )
        .limit(1);

      if (!teacher) {
        return Response.json(
          { error: "Invalid teacher" },
          { status: 400 }
        );
      }
    }

    const [batch] = await db
      .insert(batches)
      .values({
        instituteId: session.instituteId,
        name: String(name).trim(),

        courseId: courseId || null,
        teacherId: teacherId || null,

        programmeId,
        semesterId,

        room: room || null,
        startDate: startDate || null,
        endDate: endDate || null,
        fee: fee || null,

        status: "ACTIVE",
      })
      .returning();

    return Response.json({ batch });
  } catch (error) {
    console.error("Batches POST error:", error);

    return Response.json(
      { error: "Failed to create batch" },
      { status: 500 }
    );
  }
}
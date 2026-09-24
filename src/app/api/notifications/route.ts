import { db } from "@/db";
import { notifications } from "@/db/schema";
import { eq, and, desc, isNull, or } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { sql } from "drizzle-orm";
import { sendPushToUsers } from "@/lib/push";
import { ensureAcademicCoreSchema } from "@/lib/academic";

const SEND_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "TEACHER",
  "RECEPTIONIST",
  "ACCOUNTANT",
  "STAFF",
  "DIGITAL_MARKETER",
];

function rowsOf(result: unknown): Record<string, any>[] {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: Record<string, any>[] }).rows;
  }
  return Array.isArray(result) ? (result as Record<string, any>[]) : [];
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const url = new URL(request.url);

    if (url.searchParams.get("options") === "true") {
      if (!session.instituteId) {
        return Response.json({ error: "Institute not found" }, { status: 400 });
      }

      const courses = rowsOf(await db.execute(sql`
        SELECT id, name, course_no AS "courseNo"
        FROM courses
        WHERE institute_id = ${session.instituteId}
          AND status = 'ACTIVE'
        ORDER BY name ASC
      `));

      const programmes = rowsOf(await db.execute(sql`
        SELECT
          p.id,
          p.name,
          p.code,
          p.programme_no AS "programmeNo",
          COALESCE(
            (
              SELECT json_agg(
                json_build_object(
                  'id', ps.id,
                  'semesterNo', ps.semester_no,
                  'name', ps.name
                )
                ORDER BY ps.semester_no
              )
              FROM programme_semesters ps
              WHERE ps.programme_id = p.id
                AND ps.institute_id = p.institute_id
            ),
            '[]'::json
          ) AS semesters
        FROM programmes p
        WHERE p.institute_id = ${session.instituteId}
          AND p.status = 'ACTIVE'
        ORDER BY p.name ASC
      `));

      return Response.json({ courses, programmes });
    }

    if (!session.instituteId) {
      return Response.json({ error: "Institute not found" }, { status: 400 });
    }

    const isSender = SEND_ROLES.includes(session.role);

    const rows = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        body: notifications.body,
        type: notifications.type,
        readAt: notifications.readAt,
        createdAt: notifications.createdAt,
      })
      .from(notifications)
      .where(
        isSender
          ? and(
              eq(notifications.instituteId, session.instituteId),
              isNull(notifications.recipientUserId)
            )
          : eq(notifications.recipientUserId, session.userId)
      )
      .orderBy(desc(notifications.createdAt))
      .limit(50);

    return Response.json({ notifications: rows });
  } catch (error) {
    console.error("GET /api/notifications error:", error);
    return Response.json({ error: "Failed to load notifications" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!SEND_ROLES.includes(session.role)) {
    return Response.json({ error: "You do not have permission to send notifications." }, { status: 403 });
  }

  try {
    await ensureAcademicCoreSchema();
    const body = await request.json();

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const notifBody = typeof body.body === "string" ? body.body.trim() : "";
    const type = typeof body.type === "string" ? body.type : "GENERAL";
    const targetType = typeof body.targetType === "string" ? body.targetType : "ALL";
    const courseId = typeof body.courseId === "string" ? body.courseId.trim() : "";
    const programmeId = typeof body.programmeId === "string" ? body.programmeId.trim() : "";
    const semesterId = typeof body.semesterId === "string" ? body.semesterId.trim() : "";

    const allowedTypes = [
      "ANNOUNCEMENT",
      "FEE_DUE",
      "EXAM",
      "ROUTINE_UPDATE",
      "GENERAL",
    ];

    if (!title) {
      return Response.json({ error: "Title required" }, { status: 400 });
    }

    if (!allowedTypes.includes(type)) {
      return Response.json({ error: "Invalid notification type." }, { status: 400 });
    }

    if (!["COURSE", "PROGRAMME"].includes(targetType)) {
      return Response.json({ error: "Invalid notification target." }, { status: 400 });
    }

    if (targetType === "COURSE" && !courseId) {
      return Response.json({ error: "Please select a course." }, { status: 400 });
    }

    if (targetType === "COURSE") {
      const course = rowsOf(await db.execute(sql`
        SELECT id
        FROM courses
        WHERE id = ${courseId}
          AND institute_id = ${session.instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `))[0];

      if (!course) {
        return Response.json({ error: "Invalid course." }, { status: 400 });
      }
    }

    if (targetType === "PROGRAMME") {
      const programme = rowsOf(await db.execute(sql`
        SELECT id
        FROM programmes
        WHERE id = ${programmeId}
          AND institute_id = ${session.instituteId}
          AND status = 'ACTIVE'
        LIMIT 1
      `))[0];

      if (!programme) {
        return Response.json({ error: "Invalid programme." }, { status: 400 });
      }
    }

    let recipientFilter;

    if (targetType === "COURSE") {
      recipientFilter = sql`
        u.institute_id = ${session.instituteId}
        AND u.role = 'STUDENT'
        AND u.status = 'ACTIVE'
        AND s.institute_id = ${session.instituteId}
        AND s.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1
          FROM enrollments e
          WHERE e.student_id = s.id
            AND e.institute_id = ${session.instituteId}
            AND e.status = 'ACTIVE'
            AND (
              e.course_id = ${courseId}
              OR EXISTS (
                SELECT 1
                FROM batches b
                WHERE b.id = e.batch_id
                  AND b.institute_id = ${session.instituteId}
                  AND b.course_id = ${courseId}
              )
            )
        )
      `;
    } else {
      recipientFilter = sql`
        u.institute_id = ${session.instituteId}
        AND u.role = 'STUDENT'
        AND u.status = 'ACTIVE'
        AND s.institute_id = ${session.instituteId}
        AND s.status = 'ACTIVE'
        AND EXISTS (
          SELECT 1
          FROM enrollments e
          WHERE e.student_id = s.id
            AND e.institute_id = ${session.instituteId}
            AND e.status = 'ACTIVE'
            AND (
              e.programme_id = ${programmeId}
              OR EXISTS (
                SELECT 1
                FROM batches b
                WHERE b.id = e.batch_id
                  AND b.institute_id = ${session.instituteId}
                  AND b.programme_id = ${programmeId}
              )
            )
            ${semesterId ? sql`AND (
              e.semester_id = ${semesterId}
              OR EXISTS (
                SELECT 1
                FROM batches bs
                WHERE bs.id = e.batch_id
                  AND bs.institute_id = ${session.instituteId}
                  AND bs.semester_id = ${semesterId}
              )
            )` : sql``}
        )
      `;
    }

    const result = await db.execute(sql`
      INSERT INTO notifications (
        institute_id,
        recipient_user_id,
        title,
        body,
        type
      )
      SELECT
        ${session.instituteId},
        u.id,
        ${title},
        ${notifBody || null},
        ${type}
      FROM users u
      INNER JOIN students s
        ON s.user_id = u.id
       AND s.institute_id = ${session.instituteId}
      WHERE ${recipientFilter}
      GROUP BY u.id
      RETURNING id
    `);

    const recipientCount = rowsOf(result).length;

    // Re-read the exact recipient user IDs so the same audience also receives
    // a browser/device push notification when they have opted in.
    const recipientUsers = rowsOf(await db.execute(sql`
      SELECT DISTINCT u.id
      FROM users u
      INNER JOIN students s
        ON s.user_id = u.id
       AND s.institute_id = ${session.instituteId}
      WHERE ${recipientFilter}
    `));

    const pushResult = await sendPushToUsers(
      recipientUsers.map((row) => String(row.id)),
      {
        title,
        body: notifBody || null,
        url: "/student",
      },
    );

    // Keep a permanent sender-side history row. Students only receive
    // rows addressed to their own user_id, so this row is not delivered to students.
    await db.execute(sql`
      INSERT INTO notifications (
        institute_id,
        recipient_user_id,
        title,
        body,
        type
      )
      VALUES (
        ${session.instituteId},
        NULL,
        ${title},
        ${notifBody || null},
        ${type}
      )
    `);

    return Response.json(
      {
        success: true,
        recipientCount,
        message:
          recipientCount > 0
            ? `Notification sent to ${recipientCount} student${recipientCount === 1 ? "" : "s"}.`
            : "No matching active students were found for this target.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("POST /api/notifications error:", error);
    return Response.json({ error: "Failed to send notification" }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await request.json();
    const notificationId = typeof body.notificationId === "string" ? body.notificationId.trim() : "";

    if (!notificationId) {
      return Response.json({ error: "Notification ID is required." }, { status: 400 });
    }

    const updated = await db.execute(sql`
      UPDATE notifications
      SET read_at = now()
      WHERE id = ${notificationId}
        AND recipient_user_id = ${session.userId}
      RETURNING id
    `);

    if (rowsOf(updated).length === 0) {
      return Response.json({ error: "Notification not found." }, { status: 404 });
    }

    return Response.json({ success: true });
  } catch (error) {
    console.error("PATCH /api/notifications error:", error);
    return Response.json({ error: "Failed to update notification" }, { status: 500 });
  }
}

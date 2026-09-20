import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureHomeworkSchema } from "@/lib/academic";

const ROLES = ["SUPER_ADMIN","INSTITUTE_ADMIN","MANAGER","ADMIN","INSTITUTE","TEACHER"];

function rowsOf(result: unknown): Record<string, any>[] {
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as {rows?: unknown}).rows)) return (result as {rows: Record<string, any>[]}).rows;
  return Array.isArray(result) ? result as Record<string, any>[] : [];
}

export async function GET(request: Request) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({error:"Unauthorized"},{status:401});
    if (!ROLES.includes(session.role)) return NextResponse.json({error:"Forbidden"},{status:403});
    await ensureHomeworkSchema();

    const id = new URL(request.url).searchParams.get("homeworkId")?.trim();
    if (!id) return NextResponse.json({error:"Homework ID is required."},{status:400});

    const result = await db.execute(sql`
      SELECT
        hs.id,
        hs.homework_id AS "homeworkId",
        hs.answer,
        hs.attachment_url AS "attachmentUrl",
        hs.submitted_at AS "submittedAt",
        s.id AS "studentId",
        s.student_id AS "studentCode",
        s.name AS "studentName"
      FROM homework_submissions hs
      JOIN homework h ON h.id = hs.homework_id
      JOIN students s ON s.id = hs.student_id
      WHERE hs.homework_id = ${id}
        AND hs.institute_id = ${session.instituteId}
      ORDER BY hs.submitted_at DESC
    `);
    return NextResponse.json({submissions: rowsOf(result)});
  } catch (error) {
    console.error("GET /api/homework/submissions error:", error);
    return NextResponse.json({error:"Failed to load submissions."},{status:500});
  }
}

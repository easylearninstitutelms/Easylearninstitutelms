"use server";

import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  batches,
  programmes,
  programmeSemesters,
} from "@/db/schema";
import { getSession } from "@/lib/session";

export async function GET() {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return Response.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const instituteId = session.instituteId;

    const rows = await db
      .select({
        id: batches.id,
        name: batches.name,
        batchNo: batches.batchNo,
        courseId: batches.courseId,
        teacherId: batches.teacherId,
        programmeId: batches.programmeId,
        semesterId: batches.semesterId,
        room: batches.room,
        startDate: batches.startDate,
        endDate: batches.endDate,
        fee: batches.fee,
        status: batches.status,
        createdAt: batches.createdAt,
        updatedAt: batches.updatedAt,
        programmeName: programmes.name,
        programmeCode: programmes.code,
        semesterName: programmeSemesters.name,
        semesterNo: programmeSemesters.semesterNo,
      })
      .from(batches)
      .leftJoin(
        programmes,
        and(
          eq(batches.programmeId, programmes.id),
          eq(programmes.instituteId, instituteId)
        )
      )
      .leftJoin(
        programmeSemesters,
        and(
          eq(
            batches.semesterId,
            programmeSemesters.id
          ),
          eq(
            programmeSemesters.instituteId,
            instituteId
          )
        )
      )
      .where(eq(batches.instituteId, instituteId))
      .orderBy(
        asc(batches.batchNo),
        asc(batches.name)
      );

    return Response.json({ batches: rows });
  } catch (error) {
    console.error("GET /api/batches error:", error);

    return Response.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to load batches.",
      },
      { status: 500 }
    );
  }
}

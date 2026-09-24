import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";

const ALLOWED_STATUSES = [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "ADMITTED",
  "NOT_INTERESTED",
  "LOST",
] as const;

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();

  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { status } = body;

  if (!ALLOWED_STATUSES.includes(status)) {
    return Response.json(
      { error: "Invalid enquiry status" },
      { status: 400 },
    );
  }

  const [updated] = await db
    .update(enquiries)
    .set({
      status,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(enquiries.id, id),
        eq(enquiries.instituteId, session.instituteId),
      ),
    )
    .returning({
      id: enquiries.id,
      instituteId: enquiries.instituteId,
      name: enquiries.name,
      phone: enquiries.phone,
      courseId: enquiries.courseId,
      batchId: enquiries.batchId,
      source: enquiries.source,
      notes: enquiries.notes,
      followUpDate: enquiries.followUpDate,
      status: enquiries.status,
      createdAt: enquiries.createdAt,
      updatedAt: enquiries.updatedAt,
    });

  if (!updated) {
    return Response.json(
      { error: "Enquiry not found" },
      { status: 404 },
    );
  }

  return Response.json({ enquiry: updated });
}

import { db } from "@/db";
import { enquiries } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const body = await request.json();
  const [updated] = await db.update(enquiries).set({ ...body, updatedAt: new Date() })
    .where(and(eq(enquiries.id, id), eq(enquiries.instituteId, session.instituteId))).returning();
  return Response.json({ enquiry: updated });
}

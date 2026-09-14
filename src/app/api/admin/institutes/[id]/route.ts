import { db } from "@/db";
import { institutes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();

  const [updated] = await db.update(institutes).set({ ...body, updatedAt: new Date() })
    .where(eq(institutes.id, id)).returning();

  return Response.json({ institute: updated });
}

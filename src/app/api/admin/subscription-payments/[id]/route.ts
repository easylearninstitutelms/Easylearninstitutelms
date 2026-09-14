import { db } from "@/db";
import { subscriptionPayments, subscriptions, institutes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session || session.role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const body = await request.json();
  const { action, rejectionReason } = body;

  const [subPayment] = await db.select().from(subscriptionPayments).where(eq(subscriptionPayments.id, id)).limit(1);
  if (!subPayment) return Response.json({ error: "Not found" }, { status: 404 });

  if (action === "APPROVE") {
    await db.update(subscriptionPayments).set({
      status: "APPROVED",
      reviewedBy: session.userId,
      reviewedAt: new Date(),
    }).where(eq(subscriptionPayments.id, id));

    // Activate subscription
    if (subPayment.subscriptionId) {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      await db.update(subscriptions).set({
        status: "ACTIVE",
        startDate,
        endDate,
        updatedAt: new Date(),
      }).where(eq(subscriptions.id, subPayment.subscriptionId));
    }

    // Update institute status
    await db.update(institutes).set({
      status: "ACTIVE",
      updatedAt: new Date(),
    }).where(eq(institutes.id, subPayment.instituteId));

  } else if (action === "REJECT") {
    await db.update(subscriptionPayments).set({
      status: "REJECTED",
      reviewedBy: session.userId,
      reviewedAt: new Date(),
      rejectionReason: rejectionReason || "Rejected by admin",
    }).where(eq(subscriptionPayments.id, id));
  }

  return Response.json({ success: true });
}

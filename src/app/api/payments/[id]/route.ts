import { db } from "@/db";
import { fees, payments } from "@/db/schema";
import { and, eq, sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

type PaymentMethod = "CASH" | "BKASH" | "NAGAD" | "ROCKET" | "BANK";
type FeeStatus = "PAID" | "PARTIAL" | "DUE" | "WAIVED";

const METHODS: readonly PaymentMethod[] = ["CASH", "BKASH", "NAGAD", "ROCKET", "BANK"];

function errorResponse(message: string, status = 400) {
  return Response.json({ error: message }, { status });
}

function toNumber(value: unknown) {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value.trim());
  return NaN;
}

function isMethod(value: string): value is PaymentMethod {
  return METHODS.includes(value as PaymentMethod);
}

async function recalculateFee(tx: any, instituteId: string, feeId: string) {
  const [fee] = await tx
    .select({ id: fees.id, amount: fees.amount, discount: fees.discount })
    .from(fees)
    .where(and(eq(fees.id, feeId), eq(fees.instituteId, instituteId)))
    .limit(1);

  if (!fee) return;

  const result = await tx.execute(sql\`
    SELECT COALESCE(SUM(amount), 0) AS total
    FROM payments
    WHERE institute_id = \${instituteId} AND fee_id = \${feeId}
  \`);

  const paid = Number(
    ((result as { rows?: Array<{ total: string | number }> }).rows?.[0]?.total) ?? 0,
  );
  const net = Math.max(0, Number(fee.amount ?? "0") - Number(fee.discount ?? "0"));
  const due = Math.max(0, Math.round((net - paid) * 100) / 100);
  const status: FeeStatus = due <= 0 ? "PAID" : paid > 0 ? "PARTIAL" : "DUE";

  await tx
    .update(fees)
    .set({ dueAmount: due.toFixed(2), status, updatedAt: new Date() })
    .where(and(eq(fees.id, feeId), eq(fees.instituteId, instituteId)));
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.instituteId) return errorResponse("Unauthorized", 401);

  const instituteId = session.instituteId;
  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("Invalid JSON request body");
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return errorResponse("Invalid request body");
  }

  const data = body as Record<string, unknown>;
  const amount = toNumber(data.amount);
  const method = data.method;
  const reference = data.transactionReference ?? null;

  if (!Number.isFinite(amount) || amount <= 0) {
    return errorResponse("Payment amount must be greater than 0");
  }

  if (typeof method !== "string" || !isMethod(method.trim().toUpperCase())) {
    return errorResponse("Invalid payment method");
  }

  if (reference !== null && typeof reference !== "string") {
    return errorResponse("Invalid transaction reference");
  }

  const cleanMethod = method.trim().toUpperCase() as PaymentMethod;
  const cleanReference = typeof reference === "string" ? reference.trim() || null : null;

  try {
    await db.transaction(async (tx) => {
      const [payment] = await tx
        .select({ id: payments.id, feeId: payments.feeId })
        .from(payments)
        .where(and(eq(payments.id, id), eq(payments.instituteId, instituteId)))
        .limit(1);

      if (!payment) throw new Error("Payment not found");

      if (payment.feeId) {
        const [fee] = await tx
          .select({ amount: fees.amount, discount: fees.discount })
          .from(fees)
          .where(and(eq(fees.id, payment.feeId), eq(fees.instituteId, instituteId)))
          .limit(1);

        if (fee) {
          const otherResult = await tx.execute(sql\`
            SELECT COALESCE(SUM(amount), 0) AS total
            FROM payments
            WHERE institute_id = \${instituteId}
              AND fee_id = \${payment.feeId}
              AND id <> \${id}
          \`);

          const otherPaid = Number(
            ((otherResult as { rows?: Array<{ total: string | number }> }).rows?.[0]?.total) ?? 0,
          );
          const net = Math.max(
            0,
            Number(fee.amount ?? "0") - Number(fee.discount ?? "0"),
          );

          if (otherPaid + amount > net + 0.00001) {
            throw new Error("Payment cannot be greater than the fee net amount");
          }
        }
      }

      await tx
        .update(payments)
        .set({
          amount: amount.toFixed(2),
          method: cleanMethod,
          transactionReference: cleanReference,
        })
        .where(and(eq(payments.id, id), eq(payments.instituteId, instituteId)));

      if (payment.feeId) {
        await recalculateFee(tx, instituteId, payment.feeId);
      }
    });

    return Response.json({ success: true, paymentId: id });
  } catch (error) {
    console.error("PUT /api/payments/[id] error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to update payment",
      },
      {
        status:
          error instanceof Error && error.message === "Payment not found"
            ? 404
            : 500,
      },
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await getSession();
  if (!session?.instituteId) return errorResponse("Unauthorized", 401);

  const instituteId = session.instituteId;
  const { id } = await params;

  try {
    await db.transaction(async (tx) => {
      const [payment] = await tx
        .select({ id: payments.id, feeId: payments.feeId })
        .from(payments)
        .where(and(eq(payments.id, id), eq(payments.instituteId, instituteId)))
        .limit(1);

      if (!payment) throw new Error("Payment not found");

      await tx
        .delete(payments)
        .where(and(eq(payments.id, id), eq(payments.instituteId, instituteId)));

      if (payment.feeId) {
        await recalculateFee(tx, instituteId, payment.feeId);
      }
    });

    return Response.json({ success: true, deletedPaymentId: id });
  } catch (error) {
    console.error("DELETE /api/payments/[id] error:", error);
    return Response.json(
      {
        error: error instanceof Error ? error.message : "Failed to delete payment",
      },
      {
        status:
          error instanceof Error && error.message === "Payment not found"
            ? 404
            : 500,
      },
    );
  }
}

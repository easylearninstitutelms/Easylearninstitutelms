import { db } from "@/db";
import { expenses } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getSession } from "@/lib/session";

const EXPENSE_CATEGORIES = new Set([
  "OTHER",
  "RENT",
  "ELECTRICITY",
  "INTERNET",
  "SALARY",
  "MARKETING",
  "STATIONERY",
  "EQUIPMENT",
]);

const PAYMENT_METHODS = new Set([
  "CASH",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "BANK",
]);

type ExpenseCategory =
  | "OTHER"
  | "RENT"
  | "ELECTRICITY"
  | "INTERNET"
  | "SALARY"
  | "MARKETING"
  | "STATIONERY"
  | "EQUIPMENT";

type PaymentMethod =
  | "CASH"
  | "BKASH"
  | "NAGAD"
  | "ROCKET"
  | "BANK";

function errorResponse(
  message: string,
  status = 400,
) {
  return Response.json(
    { error: message },
    { status },
  );
}

function isValidDateOnly(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value
    .split("-")
    .map(Number);

  const date = new Date(
    Date.UTC(year, month - 1, day),
  );

  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function parsePositiveAmount(value: unknown) {
  const amount =
    typeof value === "number"
      ? value
      : typeof value === "string"
        ? Number(value.trim())
        : NaN;

  return Number.isFinite(amount) && amount > 0
    ? amount
    : null;
}

export async function GET(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { searchParams } = new URL(
    request.url,
  );

  const category = searchParams.get("category");

  const conditions = [
    eq(
      expenses.instituteId,
      session.instituteId,
    ),
  ];

  if (category) {
    const cleanCategory =
      category.trim().toUpperCase();

    if (!EXPENSE_CATEGORIES.has(cleanCategory)) {
      return errorResponse(
        "Invalid expense category",
      );
    }

    conditions.push(
      eq(
        expenses.category,
        cleanCategory as ExpenseCategory,
      ),
    );
  }

  const rows = await db
    .select({
      id: expenses.id,
      instituteId: expenses.instituteId,
      category: expenses.category,
      amount: expenses.amount,
      method: expenses.method,
      description: expenses.description,
      expenseDate: expenses.expenseDate,
      addedBy: expenses.addedBy,
      createdAt: expenses.createdAt,
    })
    .from(expenses)
    .where(and(...conditions))
    .orderBy(
      desc(expenses.expenseDate),
      desc(expenses.createdAt),
    );

  return Response.json({
    expenses: rows,
  });
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return errorResponse(
      "Invalid JSON request body",
    );
  }

  if (!body || typeof body !== "object") {
    return errorResponse(
      "Invalid request body",
    );
  }

  const {
    category,
    amount,
    method,
    description,
    expenseDate,
  } = body as {
    category?: unknown;
    amount?: unknown;
    method?: unknown;
    description?: unknown;
    expenseDate?: unknown;
  };

  if (
    typeof category !== "string" ||
    !category.trim()
  ) {
    return errorResponse(
      "Expense category is required",
    );
  }

  const cleanCategory =
    category.trim().toUpperCase();

  if (!EXPENSE_CATEGORIES.has(cleanCategory)) {
    return errorResponse(
      "Invalid expense category",
    );
  }

  const typedCategory =
    cleanCategory as ExpenseCategory;

  const parsedAmount =
    parsePositiveAmount(amount);

  if (parsedAmount === null) {
    return errorResponse(
      "Amount must be greater than 0",
    );
  }

  if (
    typeof method !== "string" ||
    !method.trim()
  ) {
    return errorResponse(
      "Payment method is required",
    );
  }

  const cleanMethod =
    method.trim().toUpperCase();

  if (!PAYMENT_METHODS.has(cleanMethod)) {
    return errorResponse(
      "Invalid payment method",
    );
  }

  const typedMethod =
    cleanMethod as PaymentMethod;

  if (
    typeof expenseDate !== "string" ||
    !isValidDateOnly(expenseDate)
  ) {
    return errorResponse(
      "Valid expense date is required",
    );
  }

  let cleanDescription: string | null = null;

  if (
    description !== undefined &&
    description !== null &&
    description !== ""
  ) {
    if (typeof description !== "string") {
      return errorResponse(
        "Invalid description",
      );
    }

    cleanDescription = description.trim();

    if (cleanDescription.length > 1000) {
      return errorResponse(
        "Description is too long",
      );
    }
  }

  const [expense] = await db
    .insert(expenses)
    .values({
      instituteId: session.instituteId,
      category: typedCategory,
      amount: String(parsedAmount),
      method: typedMethod,
      description: cleanDescription,
      expenseDate,
      addedBy: null,
    })
    .returning();

  return Response.json(
    { expense },
    { status: 201 },
  );
}
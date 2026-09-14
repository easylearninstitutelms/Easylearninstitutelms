import { db } from "@/db";
import { salaries, staff } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const month = searchParams.get("month");

  const conditions = [eq(salaries.instituteId, session.instituteId)];
  if (month) conditions.push(eq(salaries.month, month));

  const rows = await db
    .select({
      salary: salaries,
      staffName: staff.name,
      designation: staff.designation,
    })
    .from(salaries)
    .leftJoin(staff, eq(salaries.staffId, staff.id))
    .where(and(...conditions))
    .orderBy(desc(salaries.createdAt));

  return Response.json({ salaries: rows });
}

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (session.role !== "INSTITUTE_ADMIN" && session.role !== "SUPER_ADMIN") return Response.json({ error: "Forbidden" }, { status: 403 });

  const body = await request.json();
  const { staffId, month, basic, bonus, deduction, paymentDate, method } = body;

  if (!staffId || !month || !basic) {
    return Response.json({ error: "Staff, month and basic salary required" }, { status: 400 });
  }

  const basicAmt = parseFloat(basic);
  const bonusAmt = parseFloat(bonus || "0");
  const deductionAmt = parseFloat(deduction || "0");
  const payable = basicAmt + bonusAmt - deductionAmt;

  const [salary] = await db.insert(salaries).values({
    instituteId: session.instituteId,
    staffId,
    month,
    basic: String(basicAmt),
    bonus: String(bonusAmt),
    deduction: String(deductionAmt),
    payable: String(payable),
    paid: String(payable),
    due: "0",
    paymentDate: paymentDate || null,
    method: method || null,
  }).returning();

  return Response.json({ salary });
}

import { db } from "@/db";
import { salaries, staff } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import {
  getSession,
  requireRoles,
} from "@/lib/session";

const PAYMENT_METHODS = [
  "CASH",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "BANK",
] as const;

const SALARY_VIEW_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "ACCOUNTANT",
  "TEACHER",
];

const SALARY_MANAGE_ROLES = [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "MANAGER",
  "ACCOUNTANT",
];

function errorResponse(
  message: string,
  status = 400,
) {
  return Response.json(
    { error: message },
    { status },
  );
}

export async function GET(
  request: Request,
) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return errorResponse(
        "Unauthorized",
        401,
      );
    }

    const permissionError =
      requireRoles(
        session,
        SALARY_VIEW_ROLES,
      );

    if (permissionError) {
      return permissionError;
    }

    const {
      searchParams,
    } = new URL(request.url);

    const month =
      searchParams.get("month");

    const conditions = [
      eq(
        salaries.instituteId,
        session.instituteId,
      ),
    ];

    if (month) {
      conditions.push(
        eq(
          salaries.month,
          month,
        ),
      );
    }

    /*
     * Teacher can see only
     * their own salary records.
     */
    if (
      session.role ===
      "TEACHER"
    ) {
      const [teacher] =
        await db
          .select({
            id: staff.id,
          })
          .from(staff)
          .where(
            and(
              eq(
                staff.userId,
                session.userId,
              ),
              eq(
                staff.instituteId,
                session.instituteId,
              ),
            ),
          )
          .limit(1);

      if (!teacher) {
        return errorResponse(
          "Teacher profile is not linked to this account.",
          403,
        );
      }

      conditions.push(
        eq(
          salaries.staffId,
          teacher.id,
        ),
      );
    }

    const rows = await db
      .select({
        salary: {
          id: salaries.id,
          month: salaries.month,
          basic: salaries.basic,
          bonus: salaries.bonus,
          deduction: salaries.deduction,
          payable: salaries.payable,
          paid: salaries.paid,
          due: salaries.due,
          paymentDate: salaries.paymentDate,
          method: salaries.method,
        },
        staffName: staff.name,
        designation: staff.designation,
      })
      .from(salaries)
      .leftJoin(
        staff,
        eq(
          salaries.staffId,
          staff.id,
        ),
      )
      .where(
        and(...conditions),
      )
      .orderBy(
        desc(
          salaries.createdAt,
        ),
      );

    return Response.json({
      salaries: rows,
    });
  } catch (error) {
    console.error(
      "GET /api/salaries error:",
      error,
    );

    return errorResponse(
      "Failed to load salary records.",
      500,
    );
  }
}

export async function POST(
  request: Request,
) {
  try {
    const session = await getSession();

    if (!session?.instituteId) {
      return errorResponse(
        "Unauthorized",
        401,
      );
    }

    const permissionError =
      requireRoles(
        session,
        SALARY_MANAGE_ROLES,
      );

    if (permissionError) {
      return permissionError;
    }

    const body =
      await request.json();

    const {
      staffId,
      month,
      basic,
      bonus,
      deduction,
      paymentDate,
      method,
    } = body;

    if (!staffId) {
      return errorResponse(
        "Staff member is required.",
      );
    }

    if (!month) {
      return errorResponse(
        "Salary month is required.",
      );
    }

    if (
      !/^\d{4}-\d{2}$/.test(
        String(month),
      )
    ) {
      return errorResponse(
        "Invalid salary month.",
      );
    }

    if (
      !basic ||
      String(basic).trim() ===
        ""
    ) {
      return errorResponse(
        "Basic salary is required.",
      );
    }

    const basicAmt =
      Number(basic);

    const bonusAmt =
      bonus === undefined ||
      bonus === null ||
      String(bonus).trim() ===
        ""
        ? 0
        : Number(bonus);

    const deductionAmt =
      deduction === undefined ||
      deduction === null ||
      String(
        deduction,
      ).trim() === ""
        ? 0
        : Number(deduction);

    if (
      !Number.isFinite(
        basicAmt,
      )
    ) {
      return errorResponse(
        "Basic salary must be a valid number.",
      );
    }

    if (
      !Number.isFinite(
        bonusAmt,
      )
    ) {
      return errorResponse(
        "Bonus must be a valid number.",
      );
    }

    if (
      !Number.isFinite(
        deductionAmt,
      )
    ) {
      return errorResponse(
        "Deduction must be a valid number.",
      );
    }

    if (basicAmt <= 0) {
      return errorResponse(
        "Basic salary must be greater than 0.",
      );
    }

    if (bonusAmt < 0) {
      return errorResponse(
        "Bonus cannot be negative.",
      );
    }

    if (deductionAmt < 0) {
      return errorResponse(
        "Deduction cannot be negative.",
      );
    }

    const payable =
      basicAmt +
      bonusAmt -
      deductionAmt;

    if (payable <= 0) {
      return errorResponse(
        "Payable salary must be greater than 0.",
      );
    }

    if (
      method &&
      !PAYMENT_METHODS.includes(
        method,
      )
    ) {
      return errorResponse(
        "Invalid payment method.",
      );
    }

    if (paymentDate) {
      const parsedDate =
        new Date(
          `${paymentDate}T00:00:00`,
        );

      if (
        Number.isNaN(
          parsedDate.getTime(),
        )
      ) {
        return errorResponse(
          "Invalid payment date.",
        );
      }
    }

    const existingStaff =
      await db
        .select({
          id: staff.id,
          name: staff.name,
        })
        .from(staff)
        .where(
          and(
            eq(
              staff.id,
              staffId,
            ),
            eq(
              staff.instituteId,
              session.instituteId,
            ),
          ),
        )
        .limit(1);

    if (
      existingStaff.length ===
      0
    ) {
      return errorResponse(
        "Staff member not found.",
        404,
      );
    }

    const existingSalary =
      await db
        .select({
          id: salaries.id,
        })
        .from(salaries)
        .where(
          and(
            eq(
              salaries.instituteId,
              session.instituteId,
            ),
            eq(
              salaries.staffId,
              staffId,
            ),
            eq(
              salaries.month,
              month,
            ),
          ),
        )
        .limit(1);

    if (
      existingSalary.length >
      0
    ) {
      return errorResponse(
        "Salary record already exists for this staff member and month.",
      );
    }

    const [salary] =
      await db
        .insert(salaries)
        .values({
          instituteId:
            session.instituteId,
          staffId,
          month: String(
            month,
          ),
          basic:
            basicAmt.toFixed(2),
          bonus:
            bonusAmt.toFixed(2),
          deduction:
            deductionAmt.toFixed(
              2,
            ),
          payable:
            payable.toFixed(2),
          paid:
            payable.toFixed(2),
          due: "0.00",
          paymentDate:
            paymentDate || null,
          method:
            method || null,
        })
        .returning({
          id: salaries.id,
          month: salaries.month,
          basic: salaries.basic,
          bonus: salaries.bonus,
          deduction: salaries.deduction,
          payable: salaries.payable,
          paid: salaries.paid,
          due: salaries.due,
          paymentDate: salaries.paymentDate,
          method: salaries.method,
        });

    return Response.json(
      {
        salary,
        message:
          "Salary processed successfully.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error(
      "POST /api/salaries error:",
      error,
    );

    return errorResponse(
      "Failed to process salary.",
      500,
    );
  }
}
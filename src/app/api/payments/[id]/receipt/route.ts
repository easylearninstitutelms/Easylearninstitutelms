import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

type Row = Record<string, unknown>;

function rowsOf(result: unknown): Row[] {
  if (
    result &&
    typeof result === "object" &&
    "rows" in result &&
    Array.isArray((result as { rows?: unknown }).rows)
  ) {
    return (result as { rows: Row[] }).rows;
  }

  return Array.isArray(result) ? (result as Row[]) : [];
}

function value(row: Row, key: string) {
  const v = row[key];
  return v === undefined || v === null ? null : v;
}

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{ id: string }>;
  },
) {
  const session = await getSession();

  if (!session?.instituteId) {
    return Response.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { id } = await params;

  if (!id) {
    return Response.json(
      { error: "Payment ID is required" },
      { status: 400 },
    );
  }

  try {
    const result = await db.execute(sql`
      SELECT
        p.id,
        p.amount,
        p.method,
        p.transaction_reference AS "transactionReference",
        p.receipt_number AS "receiptNumber",
        p.paid_at AS "paidAt",

        s.id AS "studentId",
        s.student_id AS "studentCode",
        s.name AS "studentName",

        f.id AS "feeId",
        f.fee_type AS "feeType",
        f.amount AS "feeAmount",
        f.discount AS "feeDiscount",
        f.due_amount AS "feeDueAmount",
        f.due_date AS "feeDueDate",

        i.name AS "instituteName",
        i.logo_url AS "instituteLogoUrl",
        i.phone AS "institutePhone",
        i.address AS "instituteAddress",

        academic."batchNo",
        academic."batchName",
        academic."courseName",
        academic."courseNo",
        academic."programmeName",
        academic."programmeCode",
        academic."programmeNo",
        
        COALESCE(fs.name, academic."semesterName") AS "semesterName",
        COALESCE(fs.semester_no, academic."semesterNo") AS "semesterNo"

      FROM payments p

      INNER JOIN students s
        ON s.id = p.student_id

      INNER JOIN institutes i
        ON i.id = p.institute_id

      LEFT JOIN fees f
        ON f.id = p.fee_id

      LEFT JOIN programme_semesters fs 
        ON fs.id = f.semester_id

      LEFT JOIN LATERAL (
        SELECT
          b.batch_no AS "batchNo",
          b.name AS "batchName",
          c.name AS "courseName",
          c.course_no AS "courseNo",
          pr.name AS "programmeName",
          pr.code AS "programmeCode",
          pr.programme_no AS "programmeNo",
          ps.name AS "semesterName",
          ps.semester_no AS "semesterNo"
        FROM enrollments e
        LEFT JOIN batches b ON b.id = e.batch_id
        LEFT JOIN courses c ON c.id = COALESCE(e.course_id, b.course_id)
        LEFT JOIN programmes pr ON pr.id = COALESCE(e.programme_id, b.programme_id)
        LEFT JOIN programme_semesters ps ON ps.id = b.semester_id
        WHERE e.student_id = p.student_id
          AND e.institute_id = p.institute_id
          AND e.status = 'ACTIVE'
        ORDER BY e.enrollment_date DESC, e.id DESC
        LIMIT 1
      ) academic ON TRUE

      WHERE p.id = ${id}
        AND p.institute_id = ${session.instituteId}

      LIMIT 1
    `);

    const row = rowsOf(result)[0];

    if (!row) {
      return Response.json(
        { error: "Payment not found" },
        { status: 404 },
      );
    }

    return Response.json({
      receipt: {
        payment: {
          id: String(value(row, "id") ?? ""),
          amount: String(value(row, "amount") ?? "0"),
          method: String(value(row, "method") ?? ""),
          transactionReference: value(row, "transactionReference") ?? null,
          receiptNumber: String(value(row, "receiptNumber") ?? ""),
          paidAt: value(row, "paidAt") ?? null,
        },

        student: {
          id: String(value(row, "studentId") ?? ""),
          studentCode: String(value(row, "studentCode") ?? ""),
          name: String(value(row, "studentName") ?? ""),
        },

        fee: {
          id: value(row, "feeId") ?? null,
          type: value(row, "feeType") ?? null,
          amount: value(row, "feeAmount") ?? null,
          discount: value(row, "feeDiscount") ?? null,
          dueAmount: value(row, "feeDueAmount") ?? null,
          dueDate: value(row, "feeDueDate") ?? null,
        },

        institute: {
          name: String(value(row, "instituteName") ?? "Easylearn Institute"),
          logoUrl: value(row, "instituteLogoUrl") ?? null,
          phone: value(row, "institutePhone") ?? null,
          address: value(row, "instituteAddress") ?? null,
        },

        academic: {
          batchNo: value(row, "batchNo") ?? null,
          batchName: value(row, "batchName") ?? null,
          courseName: value(row, "courseName") ?? null,
          courseNo: value(row, "courseNo") ?? null,
          programmeName: value(row, "programmeName") ?? null,
          programmeCode: value(row, "programmeCode") ?? null,
          programmeNo: value(row, "programmeNo") ?? null,
          semesterName: value(row, "semesterName") ?? null,
          semesterNo: value(row, "semesterNo") ?? null,
        },
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown database error";
    console.error("Payment receipt GET error:", errorMessage, error);

    return Response.json(
      { 
        error: "Failed to load receipt details", 
        details: errorMessage 
      },
      { status: 500 },
    );
  }
}
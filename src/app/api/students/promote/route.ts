import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session || !session.instituteId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { studentId, nextSemester, feeAmount } = body;

    if (!studentId) {
      return Response.json({ error: "Student ID required" }, { status: 400 });
    }

    const targetSemester = Number(nextSemester) || 2;
    const fee = parseFloat(String(feeAmount || "0"));

    // ১. স্টুডেন্টের সেমিস্টার আপডেট করা
    await db.execute(sql`
      UPDATE public.students 
      SET current_semester = ${targetSemester}, updated_at = NOW() 
      WHERE id = ${studentId} AND institute_id = ${session.instituteId}
    `);

    // ২. নতুন সেমিস্টারের ফি যদি ০ এর বেশি হয়, তবে স্বয়ংক্রিয়ভাবে DUE রেকর্ড তৈরি করা
    if (fee > 0) {
      await db.execute(sql`
        INSERT INTO public.fees (
          institute_id,
          student_id,
          fee_type,
          amount,
          discount,
          due_amount,
          status,
          created_at,
          updated_at
        ) VALUES (
          ${session.instituteId},
          ${studentId},
          'COURSE',
          ${fee.toString()},
          '0',
          ${fee.toString()},
          'DUE',
          NOW(),
          NOW()
        )
      `);
    }

    return Response.json({
      success: true,
      message: `শিক্ষার্থীকে সফলভাবে Semester ${targetSemester}-এ প্রমোট করা হয়েছে।`,
    });
  } catch (err: any) {
    console.error("Promote error:", err);
    return Response.json(
      { error: err.message || "Failed to promote student" },
      { status: 500 }
    );
  }
}
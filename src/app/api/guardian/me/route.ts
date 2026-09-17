import { db } from "@/db";
import {
  users,
  guardianStudents,
  students,
  enrollments,
  batches,
  courses,
  attendance,
  homework,
  exams,
  examSubjects,
  results,
  fees,
  payments,
} from "@/db/schema";
import {
  and,
  count,
  desc,
  eq,
  inArray,
} from "drizzle-orm";
import {
  getSession,
} from "@/lib/session";

export async function GET() {
  const session =
    await getSession();

  if (!session?.instituteId) {
    return Response.json(
      {
        error: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  if (session.role !== "GUARDIAN") {
    return Response.json(
      {
        error: "Forbidden",
      },
      {
        status: 403,
      },
    );
  }

  try {
    const instituteId =
      session.instituteId;

    const guardianUserId =
      session.userId;

    /*
     * Guardian account
     */
    const [guardian] =
      await db
        .select({
          id: users.id,
          name: users.name,
          email: users.email,
          phone: users.phone,
          status: users.status,
        })
        .from(users)
        .where(
          and(
            eq(
              users.id,
              guardianUserId,
            ),
            eq(
              users.instituteId,
              instituteId,
            ),
            eq(
              users.role,
              "GUARDIAN",
            ),
          ),
        )
        .limit(1);

    if (!guardian) {
      return Response.json(
        {
          error:
            "Guardian account not found.",
        },
        {
          status: 404,
        },
      );
    }

    /*
     * Get every student linked to
     * this guardian.
     */
    const links =
      await db
        .select({
          linkId:
            guardianStudents.id,
          relation:
            guardianStudents.relation,
          studentId:
            guardianStudents.studentId,
        })
        .from(guardianStudents)
        .where(
          and(
            eq(
              guardianStudents.guardianUserId,
              guardianUserId,
            ),
            eq(
              guardianStudents.instituteId,
              instituteId,
            ),
          ),
        )
        .orderBy(
          desc(
            guardianStudents.createdAt,
          ),
        );

    const studentIds =
      links.map(
        (link) =>
          link.studentId,
      );

    if (studentIds.length === 0) {
      return Response.json({
        guardian,
        children: [],
      });
    }

    /*
     * Load basic student profiles first.
     */
    const studentRows =
      await db
        .select({
          id: students.id,
          userId:
            students.userId,
          studentId:
            students.studentId,
          name: students.name,
          photoUrl:
            students.photoUrl,
          phone:
            students.phone,
          guardianName:
            students.guardianName,
          guardianPhone:
            students.guardianPhone,
          address:
            students.address,
          dob:
            students.dob,
          gender:
            students.gender,
          admissionDate:
            students.admissionDate,
          status:
            students.status,
        })
        .from(students)
        .where(
          and(
            eq(
              students.instituteId,
              instituteId,
            ),
            inArray(
              students.id,
              studentIds,
            ),
          ),
        );

    /*
     * Prepare one full portal payload
     * for every linked child.
     */
    const children =
      await Promise.all(
        links.map(
          async (link) => {
            const student =
              studentRows.find(
                (row) =>
                  row.id ===
                  link.studentId,
              );

            if (!student) {
              return null;
            }

            /*
             * Enrollments
             */
            const enrollmentRows =
              await db
                .select({
                  enrollment: {
                    id:
                      enrollments.id,
                    enrollmentDate:
                      enrollments.enrollmentDate,
                    status:
                      enrollments.status,
                  },

                  batch: {
                    id:
                      batches.id,
                    name:
                      batches.name,
                    room:
                      batches.room,
                    startDate:
                      batches.startDate,
                    endDate:
                      batches.endDate,
                    status:
                      batches.status,
                  },

                  course: {
                    id:
                      courses.id,
                    name:
                      courses.name,
                    duration:
                      courses.duration,
                    fee:
                      courses.fee,
                  },
                })
                .from(enrollments)
                .leftJoin(
                  batches,
                  eq(
                    enrollments.batchId,
                    batches.id,
                  ),
                )
                .leftJoin(
                  courses,
                  eq(
                    batches.courseId,
                    courses.id,
                  ),
                )
                .where(
                  and(
                    eq(
                      enrollments.studentId,
                      student.id,
                    ),
                    eq(
                      enrollments.instituteId,
                      instituteId,
                    ),
                  ),
                )
                .orderBy(
                  desc(
                    enrollments.enrollmentDate,
                  ),
                );

            const activeEnrollments =
              enrollmentRows.filter(
                (row) =>
                  row.enrollment
                    .status ===
                    "ACTIVE" ||
                  row.enrollment
                    .status ===
                    "INACTIVE",
              );

            const activeBatchIds =
              activeEnrollments
                .map(
                  (row) =>
                    row.batch?.id,
                )
                .filter(
                  (
                    id,
                  ): id is string =>
                    Boolean(id),
                );

            /*
             * Attendance records
             */
            const attendanceRows =
              await db
                .select({
                  id:
                    attendance.id,
                  date:
                    attendance.date,
                  status:
                    attendance.status,
                  note:
                    attendance.note,
                  batchId:
                    attendance.batchId,
                })
                .from(attendance)
                .where(
                  and(
                    eq(
                      attendance.studentId,
                      student.id,
                    ),
                    eq(
                      attendance.instituteId,
                      instituteId,
                    ),
                  ),
                )
                .orderBy(
                  desc(
                    attendance.date,
                  ),
                )
                .limit(100);

            /*
             * Attendance summary
             */
            const attendanceGrouped =
              await db
                .select({
                  status:
                    attendance.status,
                  total:
                    count(
                      attendance.id,
                    ),
                })
                .from(attendance)
                .where(
                  and(
                    eq(
                      attendance.studentId,
                      student.id,
                    ),
                    eq(
                      attendance.instituteId,
                      instituteId,
                    ),
                  ),
                )
                .groupBy(
                  attendance.status,
                );

            const attendanceSummary = {
              total: 0,
              present: 0,
              absent: 0,
              late: 0,
              leave: 0,
            };

            for (
              const row of attendanceGrouped
            ) {
              const total =
                Number(
                  row.total,
                ) || 0;

              attendanceSummary.total +=
                total;

              if (
                row.status ===
                "PRESENT"
              ) {
                attendanceSummary.present =
                  total;
              }

              if (
                row.status ===
                "ABSENT"
              ) {
                attendanceSummary.absent =
                  total;
              }

              if (
                row.status ===
                "LATE"
              ) {
                attendanceSummary.late =
                  total;
              }

              if (
                row.status ===
                "LEAVE"
              ) {
                attendanceSummary.leave =
                  total;
              }
            }

            const attendancePercentage =
              attendanceSummary.total >
              0
                ? Number(
                    (
                      (attendanceSummary.present /
                        attendanceSummary.total) *
                      100
                    ).toFixed(
                      2,
                    ),
                  )
                : 0;

            /*
             * Homework
             *
             * Only homework from the
             * child's own active batches.
             */
            const homeworkRows =
              activeBatchIds.length >
              0
                ? await db
                    .select({
                      id:
                        homework.id,
                      batchId:
                        homework.batchId,
                      title:
                        homework.title,
                      description:
                        homework.description,
                      deadline:
                        homework.deadline,
                      attachmentUrl:
                        homework.attachmentUrl,
                      createdAt:
                        homework.createdAt,
                      batchName:
                        batches.name,
                    })
                    .from(homework)
                    .leftJoin(
                      batches,
                      eq(
                        homework.batchId,
                        batches.id,
                      ),
                    )
                    .where(
                      and(
                        eq(
                          homework.instituteId,
                          instituteId,
                        ),
                        inArray(
                          homework.batchId,
                          activeBatchIds,
                        ),
                      ),
                    )
                    .orderBy(
                      desc(
                        homework.createdAt,
                      ),
                    )
                    .limit(100)
                : [];

            /*
             * Results
             */
            const resultRows =
              await db
                .select({
                  id:
                    results.id,
                  examId:
                    results.examId,
                  examSubjectId:
                    results.examSubjectId,
                  marks:
                    results.marks,
                  grade:
                    results.grade,
                  remarks:
                    results.remarks,
                  createdAt:
                    results.createdAt,

                  exam: {
                    id:
                      exams.id,
                    name:
                      exams.name,
                    batchId:
                      exams.batchId,
                    examDate:
                      exams.examDate,
                  },

                  subject: {
                    id:
                      examSubjects.id,
                    subjectName:
                      examSubjects.subjectName,
                    totalMarks:
                      examSubjects.totalMarks,
                  },
                })
                .from(results)
                .leftJoin(
                  exams,
                  eq(
                    results.examId,
                    exams.id,
                  ),
                )
                .leftJoin(
                  examSubjects,
                  eq(
                    results.examSubjectId,
                    examSubjects.id,
                  ),
                )
                .where(
                  and(
                    eq(
                      results.studentId,
                      student.id,
                    ),
                    eq(
                      results.instituteId,
                      instituteId,
                    ),
                  ),
                )
                .orderBy(
                  desc(
                    results.createdAt,
                  ),
                )
                .limit(200);

            /*
             * Fees
             */
            const feeRows =
              await db
                .select({
                  id:
                    fees.id,
                  feeType:
                    fees.feeType,
                  amount:
                    fees.amount,
                  discount:
                    fees.discount,
                  dueAmount:
                    fees.dueAmount,
                  dueDate:
                    fees.dueDate,
                  status:
                    fees.status,
                  createdAt:
                    fees.createdAt,
                })
                .from(fees)
                .where(
                  and(
                    eq(
                      fees.studentId,
                      student.id,
                    ),
                    eq(
                      fees.instituteId,
                      instituteId,
                    ),
                  ),
                )
                .orderBy(
                  desc(
                    fees.createdAt,
                  ),
                );

            /*
             * Payments
             */
            const paymentRows =
              await db
                .select({
                  id:
                    payments.id,
                  feeId:
                    payments.feeId,
                  amount:
                    payments.amount,
                  method:
                    payments.method,
                  transactionReference:
                    payments.transactionReference,
                  receiptNumber:
                    payments.receiptNumber,
                  paidAt:
                    payments.paidAt,
                })
                .from(payments)
                .where(
                  and(
                    eq(
                      payments.studentId,
                      student.id,
                    ),
                    eq(
                      payments.instituteId,
                      instituteId,
                    ),
                  ),
                )
                .orderBy(
                  desc(
                    payments.paidAt,
                  ),
                )
                .limit(200);

            const totalFees =
              feeRows.reduce(
                (sum, fee) =>
                  sum +
                  Number(
                    fee.amount ||
                      0,
                  ),
                0,
              );

            const totalDiscount =
              feeRows.reduce(
                (sum, fee) =>
                  sum +
                  Number(
                    fee.discount ||
                      0,
                  ),
                0,
              );

            const totalDue =
              feeRows.reduce(
                (sum, fee) =>
                  sum +
                  Number(
                    fee.dueAmount ||
                      0,
                  ),
                0,
              );

            const totalPaid =
              paymentRows.reduce(
                (
                  sum,
                  payment,
                ) =>
                  sum +
                  Number(
                    payment.amount ||
                      0,
                  ),
                0,
              );

            return {
              linkId:
                link.linkId,

              relation:
                link.relation,

              student,

              enrollments:
                activeEnrollments,

              attendance: {
                records:
                  attendanceRows,
                summary:
                  attendanceSummary,
                percentage:
                  attendancePercentage,
              },

              homework:
                homeworkRows,

              results:
                resultRows,

              fees: {
                records:
                  feeRows,
                summary: {
                  totalFees:
                    Number(
                      totalFees.toFixed(
                        2,
                      ),
                    ),

                  totalDiscount:
                    Number(
                      totalDiscount.toFixed(
                        2,
                      ),
                    ),

                  totalDue:
                    Number(
                      totalDue.toFixed(
                        2,
                      ),
                    ),

                  totalPaid:
                    Number(
                      totalPaid.toFixed(
                        2,
                      ),
                    ),
                },
              },

              payments:
                paymentRows,
            };
          },
        ),
      );

    return Response.json({
      guardian,
      children:
        children.filter(
          Boolean,
        ),
    });
  } catch (error) {
    console.error(
      "GET /api/guardian/me error:",
      error,
    );

    return Response.json(
      {
        error:
          "Failed to load guardian portal data.",
      },
      {
        status: 500,
      },
    );
  }
}
import { relations } from "drizzle-orm/relations";
import { users, passwordResetTokens, courses, teacherAssignments, institutes, programmes, staff, batches, attendance, students, assignments, programmeSemesters, auditLogs, expenses, fees, notifications, payments, exams, results, examSubjects, homework, courseSyllabusClasses, programmeSyllabusClasses, subscriptionPayments, subscriptions, plans, salaries, enquiries, routines, guardianStudents, enrollments, homeworkSubmissions, courseClassRecordings, programmeSyllabusRecordings, marketingDailyReports, marketingAdSpends } from "./schema";

export const passwordResetTokensRelations = relations(passwordResetTokens, ({one}) => ({
	user: one(users, {
		fields: [passwordResetTokens.userId],
		references: [users.id]
	}),
}));

export const usersRelations = relations(users, ({one, many}) => ({
	passwordResetTokens: many(passwordResetTokens),
	attendances: many(attendance),
	auditLogs: many(auditLogs),
	expenses: many(expenses),
	notifications: many(notifications),
	payments: many(payments),
	institute: one(institutes, {
		fields: [users.instituteId],
		references: [institutes.id]
	}),
	subscriptionPayments: many(subscriptionPayments),
	staff: many(staff),
	guardianStudents: many(guardianStudents),
	students: many(students),
}));

export const teacherAssignmentsRelations = relations(teacherAssignments, ({one}) => ({
	course: one(courses, {
		fields: [teacherAssignments.courseId],
		references: [courses.id]
	}),
	institute: one(institutes, {
		fields: [teacherAssignments.instituteId],
		references: [institutes.id]
	}),
	programme: one(programmes, {
		fields: [teacherAssignments.programmeId],
		references: [programmes.id]
	}),
	staff: one(staff, {
		fields: [teacherAssignments.teacherId],
		references: [staff.id]
	}),
}));

export const coursesRelations = relations(courses, ({one, many}) => ({
	teacherAssignments: many(teacherAssignments),
	institute: one(institutes, {
		fields: [courses.instituteId],
		references: [institutes.id]
	}),
	batches: many(batches),
	homework: many(homework),
	enquiries: many(enquiries),
	enrollments: many(enrollments),
	courseSyllabusClasses: many(courseSyllabusClasses),
}));

export const institutesRelations = relations(institutes, ({many}) => ({
	teacherAssignments: many(teacherAssignments),
	attendances: many(attendance),
	assignments: many(assignments),
	courses: many(courses),
	batches: many(batches),
	auditLogs: many(auditLogs),
	expenses: many(expenses),
	fees: many(fees),
	notifications: many(notifications),
	payments: many(payments),
	results: many(results),
	homework: many(homework),
	users: many(users),
	subscriptionPayments: many(subscriptionPayments),
	subscriptions: many(subscriptions),
	staff: many(staff),
	salaries: many(salaries),
	programmeSemesters: many(programmeSemesters),
	enquiries: many(enquiries),
	examSubjects: many(examSubjects),
	routines: many(routines),
	guardianStudents: many(guardianStudents),
	students: many(students),
	programmes: many(programmes),
	exams: many(exams),
	enrollments: many(enrollments),
	programmeSyllabusClasses: many(programmeSyllabusClasses),
	courseSyllabusClasses: many(courseSyllabusClasses),
	courseClassRecordings: many(courseClassRecordings),
	programmeSyllabusRecordings: many(programmeSyllabusRecordings),
	marketingDailyReports: many(marketingDailyReports),
	marketingAdSpends: many(marketingAdSpends),
}));

export const programmesRelations = relations(programmes, ({one, many}) => ({
	teacherAssignments: many(teacherAssignments),
	batches: many(batches),
	homework: many(homework),
	programmeSemesters: many(programmeSemesters),
	institute: one(institutes, {
		fields: [programmes.instituteId],
		references: [institutes.id]
	}),
	exams: many(exams),
	enrollments: many(enrollments),
	programmeSyllabusClasses: many(programmeSyllabusClasses),
}));

export const staffRelations = relations(staff, ({one, many}) => ({
	teacherAssignments: many(teacherAssignments),
	assignments: many(assignments),
	batches: many(batches),
	homework: many(homework),
	institute: one(institutes, {
		fields: [staff.instituteId],
		references: [institutes.id]
	}),
	user: one(users, {
		fields: [staff.userId],
		references: [users.id]
	}),
	salaries: many(salaries),
	routines: many(routines),
}));

export const attendanceRelations = relations(attendance, ({one}) => ({
	batch: one(batches, {
		fields: [attendance.batchId],
		references: [batches.id]
	}),
	institute: one(institutes, {
		fields: [attendance.instituteId],
		references: [institutes.id]
	}),
	user: one(users, {
		fields: [attendance.recordedBy],
		references: [users.id]
	}),
	student: one(students, {
		fields: [attendance.studentId],
		references: [students.id]
	}),
}));

export const batchesRelations = relations(batches, ({one, many}) => ({
	attendances: many(attendance),
	assignments: many(assignments),
	course: one(courses, {
		fields: [batches.courseId],
		references: [courses.id]
	}),
	institute: one(institutes, {
		fields: [batches.instituteId],
		references: [institutes.id]
	}),
	programme: one(programmes, {
		fields: [batches.programmeId],
		references: [programmes.id]
	}),
	programmeSemester: one(programmeSemesters, {
		fields: [batches.semesterId],
		references: [programmeSemesters.id]
	}),
	staff: one(staff, {
		fields: [batches.teacherId],
		references: [staff.id]
	}),
	homework: many(homework),
	enquiries: many(enquiries),
	routines: many(routines),
	exams: many(exams),
	enrollments: many(enrollments),
}));

export const studentsRelations = relations(students, ({one, many}) => ({
	attendances: many(attendance),
	fees: many(fees),
	payments: many(payments),
	results: many(results),
	guardianStudents: many(guardianStudents),
	institute: one(institutes, {
		fields: [students.instituteId],
		references: [institutes.id]
	}),
	user: one(users, {
		fields: [students.userId],
		references: [users.id]
	}),
	enrollments: many(enrollments),
}));

export const assignmentsRelations = relations(assignments, ({one}) => ({
	batch: one(batches, {
		fields: [assignments.batchId],
		references: [batches.id]
	}),
	institute: one(institutes, {
		fields: [assignments.instituteId],
		references: [institutes.id]
	}),
	staff: one(staff, {
		fields: [assignments.teacherId],
		references: [staff.id]
	}),
}));

export const programmeSemestersRelations = relations(programmeSemesters, ({one, many}) => ({
	batches: many(batches),
	homework: many(homework),
	institute: one(institutes, {
		fields: [programmeSemesters.instituteId],
		references: [institutes.id]
	}),
	programme: one(programmes, {
		fields: [programmeSemesters.programmeId],
		references: [programmes.id]
	}),
	exams: many(exams),
	programmeSyllabusClasses: many(programmeSyllabusClasses),
}));

export const auditLogsRelations = relations(auditLogs, ({one}) => ({
	user: one(users, {
		fields: [auditLogs.actorUserId],
		references: [users.id]
	}),
	institute: one(institutes, {
		fields: [auditLogs.instituteId],
		references: [institutes.id]
	}),
}));

export const expensesRelations = relations(expenses, ({one}) => ({
	user: one(users, {
		fields: [expenses.addedBy],
		references: [users.id]
	}),
	institute: one(institutes, {
		fields: [expenses.instituteId],
		references: [institutes.id]
	}),
}));

export const feesRelations = relations(fees, ({one, many}) => ({
	institute: one(institutes, {
		fields: [fees.instituteId],
		references: [institutes.id]
	}),
	student: one(students, {
		fields: [fees.studentId],
		references: [students.id]
	}),
	payments: many(payments),
}));

export const notificationsRelations = relations(notifications, ({one}) => ({
	institute: one(institutes, {
		fields: [notifications.instituteId],
		references: [institutes.id]
	}),
	user: one(users, {
		fields: [notifications.recipientUserId],
		references: [users.id]
	}),
}));

export const paymentsRelations = relations(payments, ({one}) => ({
	user: one(users, {
		fields: [payments.collectedBy],
		references: [users.id]
	}),
	fee: one(fees, {
		fields: [payments.feeId],
		references: [fees.id]
	}),
	institute: one(institutes, {
		fields: [payments.instituteId],
		references: [institutes.id]
	}),
	student: one(students, {
		fields: [payments.studentId],
		references: [students.id]
	}),
}));

export const resultsRelations = relations(results, ({one}) => ({
	exam: one(exams, {
		fields: [results.examId],
		references: [exams.id]
	}),
	examSubject: one(examSubjects, {
		fields: [results.examSubjectId],
		references: [examSubjects.id]
	}),
	institute: one(institutes, {
		fields: [results.instituteId],
		references: [institutes.id]
	}),
	student: one(students, {
		fields: [results.studentId],
		references: [students.id]
	}),
}));

export const examsRelations = relations(exams, ({one, many}) => ({
	results: many(results),
	examSubjects: many(examSubjects),
	batch: one(batches, {
		fields: [exams.batchId],
		references: [batches.id]
	}),
	institute: one(institutes, {
		fields: [exams.instituteId],
		references: [institutes.id]
	}),
	programme: one(programmes, {
		fields: [exams.programmeId],
		references: [programmes.id]
	}),
	programmeSemester: one(programmeSemesters, {
		fields: [exams.semesterId],
		references: [programmeSemesters.id]
	}),
}));

export const examSubjectsRelations = relations(examSubjects, ({one, many}) => ({
	results: many(results),
	exam: one(exams, {
		fields: [examSubjects.examId],
		references: [exams.id]
	}),
	institute: one(institutes, {
		fields: [examSubjects.instituteId],
		references: [institutes.id]
	}),
}));

export const homeworkRelations = relations(homework, ({one, many}) => ({
	batch: one(batches, {
		fields: [homework.batchId],
		references: [batches.id]
	}),
	courseSyllabusClass: one(courseSyllabusClasses, {
		fields: [homework.courseClassId],
		references: [courseSyllabusClasses.id]
	}),
	course: one(courses, {
		fields: [homework.courseId],
		references: [courses.id]
	}),
	institute: one(institutes, {
		fields: [homework.instituteId],
		references: [institutes.id]
	}),
	programmeSyllabusClass: one(programmeSyllabusClasses, {
		fields: [homework.programmeClassId],
		references: [programmeSyllabusClasses.id]
	}),
	programme: one(programmes, {
		fields: [homework.programmeId],
		references: [programmes.id]
	}),
	programmeSemester: one(programmeSemesters, {
		fields: [homework.semesterId],
		references: [programmeSemesters.id]
	}),
	staff: one(staff, {
		fields: [homework.teacherId],
		references: [staff.id]
	}),
	homeworkSubmissions: many(homeworkSubmissions),
}));

export const courseSyllabusClassesRelations = relations(courseSyllabusClasses, ({one, many}) => ({
	homework: many(homework),
	course: one(courses, {
		fields: [courseSyllabusClasses.courseId],
		references: [courses.id]
	}),
	institute: one(institutes, {
		fields: [courseSyllabusClasses.instituteId],
		references: [institutes.id]
	}),
	courseClassRecordings: many(courseClassRecordings),
}));

export const programmeSyllabusClassesRelations = relations(programmeSyllabusClasses, ({one, many}) => ({
	homework: many(homework),
	institute: one(institutes, {
		fields: [programmeSyllabusClasses.instituteId],
		references: [institutes.id]
	}),
	programme: one(programmes, {
		fields: [programmeSyllabusClasses.programmeId],
		references: [programmes.id]
	}),
	programmeSemester: one(programmeSemesters, {
		fields: [programmeSyllabusClasses.semesterId],
		references: [programmeSemesters.id]
	}),
	programmeSyllabusRecordings: many(programmeSyllabusRecordings),
}));

export const subscriptionPaymentsRelations = relations(subscriptionPayments, ({one}) => ({
	institute: one(institutes, {
		fields: [subscriptionPayments.instituteId],
		references: [institutes.id]
	}),
	user: one(users, {
		fields: [subscriptionPayments.reviewedBy],
		references: [users.id]
	}),
	subscription: one(subscriptions, {
		fields: [subscriptionPayments.subscriptionId],
		references: [subscriptions.id]
	}),
}));

export const subscriptionsRelations = relations(subscriptions, ({one, many}) => ({
	subscriptionPayments: many(subscriptionPayments),
	institute: one(institutes, {
		fields: [subscriptions.instituteId],
		references: [institutes.id]
	}),
	plan: one(plans, {
		fields: [subscriptions.planId],
		references: [plans.id]
	}),
}));

export const plansRelations = relations(plans, ({many}) => ({
	subscriptions: many(subscriptions),
}));

export const salariesRelations = relations(salaries, ({one}) => ({
	institute: one(institutes, {
		fields: [salaries.instituteId],
		references: [institutes.id]
	}),
	staff: one(staff, {
		fields: [salaries.staffId],
		references: [staff.id]
	}),
}));

export const enquiriesRelations = relations(enquiries, ({one}) => ({
	batch: one(batches, {
		fields: [enquiries.batchId],
		references: [batches.id]
	}),
	course: one(courses, {
		fields: [enquiries.courseId],
		references: [courses.id]
	}),
	institute: one(institutes, {
		fields: [enquiries.instituteId],
		references: [institutes.id]
	}),
}));

export const routinesRelations = relations(routines, ({one}) => ({
	batch: one(batches, {
		fields: [routines.batchId],
		references: [batches.id]
	}),
	institute: one(institutes, {
		fields: [routines.instituteId],
		references: [institutes.id]
	}),
	staff: one(staff, {
		fields: [routines.teacherId],
		references: [staff.id]
	}),
}));

export const guardianStudentsRelations = relations(guardianStudents, ({one}) => ({
	user: one(users, {
		fields: [guardianStudents.guardianUserId],
		references: [users.id]
	}),
	institute: one(institutes, {
		fields: [guardianStudents.instituteId],
		references: [institutes.id]
	}),
	student: one(students, {
		fields: [guardianStudents.studentId],
		references: [students.id]
	}),
}));

export const enrollmentsRelations = relations(enrollments, ({one}) => ({
	batch: one(batches, {
		fields: [enrollments.batchId],
		references: [batches.id]
	}),
	course: one(courses, {
		fields: [enrollments.courseId],
		references: [courses.id]
	}),
	institute: one(institutes, {
		fields: [enrollments.instituteId],
		references: [institutes.id]
	}),
	programme: one(programmes, {
		fields: [enrollments.programmeId],
		references: [programmes.id]
	}),
	student: one(students, {
		fields: [enrollments.studentId],
		references: [students.id]
	}),
}));

export const homeworkSubmissionsRelations = relations(homeworkSubmissions, ({one}) => ({
	homework: one(homework, {
		fields: [homeworkSubmissions.homeworkId],
		references: [homework.id]
	}),
}));

export const courseClassRecordingsRelations = relations(courseClassRecordings, ({one}) => ({
	courseSyllabusClass: one(courseSyllabusClasses, {
		fields: [courseClassRecordings.courseClassId],
		references: [courseSyllabusClasses.id]
	}),
	institute: one(institutes, {
		fields: [courseClassRecordings.instituteId],
		references: [institutes.id]
	}),
}));

export const programmeSyllabusRecordingsRelations = relations(programmeSyllabusRecordings, ({one}) => ({
	institute: one(institutes, {
		fields: [programmeSyllabusRecordings.instituteId],
		references: [institutes.id]
	}),
	programmeSyllabusClass: one(programmeSyllabusClasses, {
		fields: [programmeSyllabusRecordings.programmeClassId],
		references: [programmeSyllabusClasses.id]
	}),
}));

export const marketingDailyReportsRelations = relations(marketingDailyReports, ({one}) => ({
	institute: one(institutes, {
		fields: [marketingDailyReports.instituteId],
		references: [institutes.id]
	}),
}));

export const marketingAdSpendsRelations = relations(marketingAdSpends, ({one}) => ({
	institute: one(institutes, {
		fields: [marketingAdSpends.instituteId],
		references: [institutes.id]
	}),
}));
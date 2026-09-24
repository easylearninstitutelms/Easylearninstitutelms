import { pgTable, foreignKey, unique, uuid, varchar, timestamp, index, uniqueIndex, date, text, numeric, integer, jsonb, time, pgEnum } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const attendanceStatus = pgEnum("attendance_status", ['PRESENT', 'ABSENT', 'LATE', 'LEAVE'])
export const billingPeriod = pgEnum("billing_period", ['MONTHLY', 'QUARTERLY', 'YEARLY'])
export const dayOfWeek = pgEnum("day_of_week", ['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'])
export const enquiryStatus = pgEnum("enquiry_status", ['NEW', 'CONTACTED', 'INTERESTED', 'ADMITTED', 'NOT_INTERESTED', 'LOST'])
export const expenseCategory = pgEnum("expense_category", ['RENT', 'ELECTRICITY', 'INTERNET', 'SALARY', 'MARKETING', 'STATIONERY', 'EQUIPMENT', 'OTHER'])
export const feeStatus = pgEnum("fee_status", ['PAID', 'PARTIAL', 'DUE', 'WAIVED'])
export const feeType = pgEnum("fee_type", ['ADMISSION', 'COURSE', 'MONTHLY', 'EXAM', 'OTHER'])
export const gender = pgEnum("gender", ['MALE', 'FEMALE', 'OTHER'])
export const instituteStatus = pgEnum("institute_status", ['TRIAL', 'ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED'])
export const notificationType = pgEnum("notification_type", ['FEE_DUE', 'PAYMENT_RECEIVED', 'ATTENDANCE', 'HOMEWORK', 'ASSIGNMENT', 'EXAM', 'RESULT', 'ROUTINE_UPDATE', 'ANNOUNCEMENT', 'TRIAL_ENDING', 'SUBSCRIPTION_EXPIRY', 'GENERAL'])
export const paymentMethod = pgEnum("payment_method", ['CASH', 'BKASH', 'NAGAD', 'ROCKET', 'BANK'])
export const status = pgEnum("status", ['ACTIVE', 'INACTIVE', 'ARCHIVED'])
export const subscriptionPaymentStatus = pgEnum("subscription_payment_status", ['PENDING', 'APPROVED', 'REJECTED'])
export const userRole = pgEnum("user_role", ['SUPER_ADMIN', 'INSTITUTE_ADMIN', 'TEACHER', 'ACCOUNTANT', 'MANAGER', 'RECEPTIONIST', 'STUDENT', 'GUARDIAN', 'STAFF', 'DIGITAL_MARKETER'])


export const passwordResetTokens = pgTable("password_reset_tokens", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	userId: uuid("user_id").notNull(),
	tokenHash: varchar("token_hash", { length: 64 }).notNull(),
	expiresAt: timestamp("expires_at", { mode: 'string' }).notNull(),
	usedAt: timestamp("used_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "password_reset_tokens_user_id_fkey"
		}).onDelete("cascade"),
	unique("password_reset_tokens_token_hash_key").on(table.tokenHash),
]);

export const teacherAssignments = pgTable("teacher_assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	teacherId: uuid("teacher_id").notNull(),
	courseId: uuid("course_id"),
	programmeId: uuid("programme_id"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("teacher_assignments_course_idx").using("btree", table.courseId.asc().nullsLast().op("uuid_ops")),
	index("teacher_assignments_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("teacher_assignments_programme_idx").using("btree", table.programmeId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("teacher_assignments_teacher_unique").using("btree", table.teacherId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "teacher_assignments_course_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "teacher_assignments_institute_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programmeId],
			foreignColumns: [programmes.id],
			name: "teacher_assignments_programme_id_fkey"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [staff.id],
			name: "teacher_assignments_teacher_id_fkey"
		}).onDelete("cascade"),
]);

export const attendance = pgTable("attendance", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	studentId: uuid("student_id").notNull(),
	batchId: uuid("batch_id").notNull(),
	date: date().notNull(),
	status: attendanceStatus().notNull(),
	recordedBy: uuid("recorded_by"),
	note: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	classId: uuid("class_id"),
	classType: varchar("class_type", { length: 20 }),
}, (table) => [
	index("attendance_batch_date_idx").using("btree", table.batchId.asc().nullsLast().op("date_ops"), table.date.asc().nullsLast().op("date_ops")),
	index("attendance_class_idx").using("btree", table.classId.asc().nullsLast().op("uuid_ops")),
	index("attendance_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("attendance_student_batch_date_class_idx").using("btree", table.studentId.asc().nullsLast().op("uuid_ops"), table.batchId.asc().nullsLast().op("uuid_ops"), table.date.asc().nullsLast().op("date_ops"), table.classId.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batches.id],
			name: "attendance_batch_id_batches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "attendance_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.recordedBy],
			foreignColumns: [users.id],
			name: "attendance_recorded_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "attendance_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const assignments = pgTable("assignments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	batchId: uuid("batch_id").notNull(),
	teacherId: uuid("teacher_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	deadline: date(),
	attachmentUrl: text("attachment_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("assignments_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batches.id],
			name: "assignments_batch_id_batches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "assignments_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [staff.id],
			name: "assignments_teacher_id_staff_id_fk"
		}),
]);

export const courses = pgTable("courses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	description: text(),
	duration: varchar({ length: 100 }),
	fee: numeric({ precision: 10, scale:  2 }),
	status: status().default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	courseNo: integer("course_no"),
}, (table) => [
	index("courses_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	uniqueIndex("courses_institute_no_idx").using("btree", table.instituteId.asc().nullsLast().op("int4_ops"), table.courseNo.asc().nullsLast().op("int4_ops")).where(sql`(course_no IS NOT NULL)`),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "courses_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
]);

export const batches = pgTable("batches", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	courseId: uuid("course_id"),
	teacherId: uuid("teacher_id"),
	name: varchar({ length: 255 }).notNull(),
	room: varchar({ length: 100 }),
	startDate: date("start_date"),
	endDate: date("end_date"),
	fee: numeric({ precision: 10, scale:  2 }),
	status: status().default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	programmeId: uuid("programme_id"),
	semesterId: uuid("semester_id"),
	batchNo: integer("batch_no"),
}, (table) => [
	index("batches_course_idx").using("btree", table.courseId.asc().nullsLast().op("uuid_ops")),
	index("batches_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("batches_programme_idx").using("btree", table.programmeId.asc().nullsLast().op("uuid_ops")),
	index("batches_programme_semester_idx").using("btree", table.programmeId.asc().nullsLast().op("uuid_ops"), table.semesterId.asc().nullsLast().op("uuid_ops")),
	index("batches_semester_idx").using("btree", table.semesterId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "batches_course_id_courses_id_fk"
		}),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "batches_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programmeId],
			foreignColumns: [programmes.id],
			name: "batches_programme_id_programmes_id_fk"
		}),
	foreignKey({
			columns: [table.semesterId],
			foreignColumns: [programmeSemesters.id],
			name: "batches_semester_id_programme_semesters_id_fk"
		}),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [staff.id],
			name: "batches_teacher_id_staff_id_fk"
		}),
]);

export const auditLogs = pgTable("audit_logs", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id"),
	actorUserId: uuid("actor_user_id"),
	action: varchar({ length: 100 }).notNull(),
	entityType: varchar("entity_type", { length: 100 }),
	entityId: uuid("entity_id"),
	metadataJson: jsonb("metadata_json"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("audit_logs_actor_idx").using("btree", table.actorUserId.asc().nullsLast().op("uuid_ops")),
	index("audit_logs_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.actorUserId],
			foreignColumns: [users.id],
			name: "audit_logs_actor_user_id_users_id_fk"
		}),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "audit_logs_institute_id_institutes_id_fk"
		}),
]);

export const expenses = pgTable("expenses", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	category: expenseCategory().notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	method: paymentMethod().notNull(),
	description: text(),
	expenseDate: date("expense_date").notNull(),
	addedBy: uuid("added_by"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("expenses_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.addedBy],
			foreignColumns: [users.id],
			name: "expenses_added_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "expenses_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
]);

export const fees = pgTable("fees", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	studentId: uuid("student_id").notNull(),
	feeType: feeType("fee_type").notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	discount: numeric({ precision: 10, scale:  2 }).default('0'),
	dueAmount: numeric("due_amount", { precision: 10, scale:  2 }).notNull(),
	dueDate: date("due_date"),
	status: feeStatus().default('DUE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("fees_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("fees_student_idx").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "fees_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "fees_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const institutes = pgTable("institutes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 255 }).notNull(),
	logoUrl: text("logo_url"),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	address: text(),
	type: varchar({ length: 100 }),
	status: instituteStatus().default('TRIAL').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const notifications = pgTable("notifications", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id"),
	recipientUserId: uuid("recipient_user_id"),
	title: varchar({ length: 255 }).notNull(),
	body: text(),
	type: notificationType().default('GENERAL').notNull(),
	readAt: timestamp("read_at", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("notifications_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("notifications_recipient_idx").using("btree", table.recipientUserId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "notifications_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.recipientUserId],
			foreignColumns: [users.id],
			name: "notifications_recipient_user_id_users_id_fk"
		}),
]);

export const plans = pgTable("plans", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	name: varchar({ length: 100 }).notNull(),
	description: text(),
	price: numeric({ precision: 10, scale:  2 }).notNull(),
	billingPeriod: billingPeriod("billing_period").notNull(),
	limitsJson: jsonb("limits_json"),
	featuresJson: jsonb("features_json"),
	status: status().default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
});

export const payments = pgTable("payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	studentId: uuid("student_id").notNull(),
	feeId: uuid("fee_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	method: paymentMethod().notNull(),
	transactionReference: varchar("transaction_reference", { length: 255 }),
	receiptNumber: varchar("receipt_number", { length: 100 }).notNull(),
	collectedBy: uuid("collected_by"),
	paidAt: timestamp("paid_at", { mode: 'string' }).defaultNow().notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("payments_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("payments_student_idx").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.collectedBy],
			foreignColumns: [users.id],
			name: "payments_collected_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.feeId],
			foreignColumns: [fees.id],
			name: "payments_fee_id_fees_id_fk"
		}),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "payments_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "payments_student_id_students_id_fk"
		}).onDelete("cascade"),
	unique("payments_receipt_institute").on(table.instituteId, table.receiptNumber),
]);

export const results = pgTable("results", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	examId: uuid("exam_id").notNull(),
	examSubjectId: uuid("exam_subject_id"),
	studentId: uuid("student_id").notNull(),
	marks: numeric({ precision: 6, scale:  2 }),
	grade: varchar({ length: 10 }),
	remarks: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("results_exam_student_idx").using("btree", table.examId.asc().nullsLast().op("uuid_ops"), table.studentId.asc().nullsLast().op("uuid_ops")),
	index("results_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.examId],
			foreignColumns: [exams.id],
			name: "results_exam_id_exams_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.examSubjectId],
			foreignColumns: [examSubjects.id],
			name: "results_exam_subject_id_exam_subjects_id_fk"
		}),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "results_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "results_student_id_students_id_fk"
		}).onDelete("cascade"),
]);

export const homework = pgTable("homework", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	batchId: uuid("batch_id"),
	teacherId: uuid("teacher_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	deadline: date(),
	attachmentUrl: text("attachment_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	courseId: uuid("course_id"),
	programmeId: uuid("programme_id"),
	semesterId: uuid("semester_id"),
	courseClassId: uuid("course_class_id"),
	programmeClassId: uuid("programme_class_id"),
}, (table) => [
	index("homework_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batches.id],
			name: "homework_batch_id_batches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.courseClassId],
			foreignColumns: [courseSyllabusClasses.id],
			name: "homework_course_class_id_course_syllabus_classes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "homework_course_id_courses_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "homework_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programmeClassId],
			foreignColumns: [programmeSyllabusClasses.id],
			name: "homework_programme_class_id_programme_syllabus_classes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programmeId],
			foreignColumns: [programmes.id],
			name: "homework_programme_id_programmes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.semesterId],
			foreignColumns: [programmeSemesters.id],
			name: "homework_semester_id_programme_semesters_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [staff.id],
			name: "homework_teacher_id_staff_id_fk"
		}),
]);

export const users = pgTable("users", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id"),
	role: userRole().notNull(),
	name: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }).notNull(),
	passwordHash: varchar("password_hash", { length: 255 }).notNull(),
	status: status().default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	lastLoginAt: timestamp("last_login_at", { mode: 'string' }),
}, (table) => [
	index("users_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "users_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	unique("users_email_unique").on(table.email),
]);

export const subscriptionPayments = pgTable("subscription_payments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	subscriptionId: uuid("subscription_id"),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	method: paymentMethod().notNull(),
	transactionReference: varchar("transaction_reference", { length: 255 }),
	proofUrl: text("proof_url"),
	status: subscriptionPaymentStatus().default('PENDING').notNull(),
	reviewedBy: uuid("reviewed_by"),
	reviewedAt: timestamp("reviewed_at", { mode: 'string' }),
	rejectionReason: text("rejection_reason"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("sub_payments_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "subscription_payments_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.reviewedBy],
			foreignColumns: [users.id],
			name: "subscription_payments_reviewed_by_users_id_fk"
		}),
	foreignKey({
			columns: [table.subscriptionId],
			foreignColumns: [subscriptions.id],
			name: "subscription_payments_subscription_id_subscriptions_id_fk"
		}),
]);

export const subscriptions = pgTable("subscriptions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	planId: uuid("plan_id"),
	status: instituteStatus().default('TRIAL').notNull(),
	trialStart: timestamp("trial_start", { mode: 'string' }),
	trialEnd: timestamp("trial_end", { mode: 'string' }),
	startDate: timestamp("start_date", { mode: 'string' }),
	endDate: timestamp("end_date", { mode: 'string' }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("subscriptions_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "subscriptions_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.planId],
			foreignColumns: [plans.id],
			name: "subscriptions_plan_id_plans_id_fk"
		}),
]);

export const staff = pgTable("staff", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	userId: uuid("user_id"),
	name: varchar({ length: 255 }).notNull(),
	photoUrl: text("photo_url"),
	phone: varchar({ length: 20 }),
	email: varchar({ length: 255 }),
	designation: varchar({ length: 100 }),
	joiningDate: date("joining_date"),
	salary: numeric({ precision: 10, scale:  2 }),
	status: status().default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	deletedAt: timestamp("deleted_at", { mode: 'string' }),
}, (table) => [
	index("staff_deleted_idx").using("btree", table.instituteId.asc().nullsLast().op("timestamp_ops"), table.deletedAt.asc().nullsLast().op("timestamp_ops")),
	index("staff_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "staff_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "staff_user_id_users_id_fk"
		}),
]);

export const salaries = pgTable("salaries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	staffId: uuid("staff_id").notNull(),
	month: varchar({ length: 7 }).notNull(),
	basic: numeric({ precision: 10, scale:  2 }).notNull(),
	bonus: numeric({ precision: 10, scale:  2 }).default('0'),
	deduction: numeric({ precision: 10, scale:  2 }).default('0'),
	payable: numeric({ precision: 10, scale:  2 }).notNull(),
	paid: numeric({ precision: 10, scale:  2 }).default('0'),
	due: numeric({ precision: 10, scale:  2 }).default('0'),
	paymentDate: date("payment_date"),
	method: paymentMethod(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("salaries_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "salaries_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.staffId],
			foreignColumns: [staff.id],
			name: "salaries_staff_id_staff_id_fk"
		}).onDelete("cascade"),
	unique("salaries_staff_month").on(table.staffId, table.month),
]);

export const programmeSemesters = pgTable("programme_semesters", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	programmeId: uuid("programme_id").notNull(),
	semesterNo: integer("semester_no").notNull(),
	name: varchar({ length: 100 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("programme_semesters_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("programme_semesters_programme_idx").using("btree", table.programmeId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "programme_semesters_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programmeId],
			foreignColumns: [programmes.id],
			name: "programme_semesters_programme_id_programmes_id_fk"
		}).onDelete("cascade"),
	unique("programme_semesters_programme_no_unique").on(table.programmeId, table.semesterNo),
]);

export const enquiries = pgTable("enquiries", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	phone: varchar({ length: 20 }),
	courseId: uuid("course_id"),
	batchId: uuid("batch_id"),
	source: varchar({ length: 100 }),
	notes: text(),
	followUpDate: date("follow_up_date"),
	status: enquiryStatus().default('NEW').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("enquiries_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batches.id],
			name: "enquiries_batch_id_batches_id_fk"
		}),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "enquiries_course_id_courses_id_fk"
		}),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "enquiries_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
]);

export const examSubjects = pgTable("exam_subjects", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	examId: uuid("exam_id").notNull(),
	subjectName: varchar("subject_name", { length: 255 }).notNull(),
	totalMarks: integer("total_marks").notNull(),
}, (table) => [
	index("exam_subjects_exam_idx").using("btree", table.examId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.examId],
			foreignColumns: [exams.id],
			name: "exam_subjects_exam_id_exams_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "exam_subjects_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
]);

export const routines = pgTable("routines", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	batchId: uuid("batch_id").notNull(),
	teacherId: uuid("teacher_id"),
	dayOfWeek: dayOfWeek("day_of_week").notNull(),
	startTime: time("start_time").notNull(),
	endTime: time("end_time").notNull(),
	topic: varchar({ length: 255 }),
	room: varchar({ length: 100 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("routines_batch_idx").using("btree", table.batchId.asc().nullsLast().op("uuid_ops")),
	index("routines_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batches.id],
			name: "routines_batch_id_batches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "routines_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.teacherId],
			foreignColumns: [staff.id],
			name: "routines_teacher_id_staff_id_fk"
		}),
]);

export const guardianStudents = pgTable("guardian_students", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	guardianUserId: uuid("guardian_user_id").notNull(),
	studentId: uuid("student_id").notNull(),
	relation: varchar({ length: 50 }),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("guardian_students_guardian_idx").using("btree", table.guardianUserId.asc().nullsLast().op("uuid_ops")),
	index("guardian_students_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("guardian_students_student_idx").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.guardianUserId],
			foreignColumns: [users.id],
			name: "guardian_students_guardian_user_id_users_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "guardian_students_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "guardian_students_student_id_students_id_fk"
		}).onDelete("cascade"),
	unique("guardian_students_guardian_student_unique").on(table.guardianUserId, table.studentId),
]);

export const students = pgTable("students", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	studentId: varchar("student_id", { length: 50 }).notNull(),
	name: varchar({ length: 255 }).notNull(),
	photoUrl: text("photo_url"),
	phone: varchar({ length: 20 }),
	guardianName: varchar("guardian_name", { length: 255 }),
	guardianPhone: varchar("guardian_phone", { length: 20 }),
	address: text(),
	dob: date(),
	gender: gender(),
	admissionDate: date("admission_date").notNull(),
	status: status().default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	userId: uuid("user_id"),
}, (table) => [
	index("students_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("students_user_idx").using("btree", table.userId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "students_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "students_user_id_users_id_fk"
		}).onDelete("set null"),
	unique("students_institute_student_id").on(table.instituteId, table.studentId),
	unique("students_user_id_unique").on(table.userId),
]);

export const programmes = pgTable("programmes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	name: varchar({ length: 255 }).notNull(),
	code: varchar({ length: 50 }),
	description: text(),
	duration: varchar({ length: 100 }),
	status: status().default('ACTIVE').notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
	programmeNo: integer("programme_no"),
}, (table) => [
	index("programmes_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "programmes_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	unique("programmes_institute_name_unique").on(table.instituteId, table.name),
]);

export const exams = pgTable("exams", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	batchId: uuid("batch_id"),
	name: varchar({ length: 255 }).notNull(),
	examDate: date("exam_date"),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	programmeId: uuid("programme_id"),
	semesterId: uuid("semester_id"),
	courseId: uuid("course_id"),
	courseClassId: uuid("course_class_id"),
	programmeClassId: uuid("programme_class_id"),
}, (table) => [
	index("exams_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("exams_programme_semester_idx").using("btree", table.programmeId.asc().nullsLast().op("uuid_ops"), table.semesterId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batches.id],
			name: "exams_batch_id_batches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "exams_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programmeId],
			foreignColumns: [programmes.id],
			name: "exams_programme_id_programmes_id_fk"
		}),
	foreignKey({
			columns: [table.semesterId],
			foreignColumns: [programmeSemesters.id],
			name: "exams_semester_id_programme_semesters_id_fk"
		}),
]);

export const enrollments = pgTable("enrollments", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	studentId: uuid("student_id").notNull(),
	batchId: uuid("batch_id"),
	enrollmentDate: date("enrollment_date").notNull(),
	status: status().default('ACTIVE').notNull(),
	courseId: uuid("course_id"),
	programmeId: uuid("programme_id"),
}, (table) => [
	index("enrollments_batch_idx").using("btree", table.batchId.asc().nullsLast().op("uuid_ops")),
	index("enrollments_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.batchId],
			foreignColumns: [batches.id],
			name: "enrollments_batch_id_batches_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "enrollments_course_id_courses_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "enrollments_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programmeId],
			foreignColumns: [programmes.id],
			name: "enrollments_programme_id_programmes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.studentId],
			foreignColumns: [students.id],
			name: "enrollments_student_id_students_id_fk"
		}).onDelete("cascade"),
	unique("enrollments_student_batch").on(table.studentId, table.batchId),
]);

export const programmeSyllabusClasses = pgTable("programme_syllabus_classes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	programmeId: uuid("programme_id").notNull(),
	semesterId: uuid("semester_id"),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	orderNo: integer("order_no").default(0),
	classNo: integer("class_no"),
	scheduledDate: date("scheduled_date"),
	startTime: time("start_time"),
	endTime: time("end_time"),
	status: varchar({ length: 20 }).default('UPCOMING').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("programme_syllabus_classes_programme_idx").using("btree", table.programmeId.asc().nullsLast().op("uuid_ops")),
	index("programme_syllabus_classes_semester_idx").using("btree", table.semesterId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "programme_syllabus_classes_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programmeId],
			foreignColumns: [programmes.id],
			name: "programme_syllabus_classes_programme_id_programmes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.semesterId],
			foreignColumns: [programmeSemesters.id],
			name: "programme_syllabus_classes_semester_id_programme_semesters_id_f"
		}).onDelete("cascade"),
]);

export const courseSyllabusClasses = pgTable("course_syllabus_classes", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	courseId: uuid("course_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	description: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	orderNo: integer("order_no").default(0),
	classNo: integer("class_no"),
	scheduledDate: date("scheduled_date"),
	startTime: time("start_time"),
	endTime: time("end_time"),
	status: varchar({ length: 20 }).default('UPCOMING').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("course_syllabus_course_class_no_idx").using("btree", table.courseId.asc().nullsLast().op("int4_ops"), table.classNo.asc().nullsLast().op("int4_ops")).where(sql`(class_no IS NOT NULL)`),
	foreignKey({
			columns: [table.courseId],
			foreignColumns: [courses.id],
			name: "course_syllabus_classes_course_id_courses_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "course_syllabus_classes_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
]);

export const homeworkSubmissions = pgTable("homework_submissions", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	homeworkId: uuid("homework_id").notNull(),
	studentId: uuid("student_id").notNull(),
	answer: text(),
	attachmentUrl: text("attachment_url"),
	submittedAt: timestamp("submitted_at", { mode: 'string' }).defaultNow().notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	uniqueIndex("homework_submissions_homework_student_idx").using("btree", table.homeworkId.asc().nullsLast().op("uuid_ops"), table.studentId.asc().nullsLast().op("uuid_ops")),
	index("homework_submissions_institute_idx").using("btree", table.instituteId.asc().nullsLast().op("uuid_ops")),
	index("homework_submissions_student_idx").using("btree", table.studentId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.homeworkId],
			foreignColumns: [homework.id],
			name: "homework_submissions_homework_id_fkey"
		}).onDelete("cascade"),
]);

export const courseClassRecordings = pgTable("course_class_recordings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	courseClassId: uuid("course_class_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	videoUrl: text("video_url").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	duration: varchar({ length: 50 }),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.courseClassId],
			foreignColumns: [courseSyllabusClasses.id],
			name: "course_class_recordings_course_class_id_course_syllabus_classes"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "course_class_recordings_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
]);

export const programmeSyllabusRecordings = pgTable("programme_syllabus_recordings", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	programmeClassId: uuid("programme_class_id").notNull(),
	title: varchar({ length: 255 }).notNull(),
	videoUrl: text("video_url").notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "programme_syllabus_recordings_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
	foreignKey({
			columns: [table.programmeClassId],
			foreignColumns: [programmeSyllabusClasses.id],
			name: "programme_syllabus_recordings_programme_class_id_programme_syll"
		}).onDelete("cascade"),
]);

export const marketingDailyReports = pgTable("marketing_daily_reports", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	instituteId: uuid("institute_id").notNull(),
	reportDate: date("report_date").notNull(),
	leadsGenerated: integer("leads_generated").default(0).notNull(),
	conversions: integer().default(0).notNull(),
	notes: text(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	staffId: uuid("staff_id"),
	summary: text(),
	tasksCompleted: text("tasks_completed"),
	postsCount: integer("posts_count").default(0).notNull(),
	videosCount: integer("videos_count").default(0).notNull(),
	creativesCount: integer("creatives_count").default(0).notNull(),
	leadsCount: integer("leads_count").default(0).notNull(),
	enrollmentsCount: integer("enrollments_count").default(0).notNull(),
	messagesCount: integer("messages_count").default(0).notNull(),
	callsCount: integer("calls_count").default(0).notNull(),
	websiteVisits: integer("website_visits").default(0).notNull(),
	impressions: integer().default(0).notNull(),
	clicks: integer().default(0).notNull(),
	budget: numeric({ precision: 12, scale:  2 }).default('0').notNull(),
	budgetSpent: numeric("budget_spent", { precision: 12, scale:  2 }).default('0').notNull(),
	updatedAt: timestamp("updated_at", { mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("marketing_reports_institute_date_idx").using("btree", table.instituteId.asc().nullsLast().op("date_ops"), table.reportDate.asc().nullsLast().op("date_ops")),
	uniqueIndex("marketing_reports_staff_date_unique").using("btree", table.staffId.asc().nullsLast().op("date_ops"), table.reportDate.asc().nullsLast().op("date_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "marketing_daily_reports_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
]);

export const marketingAdSpends = pgTable("marketing_ad_spends", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	platform: varchar({ length: 100 }).notNull(),
	amount: numeric({ precision: 10, scale:  2 }).notNull(),
	createdAt: timestamp("created_at", { mode: 'string' }).defaultNow().notNull(),
	instituteId: uuid("institute_id").notNull(),
	spendDate: date("spend_date").notNull(),
	reportId: uuid("report_id"),
	campaignName: varchar("campaign_name", { length: 255 }),
	leadsCount: integer("leads_count").default(0).notNull(),
	clicks: integer().default(0).notNull(),
	impressions: integer().default(0).notNull(),
	enrollmentsCount: integer("enrollments_count").default(0).notNull(),
	note: text(),
}, (table) => [
	index("marketing_ads_institute_date_idx").using("btree", table.instituteId.asc().nullsLast().op("date_ops"), table.spendDate.asc().nullsLast().op("date_ops")),
	index("marketing_ads_report_idx").using("btree", table.reportId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.instituteId],
			foreignColumns: [institutes.id],
			name: "marketing_ad_spends_institute_id_institutes_id_fk"
		}).onDelete("cascade"),
]);

import {
  pgTable,
  uuid,
  varchar,
  text,
  integer,
  numeric,
  boolean,
  timestamp,
  date,
  time,
  jsonb,
  pgEnum,
  unique,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const instituteStatusEnum = pgEnum("institute_status", [
  "TRIAL",
  "ACTIVE",
  "EXPIRED",
  "SUSPENDED",
  "CANCELLED",
]);

export const userRoleEnum = pgEnum("user_role", [
  "SUPER_ADMIN",
  "INSTITUTE_ADMIN",
  "TEACHER",
  "ACCOUNTANT",
  "MANAGER",
  "RECEPTIONIST",
  "STUDENT",
  "GUARDIAN",
  "STAFF",
  "DIGITAL_MARKETER",
  "ADMIN",
  "INSTITUTE",
]);

export const genderEnum = pgEnum("gender", [
  "MALE",
  "FEMALE",
  "OTHER",
]);

export const statusEnum = pgEnum("status", [
  "ACTIVE",
  "INACTIVE",
  "PENDING",
  "SUSPENDED",
  "COMPLETED",
  "ARCHIVED",
  "TRIAL",
]);

export const attendanceStatusEnum = pgEnum("attendance_status", [
  "PRESENT",
  "ABSENT",
  "LATE",
  "LEAVE",
  "EXCUSED",
]);

export const feeTypeEnum = pgEnum("fee_type", [
  "ADMISSION",
  "COURSE",
  "MONTHLY",
  "EXAM",
  "OTHER",
]);

export const feeStatusEnum = pgEnum("fee_status", [
  "PAID",
  "PARTIAL",
  "DUE",
  "WAIVED",
]);

export const paymentMethodEnum = pgEnum("payment_method", [
  "CASH",
  "BKASH",
  "NAGAD",
  "ROCKET",
  "BANK",
  "ONLINE",
]);

export const enquiryStatusEnum = pgEnum("enquiry_status", [
  "NEW",
  "CONTACTED",
  "INTERESTED",
  "ADMITTED",
  "NOT_INTERESTED",
  "LOST",
  "ACTIVE",
  "INACTIVE",
  "PENDING",
  "SUSPENDED",
  "COMPLETED",
]);

export const subscriptionPaymentStatusEnum = pgEnum(
  "subscription_payment_status",
  ["PENDING", "APPROVED", "REJECTED"]
);

export const notificationTypeEnum = pgEnum("notification_type", [
  "FEE_DUE",
  "PAYMENT_RECEIVED",
  "ATTENDANCE",
  "HOMEWORK",
  "ASSIGNMENT",
  "EXAM",
  "RESULT",
  "ROUTINE_UPDATE",
  "ANNOUNCEMENT",
  "TRIAL_ENDING",
  "SUBSCRIPTION_EXPIRY",
  "GENERAL",
]);

export const expenseCategoryEnum = pgEnum("expense_category", [
  "RENT",
  "ELECTRICITY",
  "INTERNET",
  "SALARY",
  "MARKETING",
  "STATIONERY",
  "EQUIPMENT",
  "OTHER",
]);

export const billingPeriodEnum = pgEnum("billing_period", [
  "MONTHLY",
  "QUARTERLY",
  "YEARLY",
]);

export const dayOfWeekEnum = pgEnum("day_of_week", [
  "SATURDAY",
  "SUNDAY",
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
]);

// ─── Plans ───────────────────────────────────────────────────────────────────

export const plans = pgTable("plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  billingPeriod: billingPeriodEnum("billing_period").default("MONTHLY"),
  durationDays: integer("duration_days").default(30),
  limitsJson: jsonb("limits_json"),
  featuresJson: jsonb("features_json"),
  status: statusEnum("status").notNull().default("ACTIVE"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Institutes ──────────────────────────────────────────────────────────────

export const institutes = pgTable("institutes", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  logoUrl: text("logo_url"),
  phone: varchar("phone", { length: 20 }),
  email: varchar("email", { length: 255 }),
  address: text("address"),
  type: varchar("type", { length: 100 }),
  website: varchar("website", { length: 255 }),
  status: statusEnum("status").notNull().default("TRIAL"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Users ───────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id").references(() => institutes.id, {
      onDelete: "cascade",
    }),
    role: userRoleEnum("role").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }).notNull(),
    passwordHash: varchar("password_hash", { length: 255 }).default(""),
    status: statusEnum("status").notNull().default("ACTIVE"),
    lastLoginAt: timestamp("last_login_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("users_institute_idx").on(t.instituteId),
    unique("users_email_unique").on(t.email),
  ]
);

// ─── Subscriptions ───────────────────────────────────────────────────────────

export const subscriptions = pgTable(
  "subscriptions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    planId: uuid("plan_id").references(() => plans.id),
    status: statusEnum("status").notNull().default("TRIAL"),
    trialStart: timestamp("trial_start"),
    trialEnd: timestamp("trial_end"),
    startDate: timestamp("start_date"),
    endDate: timestamp("end_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("subscriptions_institute_idx").on(t.instituteId)]
);

// ─── Subscription Payments ──────────────────────────────────────────────────

export const subscriptionPayments = pgTable(
  "subscription_payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    method: paymentMethodEnum("method").notNull(),
    transactionReference: varchar("transaction_reference", { length: 255 }),
    proofUrl: text("proof_url"),
    status: subscriptionPaymentStatusEnum("status").notNull().default("PENDING"),
    reviewedBy: uuid("reviewed_by").references(() => users.id),
    reviewedAt: timestamp("reviewed_at"),
    rejectionReason: text("rejection_reason"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("sub_payments_institute_idx").on(t.instituteId)]
);

// ─── Students ────────────────────────────────────────────────────────────────

export const students = pgTable(
  "students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    studentId: varchar("student_id", { length: 50 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    photoUrl: text("photo_url"),
    phone: varchar("phone", { length: 20 }),
    guardianName: varchar("guardian_name", { length: 255 }),
    guardianPhone: varchar("guardian_phone", { length: 20 }),
    address: text("address"),
    dob: date("dob"),
    gender: genderEnum("gender"),
    admissionDate: date("admission_date").notNull(),
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("students_institute_student_id").on(t.instituteId, t.studentId),
    unique("students_user_id_unique").on(t.userId),
    index("students_institute_idx").on(t.instituteId),
    index("students_user_idx").on(t.userId),
  ]
);

// ─── Staff ───────────────────────────────────────────────────────────────────

export const staff = pgTable(
  "staff",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    userId: uuid("user_id").references(() => users.id),
    name: varchar("name", { length: 255 }).notNull(),
    photoUrl: text("photo_url"),
    phone: varchar("phone", { length: 20 }),
    email: varchar("email", { length: 255 }),
    designation: varchar("designation", { length: 100 }),
    joiningDate: date("joining_date"),
    salary: numeric("salary", { precision: 10, scale: 2 }),
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    deletedAt: timestamp("deleted_at"),
  },
  (t) => [
    index("staff_institute_idx").on(t.instituteId),
    index("staff_deleted_idx").on(t.instituteId, t.deletedAt),
  ]
);

// ─── Teacher Academic Assignments ─────────────────────────────────────────────

export const teacherAssignments = pgTable(
  "teacher_assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
    programmeId: uuid("programme_id").references(() => programmes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("teacher_assignments_teacher_unique").on(t.teacherId),
    index("teacher_assignments_institute_idx").on(t.instituteId),
    index("teacher_assignments_course_idx").on(t.courseId),
    index("teacher_assignments_programme_idx").on(t.programmeId),
  ]
);

// ─── Programmes ──────────────────────────────────────────────────────────────

export const programmes = pgTable(
  "programmes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    programmeNo: integer("programme_no"),
    name: varchar("name", { length: 255 }).notNull(),
    code: varchar("code", { length: 50 }),
    description: text("description"),
    duration: varchar("duration", { length: 100 }),
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    unique("programmes_institute_name_unique").on(t.instituteId, t.name),
    index("programmes_institute_idx").on(t.instituteId),
  ]
);

export const programmeSemesters = pgTable(
  "programme_semesters",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    programmeId: uuid("programme_id")
      .notNull()
      .references(() => programmes.id, { onDelete: "cascade" }),
    semesterNo: integer("semester_no").notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    unique("programme_semesters_programme_no_unique").on(t.programmeId, t.semesterNo),
    index("programme_semesters_institute_idx").on(t.instituteId),
    index("programme_semesters_programme_idx").on(t.programmeId),
  ]
);

// ─── Courses ─────────────────────────────────────────────────────────────────

export const courses = pgTable(
  "courses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    courseNo: integer("course_no"),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),
    duration: varchar("duration", { length: 100 }),
    fee: numeric("fee", { precision: 10, scale: 2 }),
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("courses_institute_idx").on(t.instituteId)]
);

// ─── Syllabus & Classes Tables ────────────────────────────────────────────────

export const courseSyllabusClasses = pgTable("course_syllabus_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: "cascade" }),
  courseId: uuid("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
  classNo: integer("class_no"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scheduledDate: date("scheduled_date"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  status: varchar("status", { length: 20 }).notNull().default("UPCOMING"),
  orderNo: integer("order_no").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const programmeSyllabusClasses = pgTable("programme_syllabus_classes", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: "cascade" }),
  programmeId: uuid("programme_id").notNull().references(() => programmes.id, { onDelete: "cascade" }),
  semesterId: uuid("semester_id").references(() => programmeSemesters.id, { onDelete: "cascade" }),
  classNo: integer("class_no"),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  scheduledDate: date("scheduled_date"),
  startTime: time("start_time"),
  endTime: time("end_time"),
  status: varchar("status", { length: 20 }).notNull().default("UPCOMING"),
  orderNo: integer("order_no").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const courseClassRecordings = pgTable("course_class_recordings", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: "cascade" }),
  courseClassId: uuid("course_class_id").notNull().references(() => courseSyllabusClasses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  videoUrl: text("video_url").notNull(),
  duration: varchar("duration", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const programmeSyllabusRecordings = pgTable("programme_syllabus_recordings", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: "cascade" }),
  programmeClassId: uuid("programme_class_id").notNull().references(() => programmeSyllabusClasses.id, { onDelete: "cascade" }),
  title: varchar("title", { length: 255 }).notNull(),
  videoUrl: text("video_url").notNull(),
  duration: varchar("duration", { length: 50 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Batches ─────────────────────────────────────────────────────────────────

export const batches = pgTable(
  "batches",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    batchNo: integer("batch_no"),
    courseId: uuid("course_id").references(() => courses.id),
    teacherId: uuid("teacher_id").references(() => staff.id),
    programmeId: uuid("programme_id").references(() => programmes.id),
    semesterId: uuid("semester_id").references(() => programmeSemesters.id),
    name: varchar("name", { length: 255 }).notNull(),
    room: varchar("room", { length: 100 }),
    startDate: date("start_date"),
    endDate: date("end_date"),
    fee: numeric("fee", { precision: 10, scale: 2 }),
    status: statusEnum("status").notNull().default("ACTIVE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("batches_institute_idx").on(t.instituteId),
    index("batches_programme_semester_idx").on(t.programmeId, t.semesterId),
  ]
);

// ─── Enrollments ─────────────────────────────────────────────────────────────

export const enrollments = pgTable(
  "enrollments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => batches.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
    programmeId: uuid("programme_id").references(() => programmes.id, { onDelete: "cascade" }),
    enrollmentDate: date("enrollment_date").notNull(),
    status: statusEnum("status").notNull().default("ACTIVE"),
  },
  (t) => [
    unique("enrollments_student_batch").on(t.studentId, t.batchId),
    index("enrollments_institute_idx").on(t.instituteId),
    index("enrollments_batch_idx").on(t.batchId),
  ]
);

// ─── Guardian ↔ Student Links ────────────────────────────────────────────────

export const guardianStudents = pgTable(
  "guardian_students",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    guardianUserId: uuid("guardian_user_id")
      .references(() => users.id, { onDelete: "cascade" }),
    guardianId: uuid("guardian_id").references(() => users.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    relation: varchar("relation", { length: 50 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("guardian_students_institute_idx").on(t.instituteId),
    index("guardian_students_guardian_idx").on(t.guardianUserId),
    index("guardian_students_student_idx").on(t.studentId),
  ]
);

// ─── Attendance ──────────────────────────────────────────────────────────────

export const attendance = pgTable(
  "attendance",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    classId: uuid("class_id"),
    classType: varchar("class_type", { length: 20 }),
    date: date("date").notNull(),
    attendanceDate: date("attendance_date"),
    status: attendanceStatusEnum("status").notNull(),
    recordedBy: uuid("recorded_by").references(() => users.id),
    remarks: text("remarks"),
    note: text("note"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("attendance_institute_idx").on(t.instituteId),
    index("attendance_batch_date_idx").on(t.batchId, t.date),
  ]
);

// ─── Fees ────────────────────────────────────────────────────────────────────

export const fees = pgTable(
  "fees",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    feeType: feeTypeEnum("fee_type").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    discount: numeric("discount", { precision: 10, scale: 2 }).default("0"),
    dueAmount: numeric("due_amount", { precision: 10, scale: 2 }).default("0"),
    dueDate: date("due_date"),
    status: feeStatusEnum("status").notNull().default("DUE"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("fees_institute_idx").on(t.instituteId),
    index("fees_student_idx").on(t.studentId),
  ]
);

// ─── Payments ────────────────────────────────────────────────────────────────

export const payments = pgTable(
  "payments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    feeId: uuid("fee_id").references(() => fees.id),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    paymentDate: date("payment_date"),
    method: paymentMethodEnum("method").notNull(),
    transactionReference: varchar("transaction_reference", { length: 255 }),
    receiptNumber: varchar("receipt_number", { length: 100 }),
    collectedBy: uuid("collected_by").references(() => users.id),
    paidAt: timestamp("paid_at").defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("payments_institute_idx").on(t.instituteId),
    index("payments_student_idx").on(t.studentId),
  ]
);

// ─── Expenses & Marketing ────────────────────────────────────────────────────

export const expenses = pgTable(
  "expenses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    category: expenseCategoryEnum("category").notNull(),
    title: varchar("title", { length: 255 }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    method: paymentMethodEnum("method").notNull().default("CASH"),
    description: text("description"),
    expenseDate: date("expense_date").notNull(),
    addedBy: uuid("added_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("expenses_institute_idx").on(t.instituteId)]
);

export const marketingDailyReports = pgTable("marketing_daily_reports", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: "cascade" }),
  reportDate: date("report_date").notNull(),
  leadsGenerated: integer("leads_generated").default(0),
  conversions: integer("conversions").default(0),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const marketingAdSpends = pgTable("marketing_ad_spends", {
  id: uuid("id").primaryKey().defaultRandom(),
  instituteId: uuid("institute_id").notNull().references(() => institutes.id, { onDelete: "cascade" }),
  platform: varchar("platform", { length: 100 }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  spendDate: date("spend_date").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ─── Salaries ────────────────────────────────────────────────────────────────

export const salaries = pgTable(
  "salaries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    staffId: uuid("staff_id")
      .notNull()
      .references(() => staff.id, { onDelete: "cascade" }),
    month: varchar("month", { length: 20 }).notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }),
    basic: numeric("basic", { precision: 10, scale: 2 }).default("0"),
    bonus: numeric("bonus", { precision: 10, scale: 2 }).default("0"),
    deduction: numeric("deduction", { precision: 10, scale: 2 }).default("0"),
    payable: numeric("payable", { precision: 10, scale: 2 }).default("0"),
    paid: numeric("paid", { precision: 10, scale: 2 }).default("0"),
    due: numeric("due", { precision: 10, scale: 2 }).default("0"),
    notes: text("notes"),
    paymentDate: date("payment_date"),
    method: paymentMethodEnum("method"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("salaries_institute_idx").on(t.instituteId),
  ]
);

// ─── Routines ────────────────────────────────────────────────────────────────

export const routines = pgTable(
  "routines",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id")
      .notNull()
      .references(() => batches.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => staff.id),
    dayOfWeek: dayOfWeekEnum("day_of_week").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    topic: varchar("topic", { length: 255 }),
    room: varchar("room", { length: 100 }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("routines_institute_idx").on(t.instituteId),
    index("routines_batch_idx").on(t.batchId),
  ]
);

// ─── Homework ────────────────────────────────────────────────────────────────

export const homework = pgTable(
  "homework",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => batches.id, { onDelete: "cascade" }),
    courseId: uuid("course_id").references(() => courses.id, { onDelete: "cascade" }),
    programmeId: uuid("programme_id").references(() => programmes.id, { onDelete: "cascade" }),
    semesterId: uuid("semester_id").references(() => programmeSemesters.id, { onDelete: "cascade" }),
    courseClassId: uuid("course_class_id").references(() => courseSyllabusClasses.id, { onDelete: "cascade" }),
    programmeClassId: uuid("programme_class_id").references(() => programmeSyllabusClasses.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => staff.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    deadline: date("deadline"),
    attachmentUrl: text("attachment_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("homework_institute_idx").on(t.instituteId)]
);

// ─── Assignments ─────────────────────────────────────────────────────────────

export const assignments = pgTable(
  "assignments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => batches.id, { onDelete: "cascade" }),
    teacherId: uuid("teacher_id").references(() => staff.id),
    title: varchar("title", { length: 255 }).notNull(),
    description: text("description"),
    deadline: date("deadline"),
    attachmentUrl: text("attachment_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("assignments_institute_idx").on(t.instituteId)]
);

// ─── Exams ───────────────────────────────────────────────────────────────────

export const exams = pgTable(
  "exams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    batchId: uuid("batch_id").references(() => batches.id, { onDelete: "cascade" }),
    programmeId: uuid("programme_id").references(() => programmes.id),
    semesterId: uuid("semester_id").references(() => programmeSemesters.id),
    courseId: uuid("course_id").references(() => courses.id),
    name: varchar("name", { length: 255 }).notNull(),
    examDate: date("exam_date"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("exams_institute_idx").on(t.instituteId),
    index("exams_programme_semester_idx").on(t.programmeId, t.semesterId),
  ]
);

// ─── Exam Subjects ───────────────────────────────────────────────────────────

export const examSubjects = pgTable(
  "exam_subjects",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id").references(() => institutes.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    subjectName: varchar("subject_name", { length: 255 }).notNull(),
    totalMarks: numeric("total_marks").notNull().default("100"),
    passMarks: numeric("pass_marks").default("40"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("exam_subjects_exam_idx").on(t.examId)]
);

// ─── Results ─────────────────────────────────────────────────────────────────

export const results = pgTable(
  "results",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    examId: uuid("exam_id")
      .notNull()
      .references(() => exams.id, { onDelete: "cascade" }),
    examSubjectId: uuid("exam_subject_id").references(() => examSubjects.id),
    studentId: uuid("student_id")
      .notNull()
      .references(() => students.id, { onDelete: "cascade" }),
    marks: numeric("marks", { precision: 6, scale: 2 }),
    grade: varchar("grade", { length: 10 }),
    remarks: text("remarks"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("results_institute_idx").on(t.instituteId),
    index("results_exam_student_idx").on(t.examId, t.studentId),
  ]
);

// ─── Enquiries ────────────────────────────────────────────────────────────────

export const enquiries = pgTable(
  "enquiries",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id")
      .notNull()
      .references(() => institutes.id, { onDelete: "cascade" }),
    name: varchar("name", { length: 255 }).notNull(),
    phone: varchar("phone", { length: 20 }),
    course: varchar("course", { length: 255 }),
    courseId: uuid("course_id").references(() => courses.id),
    batchId: uuid("batch_id").references(() => batches.id),
    source: varchar("source", { length: 100 }),
    notes: text("notes"),
    message: text("message"),
    followUpDate: date("follow_up_date"),
    status: enquiryStatusEnum("status").notNull().default("NEW"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("enquiries_institute_idx").on(t.instituteId)]
);

// ─── Notifications ───────────────────────────────────────────────────────────

export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id").references(() => institutes.id, { onDelete: "cascade" }),
    recipientUserId: uuid("recipient_user_id").references(() => users.id),
    userId: uuid("user_id").references(() => users.id),
    title: varchar("title", { length: 255 }).notNull(),
    body: text("body"),
    message: text("message"),
    type: notificationTypeEnum("type").notNull().default("GENERAL"),
    isRead: boolean("is_read").default(false),
    readAt: timestamp("read_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("notifications_institute_idx").on(t.instituteId),
    index("notifications_recipient_idx").on(t.recipientUserId),
  ]
);

// ─── Audit Logs ──────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    instituteId: uuid("institute_id").references(() => institutes.id),
    actorUserId: uuid("actor_user_id").references(() => users.id),
    action: varchar("action", { length: 100 }).notNull(),
    entityType: varchar("entity_type", { length: 100 }),
    entityId: uuid("entity_id"),
    metadataJson: jsonb("metadata_json"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("audit_logs_institute_idx").on(t.instituteId),
    index("audit_logs_actor_idx").on(t.actorUserId),
  ]
);

// ─── Relations ────────────────────────────────────────────────────────────────

export const institutesRelations = relations(institutes, ({ many }) => ({
  users: many(users),
  students: many(students),
  staff: many(staff),
  guardianStudents: many(guardianStudents),
  courses: many(courses),
  programmes: many(programmes),
  batches: many(batches),
  subscriptions: many(subscriptions),
  fees: many(fees),
  payments: many(payments),
  expenses: many(expenses),
  enquiries: many(enquiries),
  notifications: many(notifications),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [users.instituteId],
    references: [institutes.id],
  }),
  studentProfile: one(students, {
    fields: [users.id],
    references: [students.userId],
  }),
  guardianStudents: many(guardianStudents),
}));

export const studentsRelations = relations(students, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [students.instituteId],
    references: [institutes.id],
  }),
  user: one(users, {
    fields: [students.userId],
    references: [users.id],
  }),
  enrollments: many(enrollments),
  attendance: many(attendance),
  fees: many(fees),
  payments: many(payments),
  results: many(results),
  guardianStudents: many(guardianStudents),
}));

export const guardianStudentsRelations = relations(guardianStudents, ({ one }) => ({
  institute: one(institutes, {
    fields: [guardianStudents.instituteId],
    references: [institutes.id],
  }),
  guardianUser: one(users, {
    fields: [guardianStudents.guardianUserId],
    references: [users.id],
  }),
  student: one(students, {
    fields: [guardianStudents.studentId],
    references: [students.id],
  }),
}));

export const staffRelations = relations(staff, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [staff.instituteId],
    references: [institutes.id],
  }),
  user: one(users, {
    fields: [staff.userId],
    references: [users.id],
  }),
  batches: many(batches),
  salaries: many(salaries),
  routines: many(routines),
}));

export const programmesRelations = relations(programmes, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [programmes.instituteId],
    references: [institutes.id],
  }),
  semesters: many(programmeSemesters),
  batches: many(batches),
  exams: many(exams),
}));

export const programmeSemestersRelations = relations(programmeSemesters, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [programmeSemesters.instituteId],
    references: [institutes.id],
  }),
  programme: one(programmes, {
    fields: [programmeSemesters.programmeId],
    references: [programmes.id],
  }),
  batches: many(batches),
  exams: many(exams),
}));

export const coursesRelations = relations(courses, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [courses.instituteId],
    references: [institutes.id],
  }),
  batches: many(batches),
}));

export const teacherAssignmentsRelations = relations(teacherAssignments, ({ one }) => ({
  institute: one(institutes, {
    fields: [teacherAssignments.instituteId],
    references: [institutes.id],
  }),
  teacher: one(staff, {
    fields: [teacherAssignments.teacherId],
    references: [staff.id],
  }),
  course: one(courses, {
    fields: [teacherAssignments.courseId],
    references: [courses.id],
  }),
  programme: one(programmes, {
    fields: [teacherAssignments.programmeId],
    references: [programmes.id],
  }),
}));

export const batchesRelations = relations(batches, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [batches.instituteId],
    references: [institutes.id],
  }),
  course: one(courses, {
    fields: [batches.courseId],
    references: [courses.id],
  }),
  teacher: one(staff, {
    fields: [batches.teacherId],
    references: [staff.id],
  }),
  programme: one(programmes, {
    fields: [batches.programmeId],
    references: [programmes.id],
  }),
  semester: one(programmeSemesters, {
    fields: [batches.semesterId],
    references: [programmeSemesters.id],
  }),
  enrollments: many(enrollments),
  attendance: many(attendance),
  routines: many(routines),
  homework: many(homework),
  assignments: many(assignments),
  exams: many(exams),
}));

export const examsRelations = relations(exams, ({ one, many }) => ({
  institute: one(institutes, {
    fields: [exams.instituteId],
    references: [institutes.id],
  }),
  batch: one(batches, {
    fields: [exams.batchId],
    references: [batches.id],
  }),
  programme: one(programmes, {
    fields: [exams.programmeId],
    references: [programmes.id],
  }),
  semester: one(programmeSemesters, {
    fields: [exams.semesterId],
    references: [programmeSemesters.id],
  }),
  subjects: many(examSubjects),
  results: many(results),
}));
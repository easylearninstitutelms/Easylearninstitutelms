import { db } from "@/db";
import {
  users, institutes, subscriptions, plans, students, staff, courses, batches,
  enrollments, fees, payments, expenses, attendance, enquiries, notifications,
} from "@/db/schema";
import { sql } from "drizzle-orm";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "easylearn_salt").digest("hex");
}

export async function POST() {
  try {
    // Check if already seeded
    const existing = await db.select().from(users).limit(1);
    if (existing.length > 0) {
      return Response.json({ message: "Already seeded" });
    }

    // Create Super Admin
    const [superAdmin] = await db.insert(users).values({
      role: "SUPER_ADMIN",
      name: "Super Admin",
      email: "admin@easylearn.io",
      passwordHash: hashPassword("admin123"),
      status: "ACTIVE",
    }).returning();

    // Create Plan
    const [plan] = await db.insert(plans).values({
      name: "Standard",
      description: "Full access plan for institutes",
      price: "1500.00",
      billingPeriod: "MONTHLY",
      limitsJson: { students: 500, staff: 50, batches: 30 },
      featuresJson: ["Attendance", "Fees", "Reports", "Notifications"],
      status: "ACTIVE",
    }).returning();

    // Create Institute 1
    const [inst1] = await db.insert(institutes).values({
      name: "Dhaka Model Institute",
      phone: "01711000001",
      email: "info@dhakamodel.edu.bd",
      address: "Dhanmondi, Dhaka",
      type: "Coaching Center",
      status: "ACTIVE",
    }).returning();

    // Create Institute 2
    const [inst2] = await db.insert(institutes).values({
      name: "Chittagong Science Academy",
      phone: "01811000002",
      email: "info@ctgscience.edu.bd",
      address: "Agrabad, Chittagong",
      type: "Academy",
      status: "TRIAL",
    }).returning();

    // Create subscription for inst1
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await db.insert(subscriptions).values({
      instituteId: inst1.id,
      planId: plan.id,
      status: "ACTIVE",
      trialStart,
      trialEnd,
      startDate: new Date(),
      endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });

    await db.insert(subscriptions).values({
      instituteId: inst2.id,
      status: "TRIAL",
      trialStart,
      trialEnd,
    });

    // Admin for inst1
    const [admin1] = await db.insert(users).values({
      instituteId: inst1.id,
      role: "INSTITUTE_ADMIN",
      name: "Karim Admin",
      email: "karim@dhakamodel.edu.bd",
      passwordHash: hashPassword("admin123"),
      status: "ACTIVE",
    }).returning();

    // Admin for inst2
    const [admin2] = await db.insert(users).values({
      instituteId: inst2.id,
      role: "INSTITUTE_ADMIN",
      name: "Rahim Admin",
      email: "rahim@ctgscience.edu.bd",
      passwordHash: hashPassword("admin123"),
      status: "ACTIVE",
    }).returning();

    // Staff for inst1
    const staffData = [
      { name: "Nasrin Akter", designation: "Teacher", salary: "15000", phone: "01711000010" },
      { name: "Rafiqul Islam", designation: "Teacher", salary: "18000", phone: "01711000011" },
      { name: "Salma Khatun", designation: "Accountant", salary: "12000", phone: "01711000012" },
    ];

    const staffRecords = [];
    for (const s of staffData) {
      const [member] = await db.insert(staff).values({
        instituteId: inst1.id,
        name: s.name,
        designation: s.designation,
        salary: s.salary,
        phone: s.phone,
        joiningDate: "2024-01-01",
        status: "ACTIVE",
      }).returning();
      staffRecords.push(member);
    }

    // Courses for inst1
    const [course1] = await db.insert(courses).values({
      instituteId: inst1.id,
      name: "SSC Preparation",
      description: "Complete SSC preparation course",
      duration: "12 months",
      fee: "5000",
      status: "ACTIVE",
    }).returning();

    const [course2] = await db.insert(courses).values({
      instituteId: inst1.id,
      name: "HSC Preparation",
      description: "Complete HSC preparation course",
      duration: "12 months",
      fee: "6000",
      status: "ACTIVE",
    }).returning();

    // Batches for inst1
    const [batch1] = await db.insert(batches).values({
      instituteId: inst1.id,
      courseId: course1.id,
      teacherId: staffRecords[0].id,
      name: "SSC Batch A-2024",
      room: "Room 101",
      startDate: "2024-01-15",
      endDate: "2024-12-15",
      fee: "500",
      status: "ACTIVE",
    }).returning();

    const [batch2] = await db.insert(batches).values({
      instituteId: inst1.id,
      courseId: course2.id,
      teacherId: staffRecords[1].id,
      name: "HSC Batch B-2024",
      room: "Room 102",
      startDate: "2024-02-01",
      endDate: "2025-01-31",
      fee: "600",
      status: "ACTIVE",
    }).returning();

    // Students for inst1
    const studentData = [
      { name: "Arif Hossain", phone: "01711111001", gender: "MALE" as const, studentId: "STD2401" },
      { name: "Fatema Begum", phone: "01711111002", gender: "FEMALE" as const, studentId: "STD2402" },
      { name: "Rakib Islam", phone: "01711111003", gender: "MALE" as const, studentId: "STD2403" },
      { name: "Nusrat Jahan", phone: "01711111004", gender: "FEMALE" as const, studentId: "STD2404" },
      { name: "Shahin Alam", phone: "01711111005", gender: "MALE" as const, studentId: "STD2405" },
      { name: "Mitu Akter", phone: "01711111006", gender: "FEMALE" as const, studentId: "STD2406" },
      { name: "Kamal Uddin", phone: "01711111007", gender: "MALE" as const, studentId: "STD2407" },
      { name: "Rima Khatun", phone: "01711111008", gender: "FEMALE" as const, studentId: "STD2408" },
    ];

    const studentRecords = [];
    for (const s of studentData) {
      const [student] = await db.insert(students).values({
        instituteId: inst1.id,
        studentId: s.studentId,
        name: s.name,
        phone: s.phone,
        gender: s.gender,
        guardianName: `${s.name}'s Parent`,
        guardianPhone: "01700000000",
        admissionDate: "2024-01-15",
        status: "ACTIVE",
      }).returning();
      studentRecords.push(student);
    }

    // Enroll students
    for (let i = 0; i < 5; i++) {
      await db.insert(enrollments).values({
        instituteId: inst1.id,
        studentId: studentRecords[i].id,
        batchId: batch1.id,
        enrollmentDate: "2024-01-15",
        status: "ACTIVE",
      });
    }

    for (let i = 5; i < 8; i++) {
      await db.insert(enrollments).values({
        instituteId: inst1.id,
        studentId: studentRecords[i].id,
        batchId: batch2.id,
        enrollmentDate: "2024-02-01",
        status: "ACTIVE",
      });
    }

    // Fees and Payments
    const today = new Date().toISOString().split("T")[0];
    for (let i = 0; i < studentRecords.length; i++) {
      const [fee] = await db.insert(fees).values({
        instituteId: inst1.id,
        studentId: studentRecords[i].id,
        feeType: "MONTHLY",
        amount: "500",
        discount: "0",
        dueAmount: i < 5 ? "0" : "500",
        status: i < 5 ? "PAID" : "DUE",
      }).returning();

      if (i < 5) {
        await db.insert(payments).values({
          instituteId: inst1.id,
          studentId: studentRecords[i].id,
          feeId: fee.id,
          amount: "500",
          method: "CASH",
          receiptNumber: `RCP-2024-${String(i + 1).padStart(4, "0")}`,
          collectedBy: admin1.id,
          paidAt: new Date(),
        });
      }
    }

    // Attendance
    const statuses = ["PRESENT", "PRESENT", "PRESENT", "ABSENT", "LATE"] as const;
    for (let i = 0; i < 5; i++) {
      await db.insert(attendance).values({
        instituteId: inst1.id,
        studentId: studentRecords[i].id,
        batchId: batch1.id,
        date: today,
        status: statuses[i % 5],
        recordedBy: admin1.id,
      });
    }

    // Expenses
    await db.insert(expenses).values([
      { instituteId: inst1.id, category: "RENT", amount: "15000", method: "BANK", description: "Monthly rent", expenseDate: today, addedBy: admin1.id },
      { instituteId: inst1.id, category: "ELECTRICITY", amount: "3000", method: "CASH", description: "Electric bill", expenseDate: today, addedBy: admin1.id },
      { instituteId: inst1.id, category: "INTERNET", amount: "2000", method: "BKASH", description: "Internet bill", expenseDate: today, addedBy: admin1.id },
    ]);

    // Enquiries
    await db.insert(enquiries).values([
      { instituteId: inst1.id, name: "Anas Ahmed", phone: "01800000001", courseId: course1.id, source: "Facebook", status: "NEW", notes: "Interested in SSC batch" },
      { instituteId: inst1.id, name: "Sonia Parvin", phone: "01800000002", courseId: course2.id, source: "Referral", status: "CONTACTED", followUpDate: today },
      { instituteId: inst1.id, name: "Imran Khan", phone: "01800000003", courseId: course1.id, source: "Walk-in", status: "INTERESTED" },
    ]);

    // Notifications
    await db.insert(notifications).values([
      { instituteId: inst1.id, title: "Welcome to Easylearn!", body: "Your institute has been set up successfully.", type: "GENERAL" },
      { instituteId: inst1.id, title: "Fee Due Reminder", body: "3 students have pending fees.", type: "FEE_DUE" },
    ]);

    return Response.json({
      success: true,
      message: "Database seeded successfully",
      credentials: {
        superAdmin: { email: "admin@easylearn.io", password: "admin123" },
        instituteAdmin1: { email: "karim@dhakamodel.edu.bd", password: "admin123" },
        instituteAdmin2: { email: "rahim@ctgscience.edu.bd", password: "admin123" },
      },
    });
  } catch (error) {
    console.error("Seed error:", error);
    return Response.json({ error: String(error) }, { status: 500 });
  }
}

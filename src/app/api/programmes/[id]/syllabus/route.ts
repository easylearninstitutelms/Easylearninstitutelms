import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";

type Row = Record<string, unknown>;

function rowsOf(result: unknown): Row[] {
  if (result && typeof result === "object" && "rows" in result && Array.isArray((result as { rows?: unknown }).rows)) {
    return (result as { rows: Row[] }).rows;
  }
  return Array.isArray(result) ? result as Row[] : [];
}

const WEB_DESIGN_AI = [
  ["Introduction to Web Design in the AI Era","ওয়েব প্রসেস, ডোমেইন, হোস্টিং এবং AI-এর ভূমিকা"],
  ["Color Theory, Typography & Grid System with AI Assistant",""],
  ["AI Prompt Engineering for UI/UX Design","v0.dev, Relume.io, Midjourney/DALL-E"],
  ["Wireframing & Site Architecture using AI Tools",""],
  ["Figma Fundamentals: Vector Tools, Components & Auto-Layout",""],
  ["Designing UI with Figma AI Features & Plugins",""],
  ["Generating Design System & UI Kits using AI Prompts",""],
  ["Converting AI Prompt to Figma Design Layouts",""],
  ["Responsive Web Design Rules & Mobile-First Approach",""],
  ["Semester Project 1: Figma-তে একটি সম্পূর্ণ ওয়েবসাইট ইন্টারফেস ও UI Kits ডিজাইন.",""],
  ["Introduction to WordPress & AI-Driven Local Setup",""],
  ["AI Website Builders Overview","ZipWP, Elementor AI, CodeWP"],
  ["Elementor Basics: Layouts, Containers & Widgets",""],
  ["Advanced Elementor + AI: Generating Custom Layouts & Content",""],
  ["Dynamic Content & Custom Post Types","ACF / JetEngine basics"],
  ["Creating Modern Hero Sections & Animated Effects with AI Prompts",""],
  ["E-Commerce Setup with WooCommerce & AI Product Generation",""],
  ["AI-Powered Form Builders & Lead Capture Automation",""],
  ["Website Performance Optimization & AI Image Compression",""],
  ["Semester Project 2: AI-এর মাধ্যমে একটি সম্পূর্ণ Dynamic Business or E-Commerce Website তৈরি.",""],
  ["HTML5 Structure & Semantic Tags with ChatGPT/Claude",""],
  ["CSS3 Fundamentals & Modern Layouts","Flexbox & Grid with AI Coding"],
  ["Modern Styling Frameworks: Tailwind CSS Basics with AI",""],
  ["JavaScript Essentials for Designers & Event Handling",""],
  ["Generating Custom JS Interactivity & Animations using AI",""],
  ["Debugging & Fixing Code Errors using AI Assistance",""],
  ["Converting Figma Design to Custom Code (HTML/CSS) with AI Tools",""],
  ["Customizing WordPress Themes with AI-Generated Custom CSS/JS",""],
  ["Building One-Page Portfolio Website using Pure Code & AI",""],
  ["Semester Project 3: AI-এর সাহায্যে Figma টু Custom Responsive Frontend Web Page কনভার্সন.",""],
  ["Integrating Custom AI Chatbots in Websites","Voiceflow / Botpress"],
  ["AI Automation for Websites","Zapier / Make.com Integration"],
  ["Technical & On-Page SEO Optimization using AI Tools",""],
  ["Website Security, Backup & Maintenance with AI Monitoring",""],
  ["Web Accessibility (a11y) & Cross-Browser Testing",""],
  ["Building a High-Converting Portfolio Site with AI Copywriting",""],
  ["Creating Client Proposals & Project Scoping using AI",""],
  ["Marketplace Orientation (Fiverr, Upwork) & Freelancing Strategies",""],
  ["AI Workflow for Rapid Client Project Delivery & Handover",""],
  ["Final Capstone Project & Portfolio Review","লাইভ ক্লায়েন্ট প্রজেক্ট প্রেজেন্টেশন ও সার্টিফিকেশন."]
] as const;

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureAcademicSchema();
    const { id } = await params;

    const programme = rowsOf(await db.execute(sql`
      SELECT id, name, code, programme_no AS "programmeNo"
      FROM programmes
      WHERE id = ${id} AND institute_id = ${session.instituteId}
      LIMIT 1
    `))[0];
    if (!programme) return NextResponse.json({ error: "Programme not found" }, { status: 404 });

    const semesters = rowsOf(await db.execute(sql`
      SELECT id, semester_no AS "semesterNo", name
      FROM programme_semesters
      WHERE programme_id = ${id} AND institute_id = ${session.instituteId}
      ORDER BY semester_no
    `));

    const result = await db.execute(sql`
      SELECT c.id, c.class_no AS "classNo", c.title, c.description,
             c.scheduled_date AS "scheduledDate", c.start_time AS "startTime",
             c.end_time AS "endTime", c.status,
             s.id AS "semesterId", s.semester_no AS "semesterNo", s.name AS "semesterName"
      FROM programme_syllabus_classes c
      INNER JOIN programme_semesters s ON s.id = c.semester_id
      WHERE c.programme_id = ${id} AND c.institute_id = ${session.instituteId}
      ORDER BY s.semester_no, c.class_no
    `);

    return NextResponse.json({ programme, semesters, classes: rowsOf(result) });
  } catch (error) {
    console.error("Syllabus GET error:", error);
    return NextResponse.json({ error: "Failed to load syllabus" }, { status: 500 });
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["INSTITUTE_ADMIN", "SUPER_ADMIN", "MANAGER", "TEACHER"].includes(session.role)) {
      return NextResponse.json({ error: "You do not have permission to manage syllabus" }, { status: 403 });
    }
    await ensureAcademicSchema();
    const { id } = await params;
    const body = await request.json();

    const programme = rowsOf(await db.execute(sql`
      SELECT id FROM programmes
      WHERE id = ${id} AND institute_id = ${session.instituteId}
      LIMIT 1
    `))[0];
    if (!programme) return NextResponse.json({ error: "Programme not found" }, { status: 404 });

    const semesters = rowsOf(await db.execute(sql`
      SELECT id, semester_no AS "semesterNo"
      FROM programme_semesters
      WHERE programme_id = ${id} AND institute_id = ${session.instituteId}
      ORDER BY semester_no
    `));

    if (body.template === "WEB_DESIGN_AI" || body.seed === true) {
      if (semesters.length !== 4) {
        return NextResponse.json({ error: "This syllabus template requires exactly 4 semesters." }, { status: 400 });
      }

      let seeded = 0;
      await db.transaction(async tx => {
        for (const semester of semesters) {
          const semesterNo = Number(semester.semesterNo);
          for (let i = 1; i <= 10; i += 1) {
            const index = (semesterNo - 1) * 10 + (i - 1);
            const item = WEB_DESIGN_AI[index];
            if (!item) continue;
            const result = await tx.execute(sql`
              INSERT INTO programme_syllabus_classes
                (institute_id, programme_id, semester_id, class_no, title, description, status)
              VALUES
                (${session.instituteId}, ${id}, ${semester.id}, ${i}, ${item[0]}, ${item[1] || null}, 'UPCOMING')
              ON CONFLICT (semester_id, class_no) DO NOTHING
              RETURNING id
            `);
            if (rowsOf(result).length) seeded += 1;
          }
        }
      });

      return NextResponse.json({
        success: true,
        seeded,
        message: seeded ? `Added ${seeded} missing syllabus classes. Existing classes were kept.` : "All template classes already exist.",
      });
    }

    const semesterId = String(body.semesterId || "");
    const classNo = Number(body.classNo);
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!semesterId || !Number.isInteger(classNo) || classNo < 1 || !title) {
      return NextResponse.json({ error: "Semester, class number and title are required." }, { status: 400 });
    }

    const semester = rowsOf(await db.execute(sql`
      SELECT id FROM programme_semesters
      WHERE id = ${semesterId} AND programme_id = ${id} AND institute_id = ${session.instituteId}
      LIMIT 1
    `))[0];
    if (!semester) return NextResponse.json({ error: "Semester not found" }, { status: 404 });

    const duplicate = rowsOf(await db.execute(sql`
      SELECT id FROM programme_syllabus_classes
      WHERE semester_id = ${semesterId} AND class_no = ${classNo}
      LIMIT 1
    `))[0];
    if (duplicate) return NextResponse.json({ error: `Class ${classNo} already exists in this semester. Use Edit instead.` }, { status: 409 });

    const inserted = await db.execute(sql`
      INSERT INTO programme_syllabus_classes
        (institute_id, programme_id, semester_id, class_no, title, description, scheduled_date, start_time, end_time, status)
      VALUES
        (${session.instituteId}, ${id}, ${semesterId}, ${classNo}, ${title},
         ${body.description || null}, ${body.scheduledDate || null},
         ${body.startTime || null}, ${body.endTime || null}, ${body.status || "UPCOMING"})
      RETURNING id
    `);
    return NextResponse.json({ success: true, id: rowsOf(inserted)[0]?.id }, { status: 201 });
  } catch (error) {
    console.error("Syllabus POST error:", error);
    return NextResponse.json({ error: "Failed to save syllabus" }, { status: 500 });
  }
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await getSession();
    if (!session?.instituteId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    if (!["INSTITUTE_ADMIN", "SUPER_ADMIN", "MANAGER", "TEACHER"].includes(session.role)) {
      return NextResponse.json({ error: "You do not have permission to manage syllabus" }, { status: 403 });
    }
    await ensureAcademicSchema();
    const { id } = await params;
    const body = await request.json();
    const classId = String(body.classId || "");
    if (!classId) return NextResponse.json({ error: "Class ID is required." }, { status: 400 });

    const title = typeof body.title === "string" ? body.title.trim() : "";
    const status = ["UPCOMING", "TODAY", "COMPLETED", "CANCELLED"].includes(body.status) ? body.status : null;

    const updated = await db.execute(sql`
      UPDATE programme_syllabus_classes
      SET title = CASE WHEN ${title} <> '' THEN ${title} ELSE title END,
          description = CASE WHEN ${body.description !== undefined} THEN ${body.description || null} ELSE description END,
          scheduled_date = CASE WHEN ${body.scheduledDate !== undefined} THEN ${body.scheduledDate || null} ELSE scheduled_date END,
          start_time = CASE WHEN ${body.startTime !== undefined} THEN ${body.startTime || null} ELSE start_time END,
          end_time = CASE WHEN ${body.endTime !== undefined} THEN ${body.endTime || null} ELSE end_time END,
          status = CASE WHEN ${status !== null} THEN ${status} ELSE status END,
          updated_at = now()
      WHERE id = ${classId} AND programme_id = ${id} AND institute_id = ${session.instituteId}
      RETURNING id
    `);
    if (!rowsOf(updated)[0]) return NextResponse.json({ error: "Class not found" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Syllabus PATCH error:", error);
    return NextResponse.json({ error: "Failed to update class" }, { status: 500 });
  }
}

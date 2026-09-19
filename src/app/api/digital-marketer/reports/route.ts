import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureMarketingSchema } from "@/lib/marketing";

const ROLES = ["DIGITAL_MARKETER", "SUPER_ADMIN", "INSTITUTE_ADMIN"];

function n(value: unknown) {
  const x = Number(value);
  return Number.isFinite(x) && x >= 0 ? x : 0;
}
function textValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}
async function getStaff(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session?.instituteId) return null;
  const rows = await db.execute(sql`
    SELECT id, name, designation FROM staff
    WHERE institute_id = ${session.instituteId}
      AND user_id = ${session.userId}
      AND deleted_at IS NULL LIMIT 1
  `);
  return rows.rows[0] || null;
}

export async function GET(request: Request) {
  const session = await getSession();
  const permissionError = requireRoles(session, ROLES);
  if (permissionError) return permissionError;
  if (!session?.instituteId) return Response.json({ error: "Institute not found" }, { status: 400 });
  await ensureMarketingSchema();
  const staffMember = await getStaff(session);
  const { searchParams } = new URL(request.url);
  const from = searchParams.get("from") || "";
  const to = searchParams.get("to") || "";
  const staffCondition = session.role === "DIGITAL_MARKETER"
    ? sql`AND r.staff_id = ${staffMember?.id || "00000000-0000-0000-0000-000000000000"}`
    : sql``;
  const dateCondition = from && to
    ? sql`AND r.report_date BETWEEN ${from}::date AND ${to}::date`
    : sql``;
  const reports = await db.execute(sql`
    SELECT r.id, r.report_date, r.summary, r.tasks_completed,
      r.posts_count, r.videos_count, r.creatives_count,
      r.leads_count, r.enrollments_count, r.messages_count,
      r.calls_count, r.website_visits, r.impressions, r.clicks,
      r.budget, r.budget_spent, r.notes, s.name AS staff_name
    FROM marketing_daily_reports r
    JOIN staff s ON s.id = r.staff_id
    WHERE r.institute_id = ${session.instituteId}
      AND s.deleted_at IS NULL ${staffCondition} ${dateCondition}
    ORDER BY r.report_date DESC, r.created_at DESC LIMIT 100
  `);
  const ids = reports.rows.map((r: any) => r.id);
  let ads: any[] = [];
  if (ids.length) {
    const adRows = await db.execute(sql`
      SELECT id, report_id, platform, campaign_name, amount, leads_count,
        clicks, impressions, enrollments_count, note
      FROM marketing_ad_spends
      WHERE report_id IN (${sql.join(ids.map((id: string) => sql`${id}::uuid`), sql`, `)})
      ORDER BY created_at ASC
    `);
    ads = adRows.rows;
  }
  return Response.json({
    reports: reports.rows.map((r: any) => ({ ...r, ads: ads.filter((a) => a.report_id === r.id) })),
    staff: staffMember,
  });
}

export async function POST(request: Request) {
  const session = await getSession();
  const permissionError = requireRoles(session, ROLES);
  if (permissionError) return permissionError;
  if (!session?.instituteId) return Response.json({ error: "Institute not found" }, { status: 400 });
  await ensureMarketingSchema();
  const body = await request.json();
  const staffMember = await getStaff(session);
  const staffId = session.role === "DIGITAL_MARKETER" ? staffMember?.id : textValue(body.staffId);
  if (!staffId) return Response.json({ error: "Staff member is required" }, { status: 400 });
  const reportDate = textValue(body.reportDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reportDate)) {
    return Response.json({ error: "Valid report date is required" }, { status: 400 });
  }
  if (session.role === "DIGITAL_MARKETER" && staffId !== staffMember?.id) {
    return Response.json({ error: "You can only submit your own report" }, { status: 403 });
  }
  const staffCheck = await db.execute(sql`
    SELECT id FROM staff WHERE id = ${staffId}
      AND institute_id = ${session.instituteId} AND deleted_at IS NULL LIMIT 1
  `);
  if (!staffCheck.rows.length) return Response.json({ error: "Staff member not found" }, { status: 404 });
  const ads = Array.isArray(body.ads) ? body.ads : [];
  const result = await db.transaction(async (tx) => {
    const upsert = await tx.execute(sql`
      INSERT INTO marketing_daily_reports (
        institute_id, staff_id, report_date, summary, tasks_completed,
        posts_count, videos_count, creatives_count, leads_count, enrollments_count,
        messages_count, calls_count, website_visits, impressions, clicks, budget,
        budget_spent, notes, updated_at
      ) VALUES (
        ${session.instituteId}, ${staffId}, ${reportDate}::date,
        ${textValue(body.summary) || null}, ${textValue(body.tasksCompleted) || null},
        ${Math.floor(n(body.postsCount))}, ${Math.floor(n(body.videosCount))},
        ${Math.floor(n(body.creativesCount))}, ${Math.floor(n(body.leadsCount))},
        ${Math.floor(n(body.enrollmentsCount))}, ${Math.floor(n(body.messagesCount))},
        ${Math.floor(n(body.callsCount))}, ${Math.floor(n(body.websiteVisits))},
        ${Math.floor(n(body.impressions))}, ${Math.floor(n(body.clicks))},
        ${n(body.budget)}, ${n(body.budgetSpent)}, ${textValue(body.notes) || null}, now()
      )
      ON CONFLICT (staff_id, report_date) DO UPDATE SET
        summary=EXCLUDED.summary, tasks_completed=EXCLUDED.tasks_completed,
        posts_count=EXCLUDED.posts_count, videos_count=EXCLUDED.videos_count,
        creatives_count=EXCLUDED.creatives_count, leads_count=EXCLUDED.leads_count,
        enrollments_count=EXCLUDED.enrollments_count, messages_count=EXCLUDED.messages_count,
        calls_count=EXCLUDED.calls_count, website_visits=EXCLUDED.website_visits,
        impressions=EXCLUDED.impressions, clicks=EXCLUDED.clicks, budget=EXCLUDED.budget,
        budget_spent=EXCLUDED.budget_spent, notes=EXCLUDED.notes, updated_at=now()
      RETURNING *
    `);
    const report = upsert.rows[0] as any;
    await tx.execute(sql`DELETE FROM marketing_ad_spends WHERE report_id = ${report.id}`);
    for (const ad of ads) {
      const platform = textValue(ad.platform);
      if (!platform) continue;
      await tx.execute(sql`
        INSERT INTO marketing_ad_spends (
          report_id, platform, campaign_name, amount, leads_count,
          clicks, impressions, enrollments_count, note
        ) VALUES (
          ${report.id}, ${platform}, ${textValue(ad.campaignName) || null},
          ${n(ad.amount)}, ${Math.floor(n(ad.leadsCount))},
          ${Math.floor(n(ad.clicks))}, ${Math.floor(n(ad.impressions))},
          ${Math.floor(n(ad.enrollmentsCount))}, ${textValue(ad.note) || null}
        )
      `);
    }
    return report;
  });
  return Response.json({ success: true, report: result }, { status: 201 });
}

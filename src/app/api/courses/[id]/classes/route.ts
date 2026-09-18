import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";
const ROLES=["SUPER_ADMIN","INSTITUTE_ADMIN","MANAGER","TEACHER"];
const rows=(r:any)=>r?.rows||(Array.isArray(r)?r:[]);
export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getSession();if(!session?.instituteId)return NextResponse.json({error:"Unauthorized"},{status:401});
 const pe=requireRoles(session,ROLES);if(pe)return pe;await ensureAcademicSchema();const {id}=await params;
 const result=await db.execute(sql`SELECT c.id,c.class_no AS "classNo",c.title,c.description,c.scheduled_date AS "scheduledDate",c.start_time AS "startTime",c.end_time AS "endTime",c.status,r.id AS "recordingId",r.title AS "recordingTitle",r.video_url AS "videoUrl",r.duration AS "recordingDuration" FROM course_syllabus_classes c LEFT JOIN course_class_recordings r ON r.course_class_id=c.id WHERE c.course_id=${id} AND c.institute_id=${session.instituteId} ORDER BY c.class_no`);
 return NextResponse.json({classes:rows(result)});
}
export async function PATCH(request:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getSession();if(!session?.instituteId)return NextResponse.json({error:"Unauthorized"},{status:401});
 const pe=requireRoles(session,ROLES);if(pe)return pe;await ensureAcademicSchema();const {id}=await params;const b=await request.json();const classId=String(b.classId||"");
 if(!classId||!String(b.title||"").trim())return NextResponse.json({error:"Class and title are required."},{status:400});
 const result=await db.execute(sql`UPDATE course_syllabus_classes SET title=${String(b.title).trim()},description=${b.description?String(b.description).trim():null},scheduled_date=${b.scheduledDate||null},start_time=${b.startTime||null},end_time=${b.endTime||null},status=${b.status||"UPCOMING"},updated_at=now() WHERE id=${classId} AND course_id=${id} AND institute_id=${session.instituteId} RETURNING id,class_no AS "classNo",title,description,scheduled_date AS "scheduledDate",start_time AS "startTime",end_time AS "endTime",status`);
 const item=rows(result)[0];if(!item)return NextResponse.json({error:"Class not found"},{status:404});return NextResponse.json({class:item});
}
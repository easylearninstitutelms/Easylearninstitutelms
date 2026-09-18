import { NextResponse } from "next/server";
import { db } from "@/db";
import { sql } from "drizzle-orm";
import { getSession, requireRoles } from "@/lib/session";
import { ensureAcademicSchema } from "@/lib/academic";
const MANAGE=["SUPER_ADMIN","INSTITUTE_ADMIN","MANAGER","ADMIN","INSTITUTE","TEACHER"];const rows=(r:any)=>r?.rows||(Array.isArray(r)?r:[]);
export async function POST(request:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getSession();if(!session?.instituteId)return NextResponse.json({error:"Unauthorized"},{status:401});const pe=requireRoles(session,MANAGE);if(pe)return pe;await ensureAcademicSchema();
 const {id}=await params;const b=await request.json();const classId=String(b.classId||""),title=String(b.title||"").trim(),url=String(b.videoUrl||"").trim();
 if(!classId||!title||!url)return NextResponse.json({error:"Class, title and video URL are required."},{status:400});try{new URL(url)}catch{return NextResponse.json({error:"Please enter a valid video URL."},{status:400});}
 const saved=rows(await db.execute(sql`INSERT INTO course_class_recordings(institute_id,course_class_id,title,video_url,duration) SELECT ${session.instituteId},id,${title},${url},${b.duration?String(b.duration).trim():null} FROM course_syllabus_classes WHERE id=${classId} AND course_id=${id} AND institute_id=${session.instituteId} ON CONFLICT(course_class_id) DO UPDATE SET title=EXCLUDED.title,video_url=EXCLUDED.video_url,duration=EXCLUDED.duration,updated_at=now() RETURNING id,title,video_url AS "videoUrl",duration`))[0];
 if(!saved)return NextResponse.json({error:"Course class not found"},{status:404});return NextResponse.json({recording:saved});
}
export async function DELETE(request:Request,{params}:{params:Promise<{id:string}>}){
 const session=await getSession();if(!session?.instituteId)return NextResponse.json({error:"Unauthorized"},{status:401});const pe=requireRoles(session,MANAGE);if(pe)return pe;await ensureAcademicSchema();const {id}=await params;const b=await request.json();
 await db.execute(sql`DELETE FROM course_class_recordings WHERE course_class_id=${String(b.classId||"")} AND institute_id=${session.instituteId} AND course_class_id IN (SELECT id FROM course_syllabus_classes WHERE course_id=${id})`);
 return NextResponse.json({success:true});
}
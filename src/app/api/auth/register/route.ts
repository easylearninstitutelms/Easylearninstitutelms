import { db } from "@/db";
import { users, institutes, subscriptions } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password + "easylearn_salt").digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, password, phone, instituteName, institutePhone, instituteAddress } = body;

    if (!name || !email || !password || !instituteName) {
      return Response.json({ error: "All required fields must be filled" }, { status: 400 });
    }

    // Check email uniqueness
    const [existingUser] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);

    if (existingUser) {
      return Response.json({ error: "Email already registered" }, { status: 409 });
    }

    // Create institute
    const [institute] = await db
      .insert(institutes)
      .values({
        name: instituteName,
        phone: institutePhone || null,
        address: instituteAddress || null,
        status: "TRIAL",
      })
      .returning();

    // Create admin user
    const [user] = await db
      .insert(users)
      .values({
        instituteId: institute.id,
        role: "INSTITUTE_ADMIN",
        name,
        email: email.toLowerCase().trim(),
        phone: phone || null,
        passwordHash: hashPassword(password),
        status: "ACTIVE",
      })
      .returning();

    // Create trial subscription
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    await db.insert(subscriptions).values({
      instituteId: institute.id,
      status: "TRIAL",
      trialStart,
      trialEnd,
    });

    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      instituteId: institute.id,
      instituteName: institute.name,
      instituteStatus: institute.status,
    };

    const cookieStore = await cookies();
    cookieStore.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return Response.json({ success: true, user: sessionData });
  } catch (error) {
    console.error("Register error:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

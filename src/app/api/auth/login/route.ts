import { db } from "@/db";
import { users, institutes } from "@/db/schema";
import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";

function hashLegacyPassword(password: string): string {
  return crypto
    .createHash("sha256")
    .update(password + "easylearn_salt")
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { error: "Email and password required" },
        { status: 400 }
      );
    }

    const loginEmail = email.toLowerCase().trim();

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, loginEmail))
      .limit(1);

    if (!user) {
      return Response.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    /*
     * New staff/teacher accounts use bcrypt.
     * Older accounts may still use the legacy SHA-256 hash.
     * Support both so existing users do not break.
     */
    let passwordValid = false;

    if (user.passwordHash) {
      try {
        const bcryptResult = await bcrypt.compare(
          password,
          user.passwordHash
        );

        passwordValid = Boolean(bcryptResult);
      } catch {
        passwordValid = false;
      }
    }

    if (!passwordValid && user.passwordHash) {
      const legacyHash = hashLegacyPassword(password);
      passwordValid = user.passwordHash === legacyHash;
    }

    if (!passwordValid) {
      return Response.json(
        { error: "Invalid credentials" },
        { status: 401 }
      );
    }

    let institute = null;

    if (user.instituteId) {
      [institute] = await db
        .select()
        .from(institutes)
        .where(eq(institutes.id, user.instituteId))
        .limit(1);
    }

    const sessionData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      instituteId: user.instituteId,
      instituteName: institute?.name,
      instituteStatus: institute?.status,
    };

    const cookieStore = await cookies();

    cookieStore.set("session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7,
      path: "/",
    });

    return Response.json({
      success: true,
      user: sessionData,
    });
  } catch (error) {
    console.error("Login error:", error);

    return Response.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
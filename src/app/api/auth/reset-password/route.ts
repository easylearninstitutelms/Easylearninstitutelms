import crypto from "crypto";
import bcrypt from "bcryptjs";
import { db } from "@/db";
import { sql } from "drizzle-orm";

function hashToken(token: string) {
  return crypto
    .createHash("sha256")
    .update(token)
    .digest("hex");
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const token = String(body?.token || "").trim();
    const password = String(body?.password || "");

    if (!token || !password) {
      return Response.json(
        {
          error:
            "Reset token and password are required.",
        },
        { status: 400 }
      );
    }

    if (password.length < 8) {
      return Response.json(
        {
          error:
            "Password must be at least 8 characters.",
        },
        { status: 400 }
      );
    }

    const tokenHash = hashToken(token);

    const passwordHash =
      await bcrypt.hash(password, 12);

    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token_hash VARCHAR(64) NOT NULL UNIQUE,
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP NULL,
        created_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);

    const tokenResult =
      await db.execute(sql`
        SELECT id, user_id
        FROM password_reset_tokens
        WHERE token_hash = ${tokenHash}
          AND used_at IS NULL
          AND expires_at > NOW()
        LIMIT 1
      `);

    const rows =
      (tokenResult as any).rows || [];

    if (rows.length === 0) {
      return Response.json(
        {
          error:
            "This reset link is invalid or has expired.",
        },
        { status: 400 }
      );
    }

    const resetToken = rows[0];

    await db.transaction(async (tx) => {
      await tx.execute(sql`
        UPDATE users
        SET
          password_hash = ${passwordHash},
          updated_at = NOW()
        WHERE id = ${resetToken.user_id}
      `);

      await tx.execute(sql`
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE id = ${resetToken.id}
      `);

      await tx.execute(sql`
        UPDATE password_reset_tokens
        SET used_at = NOW()
        WHERE user_id = ${resetToken.user_id}
          AND used_at IS NULL
      `);
    });

    return Response.json({
      success: true,
      message:
        "Password changed successfully. You can now login.",
    });
  } catch (error) {
    console.error(
      "Reset password error:",
      error
    );

    return Response.json(
      {
        error:
          "Internal server error.",
      },
      { status: 500 }
    );
  }
}

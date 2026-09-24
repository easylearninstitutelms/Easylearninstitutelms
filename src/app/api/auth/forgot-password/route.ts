import crypto from "crypto";
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

    const email = String(body?.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return Response.json(
        {
          error: "Email is required.",
        },
        { status: 400 }
      );
    }

    const genericMessage =
      "If this email is registered, a password reset link has been sent.";

    const result = await db.execute(sql`
      SELECT id, name, email
      FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `);

    const rows = (result as any).rows || [];

    if (rows.length === 0) {
      return Response.json({
        success: true,
        message: genericMessage,
      });
    }

    const user = rows[0];

    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = hashToken(token);

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

    await db.execute(sql`
      UPDATE password_reset_tokens
      SET used_at = NOW()
      WHERE user_id = ${user.id}
        AND used_at IS NULL
    `);

    await db.execute(sql`
      INSERT INTO password_reset_tokens
        (user_id, token_hash, expires_at)
      VALUES
        (
          ${user.id},
          ${tokenHash},
          NOW() + INTERVAL '15 minutes'
        )
    `);

    const appUrl =
      process.env.APP_URL ||
      "http://localhost:3000";

    const resendApiKey =
      process.env.RESEND_API_KEY;

    const emailFrom =
      process.env.EMAIL_FROM;

    if (!resendApiKey || !emailFrom) {
      console.error(
        "Forgot password email service is not configured. Required: RESEND_API_KEY and EMAIL_FROM."
      );

      return Response.json(
        {
          error:
            "Email service is not configured yet. Please contact the administrator.",
        },
        { status: 500 }
      );
    }

    const resetUrl =
      `${appUrl}/reset-password?token=${encodeURIComponent(token)}`;

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${resendApiKey}`,
          "Content-Type":
            "application/json",
        },
        body: JSON.stringify({
          from: emailFrom,
          to: [user.email],
          subject:
            "Easylearn Institute - Reset your password",
          html: `
            <div style="font-family:Arial,sans-serif;max-width:600px;margin:auto;padding:24px">
              <h2 style="color:#2563eb">
                Easylearn Institute
              </h2>

              <p>Hello ${String(user.name || "Student")
                .replace(/</g, "&lt;")
                .replace(/>/g, "&gt;")},</p>

              <p>
                We received a request to reset your
                Easylearn Institute password.
              </p>

              <p>
                This link will expire in
                <strong>15 minutes</strong>.
              </p>

              <p>
                <a
                  href="${resetUrl}"
                  style="display:inline-block;background:#2563eb;color:white;padding:12px 20px;border-radius:8px;text-decoration:none"
                >
                  Reset Password
                </a>
              </p>

              <p style="color:#64748b;font-size:13px">
                If you did not request this, you can
                safely ignore this email.
              </p>
            </div>
          `,
        }),
      }
    );

    if (!resendResponse.ok) {
      const errorText =
        await resendResponse.text();

      console.error(
        "Resend email error:",
        errorText
      );

      return Response.json(
        {
          error:
            "Unable to send the reset email right now. Please try again later.",
        },
        { status: 502 }
      );
    }

    return Response.json({
      success: true,
      message: genericMessage,
    });
  } catch (error) {
    console.error(
      "Forgot password error:",
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

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isError } from "@/lib/api-auth";
import nodemailer from "nodemailer";

/**
 * Super-admin only mailer diagnostic.
 *
 *   POST /api/admin/test-email   { to: "privacy@goality.app" }
 *
 * Sends a plain probe message through the same SMTP transport the app
 * uses for everything else. Returns the full nodemailer result so we can
 * see accepted / rejected recipients. NEVER exposes SMTP credentials.
 */
export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (isError(session)) return session;
  if (!session.isSuper) {
    return NextResponse.json({ error: "Super admin required" }, { status: 403 });
  }

  const { to } = await req.json().catch(() => ({}));
  if (!to || typeof to !== "string") {
    return NextResponse.json({ error: "to is required" }, { status: 400 });
  }

  const port = Number(process.env.SMTP_PORT ?? 587);
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port === 587,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
    tls: { rejectUnauthorized: false },
  });

  const FROM = process.env.SMTP_FROM ?? "Goality <goal@goality.app>";

  try {
    const info = await transporter.sendMail({
      from: FROM,
      to,
      subject: `Goality mail probe — ${new Date().toISOString()}`,
      text:
        `This is a probe message sent from the Goality application server to verify SMTP delivery.\n\n` +
        `Source: ${process.env.SMTP_HOST} (${process.env.SMTP_USER})\n` +
        `Sent at: ${new Date().toISOString()}\n`,
    });
    return NextResponse.json({
      ok: true,
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      pending: info.pending,
      response: info.response,
      envelope: info.envelope,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

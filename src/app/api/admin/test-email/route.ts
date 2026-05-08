import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isError } from "@/lib/api-auth";
import { Resend } from "resend";

/**
 * Super-admin only mailer diagnostic.
 *
 *   POST /api/admin/test-email   { to: "privacy@goalityfootball.com" }
 *
 * Sends a plain probe message via Resend. Returns the Resend response
 * id and any error so we can verify deliverability without exposing
 * the API key.
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

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "RESEND_API_KEY is not set" }, { status: 500 });
  }

  const FROM = process.env.EMAIL_FROM ?? "Goality <noreply@goalityfootball.com>";
  const resend = new Resend(apiKey);

  try {
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [to],
      subject: `Goality mail probe — ${new Date().toISOString()}`,
      text:
        `This is a probe message sent from the Goality application server to verify Resend delivery.\n\n` +
        `From: ${FROM}\n` +
        `Sent at: ${new Date().toISOString()}\n`,
    });

    if (error) {
      return NextResponse.json({ ok: false, error: error.message ?? String(error) }, { status: 502 });
    }

    return NextResponse.json({
      ok: true,
      id: data?.id,
      from: FROM,
      to,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}

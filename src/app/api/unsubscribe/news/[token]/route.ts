import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { tournamentFollowers, tournaments, organizations } from "@/db/schema";
import { eq } from "drizzle-orm";
import { EMAIL_STRINGS, t, normaliseLocale } from "@/lib/email-i18n";

// GET /api/unsubscribe/news/[token]
//
// One-click per-tournament unsubscribe. Triggered from a link in the
// tournament-news email footer. No auth, no JavaScript — Gmail's
// one-click policy requires the link to work without confirmation.
// Idempotent: hitting an already-revoked token returns the "already
// unsubscribed" page rather than 404.
//
// The global List-Unsubscribe header that send() injects points at
// /unsubscribe (stops ALL Goality emails). THIS endpoint is per-
// tournament — finer grain so a follower can leave one tournament
// without going silent on the others they track.
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!token || token.length < 16 || token.length > 64) {
    return htmlPage({
      locale: "en",
      tournamentName: "",
      tournamentUrl: null,
      state: "invalid",
    });
  }

  const url = new URL(req.url);
  const locale = normaliseLocale(url.searchParams.get("locale"));

  const [follower] = await db
    .select({
      clubId: tournamentFollowers.clubId,
      tournamentId: tournamentFollowers.tournamentId,
    })
    .from(tournamentFollowers)
    .where(eq(tournamentFollowers.unsubscribeToken, token))
    .limit(1);

  if (!follower) {
    // Token already revoked (or never existed) — friendly "already done" page.
    return htmlPage({
      locale,
      tournamentName: "",
      tournamentUrl: null,
      state: "already",
    });
  }

  // Look up tournament + org for the confirmation page link.
  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, follower.tournamentId))
    .limit(1);
  const [org] = tournament
    ? await db.select().from(organizations).where(eq(organizations.id, tournament.organizationId)).limit(1)
    : [];

  // Hard delete the follow row. CASCADE doesn't fire here; reads are
  // preserved for any historical context the club still cares about.
  await db.delete(tournamentFollowers).where(eq(tournamentFollowers.unsubscribeToken, token));

  const tournamentUrl = tournament && org
    ? `/${locale}/t/${org.slug}/${tournament.slug}`
    : null;

  return htmlPage({
    locale,
    tournamentName: tournament?.name ?? "",
    tournamentUrl,
    state: "done",
  });
}

function htmlPage({
  locale,
  tournamentName,
  tournamentUrl,
  state,
}: {
  locale: ReturnType<typeof normaliseLocale>;
  tournamentName: string;
  tournamentUrl: string | null;
  state: "done" | "already" | "invalid";
}) {
  const U = EMAIL_STRINGS.unsubscribeNews;
  const title =
    state === "done" ? t(U, "confirmTitle", locale) : t(U, "alreadyUnsubscribed", locale);
  const body =
    state === "done"
      ? t(U, "confirmBody", locale, { tournamentName })
      : t(U, "alreadyUnsubscribed", locale);
  const cta = tournamentUrl
    ? `<a href="${tournamentUrl}" style="display:inline-block;margin-top:24px;padding:12px 24px;background:#0a0f1e;color:#fff;text-decoration:none;border-radius:10px;font-size:14px;font-weight:700;">${t(U, "backToTournament", locale)}</a>`
    : "";

  const html = `<!DOCTYPE html>
<html lang="${locale}">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${title}</title>
  <meta name="robots" content="noindex,nofollow">
</head>
<body style="margin:0;padding:0;background:#f0f2f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f0f2f5;padding:48px 16px;">
    <tr><td align="center">
      <div style="max-width:480px;background:#ffffff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);padding:40px 36px;text-align:center;">
        <div style="display:inline-block;width:56px;height:56px;background:#e8b84b;border-radius:14px;line-height:56px;font-size:28px;font-weight:900;color:#0a0f1e;margin-bottom:18px;">G</div>
        <h1 style="margin:0;font-size:22px;font-weight:800;color:#0a0f1e;">${title}</h1>
        <p style="margin:14px 0 0;font-size:15px;color:#374151;line-height:1.7;">${body}</p>
        ${cta}
      </div>
    </td></tr>
  </table>
</body>
</html>`;

  return new NextResponse(html, {
    status: 200,
    headers: { "Content-Type": "text/html; charset=utf-8" },
  });
}

// POST — Gmail one-click rule allows POST after the initial GET render.
// Identical behaviour — keeping it simple and idempotent.
export async function POST(
  req: NextRequest,
  ctx: { params: Promise<{ token: string }> },
) {
  return GET(req, ctx);
}

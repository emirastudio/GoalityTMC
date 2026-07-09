import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { bugReports, adminUsers, clubUsers } from "@/db/schema";
import { requireAdminOrClub, isError } from "@/lib/api-auth";
import { eq } from "drizzle-orm";
import { sendTelegram, escTg } from "@/lib/telegram";

/** POST /api/bug-reports — submit a bug. Auth: any admin or club user. */
export async function POST(req: NextRequest) {
  const session = await requireAdminOrClub();
  if (isError(session)) return session;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const b = body as Record<string, unknown>;
  const title = typeof b.title === "string" ? b.title.trim() : "";
  const description = typeof b.description === "string" ? b.description.trim() : "";
  const severity = b.severity as "low" | "medium" | "high" | "critical" | undefined;
  const pageUrl = typeof b.pageUrl === "string" ? b.pageUrl : "";
  const pagePath = typeof b.pagePath === "string" ? b.pagePath : "";
  const userAgent = typeof b.userAgent === "string" ? b.userAgent.slice(0, 1000) : null;
  const viewport = typeof b.viewport === "string" ? b.viewport.slice(0, 20) : null;
  const locale = typeof b.locale === "string" ? b.locale.slice(0, 5) : null;
  const consoleSnapshot = Array.isArray(b.consoleSnapshot) ? b.consoleSnapshot.slice(0, 50) : null;
  const screenshotUrl = typeof b.screenshotUrl === "string" ? b.screenshotUrl : null;

  if (!title || title.length > 200) {
    return NextResponse.json({ error: "title required (1–200 chars)" }, { status: 400 });
  }
  if (!description || description.length > 5000) {
    return NextResponse.json({ error: "description required (1–5000 chars)" }, { status: 400 });
  }
  if (!pageUrl || !pagePath) {
    return NextResponse.json({ error: "pageUrl and pagePath required" }, { status: 400 });
  }
  const severityOk = ["low", "medium", "high", "critical"].includes(severity ?? "");
  if (!severityOk) {
    return NextResponse.json({ error: "invalid severity" }, { status: 400 });
  }

  // Lookup reporter name/email (snapshot — survives later user deletion).
  // reporterId's FK only points at admin_users, so club reporters keep it
  // null and rely on the email/name snapshot below.
  let reporterId: number | null = null;
  let reporterEmail: string;
  let reporterName: string;

  if (session.role === "admin") {
    const reporter = await db.query.adminUsers.findFirst({
      where: eq(adminUsers.id, session.userId),
      columns: { id: true, email: true, name: true },
    });
    if (!reporter) {
      return NextResponse.json({ error: "Reporter not found" }, { status: 404 });
    }
    reporterId = reporter.id;
    reporterEmail = reporter.email;
    reporterName = reporter.name;
  } else {
    const reporter = await db.query.clubUsers.findFirst({
      where: eq(clubUsers.id, session.userId),
      columns: { email: true, name: true },
    });
    if (!reporter) {
      return NextResponse.json({ error: "Reporter not found" }, { status: 404 });
    }
    reporterEmail = reporter.email;
    reporterName = reporter.name ?? reporter.email;
  }

  const [inserted] = await db
    .insert(bugReports)
    .values({
      organizationId: session.organizationId ?? null,
      reporterId,
      reporterEmail,
      reporterName,
      title,
      description,
      severity: severity!,
      pageUrl: pageUrl.slice(0, 2000),
      pagePath: pagePath.slice(0, 500),
      userAgent,
      viewport,
      locale,
      consoleSnapshot: consoleSnapshot as unknown,
      screenshotUrl,
    })
    .returning({ id: bugReports.id });

  // Fire-and-forget Telegram — do not block client response on it.
  void notifyTelegram({
    id: inserted.id,
    title,
    description,
    severity: severity!,
    reporter: `${reporterName} <${reporterEmail}>`,
    pageUrl,
    screenshotUrl,
  });

  return NextResponse.json({ id: inserted.id, ok: true }, { status: 201 });
}

const SEVERITY_BADGE: Record<string, string> = {
  low: "🟢 LOW",
  medium: "🟡 MEDIUM",
  high: "🟠 HIGH",
  critical: "🔴 CRITICAL",
};

async function notifyTelegram(input: {
  id: number;
  title: string;
  description: string;
  severity: string;
  reporter: string;
  pageUrl: string;
  screenshotUrl: string | null;
}) {
  const lines = [
    `${SEVERITY_BADGE[input.severity] ?? input.severity} <b>#${input.id} ${escTg(input.title)}</b>`,
    "",
    escTg(input.description.slice(0, 1500)),
    "",
    `👤 ${escTg(input.reporter)}`,
    `📍 <a href="${escTg(input.pageUrl)}">${escTg(input.pageUrl)}</a>`,
  ];
  if (input.screenshotUrl) {
    lines.push(`🖼 screenshot: ${escTg(input.screenshotUrl)}`);
  }
  await sendTelegram(lines.join("\n"));
}

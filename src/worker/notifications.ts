/**
 * Notification drain worker — polls notification_queue and sends emails.
 *
 * Runs in-process as a setInterval loop started from instrumentation.ts.
 * Survives across requests because the Next.js server process is long-lived
 * on the VPS deploy. For serverless deployments, swap this for an external
 * cron → /api/internal/drain-notifications pattern.
 */

import { and, asc, eq, lt } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  clubUsers,
  notificationQueue,
  teams,
  tournamentRegistrations,
  tournaments,
} from "@/db/schema";

// Separate transporter import to avoid circular deps with email templates.
import nodemailer from "nodemailer";

const smtpPort = Number(process.env.SMTP_PORT ?? 587);
const mailer = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: smtpPort,
  secure: smtpPort === 465,
  requireTLS: smtpPort === 587,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: { rejectUnauthorized: false },
});

const FROM = process.env.SMTP_FROM ?? "Goality <goal@goality.app>";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "https://goality.app";

const MAX_ATTEMPTS = 5;
const BATCH_SIZE = 20;

let isDraining = false;
let draining = false;

/**
 * Starts the drain loop. Safe to call multiple times — idempotent.
 * Polls every 10 seconds.
 */
export function startNotificationDrain(): void {
  if (isDraining) return;
  isDraining = true;
  // Initial kick + recurring interval.
  void drainOnce();
  setInterval(() => {
    void drainOnce();
  }, 10_000);
}

async function drainOnce(): Promise<void> {
  if (draining) return;
  draining = true;
  try {
    const rows = await db
      .select()
      .from(notificationQueue)
      .where(
        and(eq(notificationQueue.status, "pending"), lt(notificationQueue.attempts, MAX_ATTEMPTS)),
      )
      .orderBy(asc(notificationQueue.createdAt))
      .limit(BATCH_SIZE);

    for (const row of rows) {
      try {
        await processRow(row);
        await db
          .update(notificationQueue)
          .set({ status: "sent", sentAt: new Date() })
          .where(eq(notificationQueue.id, row.id));
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        const nextAttempt = row.attempts + 1;
        await db
          .update(notificationQueue)
          .set({
            status: nextAttempt >= MAX_ATTEMPTS ? "failed" : "pending",
            attempts: nextAttempt,
            lastError: msg,
          })
          .where(eq(notificationQueue.id, row.id));
      }
    }
  } catch (err) {
    console.error("[notification-drain] loop error:", err);
  } finally {
    draining = false;
  }
}

async function processRow(row: {
  id: number;
  kind: string;
  tournamentId: number;
  targetType: string;
  targetId: number;
  payload: unknown;
}): Promise<void> {
  if (row.kind !== "schedule_changed") return; // ignore other kinds for now
  if (row.targetType !== "team") return;

  // Look up team → club contact email
  const [team] = await db.select().from(teams).where(eq(teams.id, row.targetId));
  if (!team) return;
  const [club] = await db.select().from(clubs).where(eq(clubs.id, team.clubId));
  if (!club) return;

  // Look up club users: prefer the club admin (team_id null) then the team coach.
  const users = await db.select().from(clubUsers).where(eq(clubUsers.clubId, club.id));
  const clubAdmin = users.find((u) => u.teamId == null);
  const teamCoach = users.find((u) => u.teamId === row.targetId);
  const recipient = teamCoach ?? clubAdmin;
  if (!recipient) return;

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, row.tournamentId));
  if (!tournament) return;

  const subject = `Schedule updated — ${tournament.name}`;
  const scheduleUrl = `${APP_URL}/en/t/${tournament.slug}/schedule`;
  const text = [
    `Hello ${recipient.name ?? "coach"},`,
    ``,
    `The match schedule for ${tournament.name} has been updated.`,
    `Please review your team's upcoming matches at:`,
    scheduleUrl,
    ``,
    `— Goality`,
  ].join("\n");

  await mailer.sendMail({
    from: FROM,
    to: recipient.email,
    subject,
    text,
    html: `<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;color:#0a0f1e;padding:24px;background:#f0f2f5;">
      <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:12px;padding:32px;">
        <h2 style="margin-top:0;">Schedule updated</h2>
        <p>Hello ${recipient.name ?? "coach"},</p>
        <p>The match schedule for <strong>${tournament.name}</strong> has been updated. Please review your team's upcoming matches.</p>
        <p style="margin:24px 0;">
          <a href="${scheduleUrl}" style="display:inline-block;padding:12px 24px;background:#e8b84b;color:#0a0f1e;text-decoration:none;border-radius:8px;font-weight:700;">View schedule →</a>
        </p>
        <p style="color:#6b7280;font-size:13px;">— Goality</p>
      </div>
    </body></html>`,
  });
}

/**
 * Retention sweep — removes old what-if runs + stale notification rows.
 * Called periodically alongside drain.
 */
export function startRetentionSweep(): void {
  setInterval(() => {
    void retentionSweepOnce();
  }, 6 * 60 * 60 * 1000); // every 6 hours
}

async function retentionSweepOnce(): Promise<void> {
  try {
    const now = Date.now();
    // Sent notifications older than 7 days → delete
    const sentCutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
    await db
      .delete(notificationQueue)
      .where(and(eq(notificationQueue.status, "sent"), lt(notificationQueue.sentAt, sentCutoff)));
    // TODO: schedule_runs retention — not deleted yet
    void tournamentRegistrations; // marker for future broader sweeps
  } catch (err) {
    console.error("[retention-sweep] error:", err);
  }
}

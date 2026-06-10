/**
 * Notification drain worker — polls notification_queue and sends emails.
 *
 * Runs in-process as a setInterval loop started from instrumentation.ts.
 * Survives across requests because the Next.js server process is long-lived
 * on the VPS deploy. For serverless deployments, swap this for an external
 * cron → /api/internal/drain-notifications pattern.
 */

import { and, asc, eq, lt, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import {
  clubs,
  clubUsers,
  notificationQueue,
  organizations,
  teams,
  tournamentFollowers,
  tournamentNews,
  tournamentRegistrations,
  tournaments,
} from "@/db/schema";

import { Resend } from "resend";
import { sendTournamentNewsEmail } from "@/lib/email";

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM ?? "Goality <noreply@goalityfootball.com>";
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
  // ─── Tournament news (Follow feature) ───────────────────────
  // Sibling branch added ABOVE the existing schedule_changed
  // filter so the legacy code path is byte-identical when its
  // kind matches.
  if (row.kind === "tournament_news_published") {
    await processTournamentNewsRow(row);
    return;
  }

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

  const { error } = await resend.emails.send({
    from: FROM,
    to: [recipient.email],
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
  if (error) throw error;
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

// ────────────────────────────────────────────────────────────────
// Tournament News — Follow feature (V1)
// ────────────────────────────────────────────────────────────────

/**
 * Process a `tournament_news_published` queue row.
 *
 * Payload: { newsId, unsubscribeToken } — everything else is re-fetched
 * at send time so the latest post content (and recipient's preferred
 * locale) goes out, even if the publish event was queued earlier.
 *
 * Skips silently if the news was unpublished/archived between enqueue
 * and now — the next sweep will purge sent rows; the unpublished post
 * simply doesn't go out.
 */
async function processTournamentNewsRow(row: {
  id: number;
  tournamentId: number;
  targetType: string;
  targetId: number;
  payload: unknown;
}): Promise<void> {
  if (row.targetType !== "club") return;

  const payload = row.payload as { newsId?: number; unsubscribeToken?: string } | null;
  const newsId = payload?.newsId;
  const token = payload?.unsubscribeToken;
  if (!newsId || !token) return;

  // News post — must still be published.
  const [news] = await db
    .select()
    .from(tournamentNews)
    .where(eq(tournamentNews.id, newsId));
  if (!news || news.status !== "published") return;

  // Recipient club — preferredLocale drives email language.
  const [club] = await db.select().from(clubs).where(eq(clubs.id, row.targetId));
  if (!club || !club.contactEmail) return;

  // Follower row may have been deleted (unfollow between enqueue and
  // drain). Verify before sending so we don't email someone who just
  // opted out. The token must still match the current follower row.
  const [follower] = await db
    .select()
    .from(tournamentFollowers)
    .where(
      and(
        eq(tournamentFollowers.clubId, club.id),
        eq(tournamentFollowers.tournamentId, row.tournamentId),
      ),
    );
  if (!follower || follower.unsubscribeToken !== token) return;

  const [tournament] = await db
    .select()
    .from(tournaments)
    .where(eq(tournaments.id, row.tournamentId));
  if (!tournament) return;

  const [org] = await db
    .select()
    .from(organizations)
    .where(eq(organizations.id, tournament.organizationId));
  if (!org) return;

  const locale = club.preferredLocale ?? org.defaultLocale ?? "en";
  const postUrl = `${APP_URL}/${locale}/t/${org.slug}/${tournament.slug}/news/${news.id}`;
  const unsubscribeUrl = `${APP_URL}/api/unsubscribe/news/${token}`;

  await sendTournamentNewsEmail({
    to: club.contactEmail,
    clubName: club.name,
    locale,
    tournamentName: tournament.name,
    newsSubject: news.subject,
    newsBodyMarkdown: news.bodyMarkdown,
    coverUrl: news.coverUrl,
    ctaLabel: news.ctaLabel,
    ctaUrl: news.ctaUrl,
    postUrl,
    unsubscribeUrl,
  });
}

/**
 * Scheduled news publisher — flips `tournament_news` rows from
 * "scheduled" → "published" once `publishAt` is reached, and fan-outs
 * one notificationQueue row per follower.
 *
 * Runs every 60s — finer granularity isn't worth the load, since
 * "in a minute" is acceptable accuracy for a news announcement.
 *
 * The predicate (status=scheduled AND publishAt<=now) becomes false
 * after the flip, so duplicate publishes are physically impossible.
 */
let scheduledNewsPublishing = false;
let scheduledNewsLoopStarted = false;

export function startScheduledNewsPublisher(): void {
  if (scheduledNewsLoopStarted) return;
  scheduledNewsLoopStarted = true;
  void scheduledNewsTickOnce();
  setInterval(() => {
    void scheduledNewsTickOnce();
  }, 60_000);
}

async function scheduledNewsTickOnce(): Promise<void> {
  if (scheduledNewsPublishing) return;
  scheduledNewsPublishing = true;
  try {
    const due = await db
      .select()
      .from(tournamentNews)
      .where(
        and(
          eq(tournamentNews.status, "scheduled"),
          isNotNull(tournamentNews.publishAt),
          lte(tournamentNews.publishAt, new Date()),
        ),
      )
      .limit(20);

    for (const post of due) {
      try {
        await publishNewsPost(post.id);
      } catch (err) {
        console.error(
          `[scheduled-news] failed to publish post ${post.id}:`,
          err instanceof Error ? err.message : err,
        );
      }
    }
  } catch (err) {
    console.error("[scheduled-news] tick error:", err);
  } finally {
    scheduledNewsPublishing = false;
  }
}

/**
 * Promote a news post to published status and enqueue email
 * notifications for every follower of the tournament.
 *
 * Safe to call from both the admin "Publish now" handler and the
 * scheduled publisher tick — the status check makes it idempotent
 * (already-published post returns without re-enqueueing).
 *
 * Exported so the org admin route can reuse the exact same code path
 * → single source of truth for "publish + fan-out".
 */
export async function publishNewsPost(newsId: number): Promise<{
  status: "published" | "noop";
  enqueued: number;
}> {
  const [post] = await db
    .select()
    .from(tournamentNews)
    .where(eq(tournamentNews.id, newsId));
  if (!post) throw new Error(`News post ${newsId} not found`);
  if (post.status === "published") return { status: "noop", enqueued: 0 };
  if (post.status === "archived") {
    throw new Error(`Cannot publish archived post ${newsId}`);
  }

  // 1) Flip status atomically — guarded by current status so a
  // concurrent caller can't double-flip.
  const updated = await db
    .update(tournamentNews)
    .set({ status: "published", publishedAt: new Date(), publishAt: null, updatedAt: new Date() })
    .where(and(eq(tournamentNews.id, newsId), eq(tournamentNews.status, post.status)))
    .returning({ id: tournamentNews.id });
  if (updated.length === 0) return { status: "noop", enqueued: 0 };

  // 2) Fan-out — one queue row per follower. The worker drains
  // independently; this handler just enqueues.
  const followers = await db
    .select()
    .from(tournamentFollowers)
    .where(eq(tournamentFollowers.tournamentId, post.tournamentId));

  if (followers.length > 0) {
    await db.insert(notificationQueue).values(
      followers.map((f) => ({
        kind: "tournament_news_published",
        tournamentId: post.tournamentId,
        targetType: "club",
        targetId: f.clubId,
        payload: { newsId: post.id, unsubscribeToken: f.unsubscribeToken },
        status: "pending",
      })),
    );
  }

  return { status: "published", enqueued: followers.length };
}

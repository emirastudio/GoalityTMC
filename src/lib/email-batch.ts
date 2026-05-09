import { sendRegistrationConfirmed, sendRegistrationRejected, sendRegistrationConfirmedBatch, sendRegistrationRejectedBatch } from "./email";

// In-process debounce queue for status-change notifications. When the
// organizer flips multiple teams from open → confirmed (or rejected)
// within `DEBOUNCE_MS`, we want ONE summary email per club instead of
// N separate ones — Apple Mail's Junk filter classifies the latter as
// bulk spam, and the user has to dig for the messages.
//
// Trade-off: if the Node process restarts during the debounce window
// the buffered notifications are lost. We accept that for now —
// status_changed is a rare admin action, prod restarts are rare, and
// the worst case is "no email" (the DB row is still confirmed). A
// durable-queue rewrite would be sqs/redis territory, premature here.

type Status = "confirmed" | "rejected";

interface TeamEntry {
  teamId: number;
  teamLabel: string;
  className: string | null;
  notes: string | null;
  // Single-team fallback fields — used when only one team ever
  // arrives in the window so we keep the richer single-team template.
  tournamentSlug?: string | null;
}

interface PendingBatch {
  status: Status;
  to: string;
  clubName: string;
  tournamentName: string;
  locale: string;
  teams: Map<number, TeamEntry>;
  timer: ReturnType<typeof setTimeout>;
}

const DEBOUNCE_MS = 30_000;
const pending = new Map<string, PendingBatch>();

function key(clubId: number, tournamentId: number, status: Status) {
  return `${clubId}|${tournamentId}|${status}`;
}

/**
 * Schedule (or extend) a confirmation/rejection notification.
 * The first call within a window opens a 30-second timer; every
 * subsequent call for the same (club, tournament, status) merges its
 * team into the same buffer and resets the timer. The timer's flush
 * dispatches a single email — single-team template for n=1, batch
 * template for n>1.
 */
export function scheduleStatusEmail(opts: {
  clubId: number;
  tournamentId: number;
  status: Status;
  to: string;
  clubName: string;
  tournamentName: string;
  locale: string;
  teamId: number;
  teamLabel: string;
  className: string | null;
  notes: string | null;
  tournamentSlug?: string | null;
}) {
  const k = key(opts.clubId, opts.tournamentId, opts.status);
  const existing = pending.get(k);
  if (existing) {
    clearTimeout(existing.timer);
    existing.teams.set(opts.teamId, {
      teamId: opts.teamId,
      teamLabel: opts.teamLabel,
      className: opts.className,
      notes: opts.notes,
      tournamentSlug: opts.tournamentSlug ?? null,
    });
    existing.timer = setTimeout(() => flush(k), DEBOUNCE_MS);
    return;
  }
  const batch: PendingBatch = {
    status: opts.status,
    to: opts.to,
    clubName: opts.clubName,
    tournamentName: opts.tournamentName,
    locale: opts.locale,
    teams: new Map([[opts.teamId, {
      teamId: opts.teamId,
      teamLabel: opts.teamLabel,
      className: opts.className,
      notes: opts.notes,
      tournamentSlug: opts.tournamentSlug ?? null,
    }]]),
    timer: setTimeout(() => flush(k), DEBOUNCE_MS),
  };
  pending.set(k, batch);
}

async function flush(k: string) {
  const batch = pending.get(k);
  if (!batch) return;
  pending.delete(k);
  const teams = [...batch.teams.values()];
  console.log(`[EMAIL-BATCH] flushing ${batch.status} → ${batch.to} (${teams.length} team${teams.length === 1 ? "" : "s"}, locale=${batch.locale})`);
  try {
    if (teams.length === 1) {
      const only = teams[0];
      const payload = {
        to: batch.to,
        clubName: batch.clubName,
        teamName: only.teamLabel,
        tournamentName: batch.tournamentName,
        notes: only.notes,
        locale: batch.locale,
      };
      if (batch.status === "confirmed") {
        await sendRegistrationConfirmed({ ...payload, tournamentSlug: only.tournamentSlug });
      } else {
        await sendRegistrationRejected(payload);
      }
    } else {
      const payload = {
        to: batch.to,
        clubName: batch.clubName,
        tournamentName: batch.tournamentName,
        locale: batch.locale,
        teams: teams.map((tm) => ({
          teamLabel: tm.teamLabel,
          className: tm.className,
          notes: tm.notes,
        })),
      };
      if (batch.status === "confirmed") {
        await sendRegistrationConfirmedBatch({ ...payload, tournamentSlug: teams[0].tournamentSlug });
      } else {
        await sendRegistrationRejectedBatch(payload);
      }
    }
    console.log(`[EMAIL-BATCH] sent OK to ${batch.to}`);
  } catch (e) {
    console.error("[EMAIL-BATCH] flush failed:", e);
  }
}

"use client";

/**
 * DivisionSetupWizard — the guided "even a child gets it" layer over the
 * division setup. A linear 4-step progression (teams → draw → schedule →
 * publish); each step shows plain-language status and ONE action that runs
 * in place:
 *   - draw:     shuffle teams into the group + apply-draw (single group)
 *   - schedule: solve from the saved config + stadium hours, then apply
 *   - publish:  POST/DELETE schedule/publish
 * The existing tabs/planner stay as the advanced surface — nothing is hidden.
 */

import { useState, useEffect, useCallback, useMemo } from "react";
import { useTranslations } from "next-intl";
import {
  Users, Shuffle, CalendarClock, Send,
  Check, ArrowRight, Loader2, AlertCircle,
} from "lucide-react";
import { Link } from "@/i18n/navigation";
import { computeSetupSteps, type SetupState, type SetupStepKey } from "@/lib/setup-steps";

type Props = {
  base: string;
  classId: number | null;
  orgSlug: string;
  tournamentId: number;
  /** Switch the parent to the draw tab (manual multi-group draw fallback). */
  onGoToDraw: () => void;
};

type StageInfo = { stageId: number | null; groupIds: number[]; singleGroup: boolean };
type StageRow = { id: number; type?: string | null; groups?: { id: number }[] };

const STEP_ICON: Record<SetupStepKey, typeof Users> = {
  teams: Users, draw: Shuffle, schedule: CalendarClock, publish: Send,
};

const STEP_N: Record<SetupStepKey, number> = { teams: 1, draw: 2, schedule: 3, publish: 4 };

export function DivisionSetupWizard({ base, classId, orgSlug, tournamentId, onGoToDraw }: Props) {
  const t = useTranslations("schedule");
  const [state, setState] = useState<SetupState | null>(null);
  const [stage, setStage] = useState<StageInfo>({ stageId: null, groupIds: [], singleGroup: false });
  const [teamIds, setTeamIds] = useState<number[]>([]);
  const [busy, setBusy] = useState<null | "draw" | "schedule" | "publish">(null);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(async (): Promise<SetupState | null> => {
    const q = classId ? `?classId=${classId}` : "";
    try {
      const [mRes, tRes, pRes, sRes] = await Promise.all([
        fetch(`${base}/matches${q}`, { credentials: "include", cache: "no-store" }),
        fetch(`${base}/teams${q}`, { credentials: "include", cache: "no-store" }),
        fetch(`${base}/schedule/publish`, { credentials: "include", cache: "no-store" }),
        fetch(`${base}/stages${q}`, { credentials: "include", cache: "no-store" }),
      ]);
      const matches = mRes.ok ? await mRes.json() : [];
      const teams = tRes.ok ? await tRes.json() : [];
      const pub = pRes.ok ? await pRes.json() : { published: false };
      const stages = sRes.ok ? await sRes.json() : [];
      const arr = Array.isArray(matches) ? matches : [];
      const teamArr = Array.isArray(teams) ? teams : [];

      const stageList: StageRow[] = Array.isArray(stages) ? stages : [];
      const gStage = stageList.find(
        (s) => s.type === "group" || s.type === "groups" || s.type === "league",
      );
      const groups = gStage?.groups ?? [];
      setStage({
        stageId: gStage?.id ?? null,
        groupIds: groups.map((g: { id: number }) => g.id),
        singleGroup: groups.length === 1,
      });
      setTeamIds(teamArr.map((x: { id: number }) => x.id));

      const st: SetupState = {
        confirmedTeams: teamArr.length,
        totalMatches: arr.length,
        matchesWithTeams: arr.filter((m: { homeTeamId?: number | null; awayTeamId?: number | null }) => m.homeTeamId && m.awayTeamId).length,
        scheduledMatches: arr.filter((m: { scheduledAt?: string | null }) => m.scheduledAt).length,
        published: !!pub.published,
      };
      setState(st);
      return st;
    } catch {
      return null;
    }
  }, [base, classId]);

  useEffect(() => { void load(); }, [load]);

  const plan = useMemo(() => (state ? computeSetupSteps(state) : null), [state]);

  // ── Actions ──────────────────────────────────────────────────────────
  async function doDraw() {
    // Multi-group / no stage → send the organizer to the manual draw tab.
    if (!stage.stageId || !stage.singleGroup || teamIds.length < 2) {
      onGoToDraw();
      return;
    }
    setBusy("draw"); setNote(null);
    try {
      const gRes = await fetch(`${base}/stages/${stage.stageId}/groups/${stage.groupIds[0]}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Draw-Unlock": "CONFIRM" },
        credentials: "include",
        body: JSON.stringify({ teamIds: shuffle(teamIds), mode: "replace" }),
      });
      if (!gRes.ok) { setNote(t("wizardActionError")); return; }
      const aRes = await fetch(`${base}/stages/${stage.stageId}/apply-draw`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: "{}",
      });
      if (!aRes.ok) { setNote(t("wizardActionError")); return; }
      const st = await load();
      if (st && st.matchesWithTeams < st.totalMatches) setNote(t("wizardDrawPartial"));
    } catch {
      setNote(t("wizardActionError"));
    } finally {
      setBusy(null);
    }
  }

  async function doSchedule() {
    setBusy("schedule"); setNote(null);
    try {
      const solveRes = await fetch(`${base}/schedule/solve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ classId }),
      });
      const solveData = await solveRes.json().catch(() => ({}));
      if (solveRes.ok && solveData.runId && solveData.status === "succeeded") {
        const applyRes = await fetch(`${base}/schedule/runs/${solveData.runId}/apply`, {
          method: "POST",
          credentials: "include",
        });
        if (!applyRes.ok) { setNote(t("wizardScheduleFailed")); return; }
        const st = await load();
        if (st && st.scheduledMatches < st.totalMatches) {
          setNote(t("wizardScheduleUnplaced", { count: st.totalMatches - st.scheduledMatches }));
        }
      } else {
        setNote(t("wizardScheduleFailed"));
      }
    } catch {
      setNote(t("wizardScheduleFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function setPublish(publish: boolean) {
    setBusy("publish"); setNote(null);
    try {
      await fetch(`${base}/schedule/publish`, {
        method: publish ? "POST" : "DELETE",
        credentials: "include",
      });
      await load();
    } finally {
      setBusy(null);
    }
  }

  if (!state || !plan) return null;

  const cls = classId ? `?classId=${classId}` : "";
  const teamsHref = `/org/${orgSlug}/admin/tournament/${tournamentId}/teams${cls}`;
  const formatHref = `/org/${orgSlug}/admin/tournament/${tournamentId}/format${cls}`;
  const plannerHref = `/org/${orgSlug}/admin/tournament/${tournamentId}/planner${cls}`;

  return (
    <div className="rounded-2xl border p-4" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
      {/* Stepper */}
      <div className="grid grid-cols-4 gap-2 mb-3">
        {plan.steps.map((s) => {
          const Icon = STEP_ICON[s.key];
          const isDone = s.status === "done";
          const isCurrent = s.status === "current";
          return (
            <div key={s.key} className="rounded-xl p-2.5 text-center border"
              style={{
                background: isCurrent ? "var(--cat-tag-bg)" : "transparent",
                borderColor: isCurrent ? "var(--cat-accent)" : "var(--cat-card-border)",
                opacity: s.status === "todo" ? 0.55 : 1,
              }}>
              <div className="w-7 h-7 rounded-full flex items-center justify-center mx-auto mb-1.5 text-xs font-black"
                style={{
                  background: isDone ? "#2BFEBA" : isCurrent ? "var(--cat-accent)" : "var(--cat-tag-bg)",
                  color: isDone || isCurrent ? "#05221a" : "var(--cat-text-muted)",
                }}>
                {isDone ? <Check className="w-4 h-4" /> : STEP_N[s.key]}
              </div>
              <div className="text-xs font-bold flex items-center justify-center gap-1" style={{ color: "var(--cat-text)" }}>
                <Icon className="w-3 h-3" /> {t(`wizardStep_${s.key}`)}
              </div>
            </div>
          );
        })}
      </div>

      {/* Current step / done panel */}
      {plan.allDone ? (
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "rgba(43,254,186,0.06)", border: "1px solid rgba(43,254,186,0.3)" }}>
          <Check className="w-5 h-5 shrink-0" style={{ color: "#2BFEBA" }} />
          <p className="text-sm font-bold flex-1" style={{ color: "#2BFEBA" }}>{t("wizardAllDone")}</p>
          <button onClick={() => setPublish(false)} disabled={busy === "publish"}
            className="text-xs font-bold underline-offset-2 hover:underline disabled:opacity-50" style={{ color: "var(--cat-text-muted)" }}>
            {busy === "publish" ? "…" : t("wizardUnpublish")}
          </button>
        </div>
      ) : (
        <div className="rounded-xl p-3.5" style={{ background: "var(--cat-tag-bg)", border: "1px solid var(--cat-card-border)" }}>
          <div className="text-[11px] font-bold uppercase tracking-widest mb-0.5" style={{ color: "var(--cat-text-muted)" }}>
            {t("wizardStepOf", { n: STEP_N[plan.currentKey!] })}
          </div>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="min-w-0">
              <div className="text-lg font-black" style={{ color: "var(--cat-text)" }}>
                {t(`wizardQ_${plan.currentKey}`)}
              </div>
              <div className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>
                {stepHint(plan.currentKey!, state, t)}
              </div>
            </div>
            <div className="shrink-0 flex items-center gap-3">
              {plan.currentKey === "teams" && (
                <PrimaryLink href={teamsHref} label={t("wizardCta_teams")} />
              )}
              {plan.currentKey === "draw" && (
                state.totalMatches === 0
                  ? <PrimaryLink href={formatHref} label={t("wizardCta_format")} />
                  : <>
                      <PrimaryButton onClick={doDraw} label={t("wizardCta_draw")} busy={busy === "draw"} />
                      <AdvancedLink onClick={onGoToDraw} label={t("wizardCta_manualDraw")} />
                    </>
              )}
              {plan.currentKey === "schedule" && (
                <>
                  <PrimaryButton onClick={doSchedule} label={t("wizardCta_schedule")} busy={busy === "schedule"} />
                  <AdvancedHref href={plannerHref} label={t("wizardCta_planner")} />
                </>
              )}
              {plan.currentKey === "publish" && (
                <PrimaryButton onClick={() => setPublish(true)} label={t("wizardCta_publish")} busy={busy === "publish"} />
              )}
            </div>
          </div>

          {note && (
            <div className="mt-2.5 flex items-center gap-1.5 text-xs" style={{ color: "#f59e0b" }}>
              <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function stepHint(key: SetupStepKey, s: SetupState, t: ReturnType<typeof useTranslations>): string {
  switch (key) {
    case "teams": return t("wizardHint_teams", { count: s.confirmedTeams });
    case "draw": return s.totalMatches === 0 ? t("wizardHint_noFormat") : t("wizardHint_draw");
    case "schedule": return t("wizardHint_schedule", { done: s.scheduledMatches, total: s.totalMatches });
    case "publish": return t("wizardHint_publish");
  }
}

function PrimaryButton({ onClick, label, busy }: { onClick: () => void; label: string; busy: boolean }) {
  return (
    <button onClick={onClick} disabled={busy}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90 disabled:opacity-50"
      style={{ background: "var(--cat-accent)", color: "#05221a" }}>
      {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
      {label} {!busy && <ArrowRight className="w-4 h-4" />}
    </button>
  );
}

function PrimaryLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href}
      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
      style={{ background: "var(--cat-accent)", color: "#05221a" }}>
      {label} <ArrowRight className="w-4 h-4" />
    </Link>
  );
}

function AdvancedLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="text-xs font-semibold underline-offset-2 hover:underline" style={{ color: "var(--cat-text-muted)" }}>
      {label}
    </button>
  );
}

function AdvancedHref({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="text-xs font-semibold underline-offset-2 hover:underline" style={{ color: "var(--cat-text-muted)" }}>
      {label}
    </Link>
  );
}

/** Unbiased Fisher–Yates shuffle for a genuine random draw. */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

"use client";

/**
 * DrawWizard — inline form on the /draw landing where anonymous visitors
 * set up their draw before launching the stage.
 *
 * Inputs:
 *   • Team list (textarea, one per line — matches how people copy from Excel)
 *   • Mode: groups | playoff
 *   • Group count (2–8) when mode === "groups"
 *
 * On submit the component encodes everything into a ShareableDrawState,
 * base64url-encodes it, and navigates the page to /[locale]/draw/present?s=…
 * The presentation route decodes the same state and drives the stage. No
 * database; everything lives in the URL so share-links round-trip.
 */

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { ArrowRight, ListChecks, Shuffle, Users, Layers } from "lucide-react";
import { encodeDrawState } from "@/lib/draw-show/encode-state";
import type { ShareableDrawState } from "@/lib/draw-show/types";

// Cap team count at a level where the share-URL still fits comfortably
// in common platform limits (~2 KB). Beyond this, the UX of a paste-a-
// list flow breaks down anyway.
const MAX_TEAMS = 64;
const MIN_TEAMS = 2;

type Mode = "groups" | "playoff";

export function DrawWizard({ id }: { id?: string }) {
  const t = useTranslations("drawWizard");
  const router = useRouter();

  const [rawTeams, setRawTeams] = useState("");
  const [mode, setMode] = useState<Mode>("groups");
  const [groupCount, setGroupCount] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const teams = useMemo(
    () =>
      rawTeams
        .split("\n")
        .map((s) => s.trim())
        .filter((s) => s.length > 0),
    [rawTeams],
  );

  // ── Validation ────────────────────────────────────────────────────
  const issues: string[] = [];
  if (teams.length > 0 && teams.length < MIN_TEAMS) {
    issues.push(t("errorTooFew", { min: MIN_TEAMS }));
  }
  if (teams.length > MAX_TEAMS) {
    issues.push(t("errorTooMany", { max: MAX_TEAMS }));
  }
  if (mode === "playoff" && teams.length > 0 && teams.length % 2 !== 0) {
    issues.push(t("errorPlayoffOdd"));
  }
  if (mode === "groups" && teams.length > 0 && teams.length < groupCount) {
    issues.push(
      t("errorFewerTeamsThanGroups", { teams: teams.length, groups: groupCount }),
    );
  }

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dup: string[] = [];
    for (const name of teams) {
      const key = name.toLowerCase();
      if (seen.has(key) && !dup.includes(name)) dup.push(name);
      seen.add(key);
    }
    return dup;
  }, [teams]);
  if (duplicates.length > 0) {
    issues.push(t("errorDuplicates", { names: duplicates.slice(0, 3).join(", ") }));
  }

  const canSubmit = teams.length >= MIN_TEAMS && issues.length === 0;

  // ── Submit: build state → encode → navigate ───────────────────────
  function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      // Stable id per team, derived from its slug position so the
      // share-link is reproducible when someone edits the pasted list.
      const state: ShareableDrawState = {
        v: 1,
        config: {
          mode,
          groupCount: mode === "groups" ? groupCount : undefined,
          seedingMode: "random",
          seed: Date.now().toString(36),
        },
        teams: teams.map((name, i) => ({
          id: `t${i}`,
          name,
        })),
      };
      const encoded = encodeDrawState(state);
      router.push(`/draw/present?s=${encoded}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "unknown error");
      setSubmitting(false);
    }
  }

  return (
    <section
      id={id}
      className="relative max-w-3xl mx-auto px-6 md:px-10 pb-16"
    >
      <div
        className="rounded-3xl p-6 md:p-8"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
        }}
      >
        <h2
          className="text-2xl md:text-3xl font-black mb-2"
          style={{ color: "var(--cat-text)" }}
        >
          {t("title")}
        </h2>
        <p
          className="text-sm mb-8"
          style={{ color: "var(--cat-text-muted)" }}
        >
          {t("subtitle")}
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* ── Teams ── */}
          <div>
            <LabelRow icon={<Users className="w-4 h-4" />}>
              {t("teamsLabel")}
              <CounterPill count={teams.length} />
            </LabelRow>
            <textarea
              value={rawTeams}
              onChange={(e) => setRawTeams(e.target.value)}
              placeholder={t("teamsPlaceholder")}
              rows={8}
              className="w-full rounded-2xl px-4 py-3 text-sm outline-none resize-y font-mono"
              style={{
                background: "var(--cat-input-bg, var(--cat-card-bg))",
                border: "1px solid var(--cat-card-border)",
                color: "var(--cat-text)",
                minHeight: 180,
              }}
            />
            <p
              className="text-xs mt-1.5"
              style={{ color: "var(--cat-text-muted)" }}
            >
              {t("teamsHint", { min: MIN_TEAMS, max: MAX_TEAMS })}
            </p>
          </div>

          {/* ── Mode ── */}
          <div>
            <LabelRow icon={<ListChecks className="w-4 h-4" />}>
              {t("modeLabel")}
            </LabelRow>
            <div className="grid grid-cols-2 gap-2">
              <ModeCard
                active={mode === "groups"}
                icon={<Layers className="w-4 h-4" />}
                title={t("modeGroups")}
                body={t("modeGroupsBody")}
                onClick={() => setMode("groups")}
              />
              <ModeCard
                active={mode === "playoff"}
                icon={<Shuffle className="w-4 h-4" />}
                title={t("modePlayoff")}
                body={t("modePlayoffBody")}
                onClick={() => setMode("playoff")}
              />
            </div>
          </div>

          {/* ── Groups count (mode=groups only) ── */}
          {mode === "groups" && (
            <div>
              <LabelRow icon={<Layers className="w-4 h-4" />}>
                {t("groupCountLabel")}
              </LabelRow>
              <div className="flex flex-wrap gap-2">
                {[2, 3, 4, 5, 6, 8].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setGroupCount(n)}
                    className="px-4 py-2 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
                    style={
                      groupCount === n
                        ? {
                            background: "var(--cat-accent)",
                            color: "var(--cat-accent-text)",
                          }
                        : {
                            background: "var(--cat-tag-bg)",
                            color: "var(--cat-text)",
                            border: "1px solid var(--cat-card-border)",
                          }
                    }
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* ── Issues / error ── */}
          {issues.length > 0 && (
            <div
              className="rounded-2xl px-4 py-3 space-y-1"
              style={{
                background: "rgba(245,158,11,0.06)",
                border: "1px solid rgba(245,158,11,0.3)",
              }}
            >
              {issues.map((msg, i) => (
                <p
                  key={i}
                  className="text-xs font-semibold leading-relaxed"
                  style={{ color: "#f59e0b" }}
                >
                  • {msg}
                </p>
              ))}
            </div>
          )}
          {error && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                background: "rgba(239,68,68,0.06)",
                border: "1px solid rgba(239,68,68,0.3)",
              }}
            >
              <p
                className="text-xs font-semibold"
                style={{ color: "#ef4444" }}
              >
                {error}
              </p>
            </div>
          )}

          {/* ── Submit ── */}
          <button
            type="submit"
            disabled={!canSubmit || submitting}
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl text-sm font-bold transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed disabled:scale-100"
            style={{
              background: "var(--cat-accent)",
              color: "var(--cat-accent-text)",
              boxShadow: canSubmit
                ? "0 8px 24px -6px rgba(43,254,186,0.4)"
                : undefined,
            }}
          >
            {submitting ? t("submitting") : t("submit")}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </section>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────

function LabelRow({
  icon,
  children,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <label
      className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest mb-2"
      style={{ color: "var(--cat-text-muted)" }}
    >
      <span style={{ color: "var(--cat-accent)" }}>{icon}</span>
      <span className="flex items-center gap-2">{children}</span>
    </label>
  );
}

function CounterPill({ count }: { count: number }) {
  return (
    <span
      className="text-[10px] font-black px-2 py-0.5 rounded-full normal-case tracking-normal"
      style={{
        background:
          count > 0 ? "rgba(43,254,186,0.15)" : "var(--cat-tag-bg)",
        color:
          count > 0 ? "var(--cat-accent)" : "var(--cat-text-muted)",
      }}
    >
      {count}
    </span>
  );
}

function ModeCard({
  active,
  icon,
  title,
  body,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  body: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="text-left rounded-2xl p-4 transition-all hover:opacity-90"
      style={{
        background: active
          ? "rgba(43,254,186,0.08)"
          : "var(--cat-tag-bg)",
        border: active
          ? "1px solid var(--cat-accent)"
          : "1px solid var(--cat-card-border)",
      }}
    >
      <div
        className="flex items-center gap-2 mb-1"
        style={{
          color: active ? "var(--cat-accent)" : "var(--cat-text-muted)",
        }}
      >
        {icon}
        <span className="text-sm font-black">{title}</span>
      </div>
      <p
        className="text-xs leading-relaxed"
        style={{ color: "var(--cat-text-muted)" }}
      >
        {body}
      </p>
    </button>
  );
}

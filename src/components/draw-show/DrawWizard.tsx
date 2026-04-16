"use client";

/**
 * DrawWizard — inline form where anonymous visitors set up their draw
 * before launching the stage.
 *
 * Two input modes:
 *   • Bulk paste: one team per line in a textarea (fastest, matches
 *     how most organizers have their list in Excel).
 *   • Detailed: row-by-row editor with logo URL, team name and country
 *     flag. Takes longer but produces a polished show.
 *
 * Three formats:
 *   • Group stage — N teams split across K groups.
 *   • League — round-robin, every team plays every other once.
 *   • Playoff pairs — N/2 head-to-head matches.
 *
 * On submit the component encodes the state to a URL and navigates to
 * /draw/present. No server state; no database. The shape is wide enough
 * that once server-side share-link storage lands, the encode step just
 * POSTs instead of base64-encoding.
 */

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowRight,
  ListChecks,
  Shuffle,
  Users,
  Layers,
  Rows3,
  Repeat,
  Trash2,
  Plus,
  Image as ImageIcon,
  Trophy,
} from "lucide-react";
import { encodeDrawState } from "@/lib/draw-show/encode-state";
import type { ShareableDrawState } from "@/lib/draw-show/types";

const MAX_TEAMS = 64;
const MIN_TEAMS = 2;
const MIN_GROUPS = 2;
const MAX_GROUPS = 16;

type Mode = "groups" | "playoff" | "league";
type InputMode = "bulk" | "detailed";

type DetailedRow = {
  id: string;
  name: string;
  countryCode: string;
  logoUrl: string;
};

// Common country codes offered in the detailed picker. Keeping the
// list short so the dropdown stays usable; users can type any ISO-2
// code manually. Extend as demand dictates.
const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: "",   label: "—" },
  { code: "EE", label: "🇪🇪 Estonia" },
  { code: "RU", label: "🇷🇺 Russia" },
  { code: "LV", label: "🇱🇻 Latvia" },
  { code: "LT", label: "🇱🇹 Lithuania" },
  { code: "FI", label: "🇫🇮 Finland" },
  { code: "SE", label: "🇸🇪 Sweden" },
  { code: "NO", label: "🇳🇴 Norway" },
  { code: "DK", label: "🇩🇰 Denmark" },
  { code: "PL", label: "🇵🇱 Poland" },
  { code: "DE", label: "🇩🇪 Germany" },
  { code: "FR", label: "🇫🇷 France" },
  { code: "ES", label: "🇪🇸 Spain" },
  { code: "IT", label: "🇮🇹 Italy" },
  { code: "NL", label: "🇳🇱 Netherlands" },
  { code: "PT", label: "🇵🇹 Portugal" },
  { code: "GB", label: "🇬🇧 UK" },
  { code: "IE", label: "🇮🇪 Ireland" },
  { code: "BE", label: "🇧🇪 Belgium" },
  { code: "CH", label: "🇨🇭 Switzerland" },
  { code: "AT", label: "🇦🇹 Austria" },
  { code: "CZ", label: "🇨🇿 Czechia" },
  { code: "SK", label: "🇸🇰 Slovakia" },
  { code: "HU", label: "🇭🇺 Hungary" },
  { code: "UA", label: "🇺🇦 Ukraine" },
  { code: "BY", label: "🇧🇾 Belarus" },
  { code: "TR", label: "🇹🇷 Turkey" },
  { code: "US", label: "🇺🇸 USA" },
  { code: "BR", label: "🇧🇷 Brazil" },
  { code: "AR", label: "🇦🇷 Argentina" },
  { code: "JP", label: "🇯🇵 Japan" },
];

function freshRow(): DetailedRow {
  return {
    id: `r${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
    name: "",
    countryCode: "",
    logoUrl: "",
  };
}

export function DrawWizard({ id }: { id?: string }) {
  const t = useTranslations("drawWizard");
  const router = useRouter();

  const [inputMode, setInputMode] = useState<InputMode>("bulk");
  const [rawTeams, setRawTeams] = useState("");
  const [detailedRows, setDetailedRows] = useState<DetailedRow[]>([
    freshRow(),
    freshRow(),
  ]);
  // Optional tournament branding shown in the stage header. All three
  // fields are free-form; an empty title just falls back to the default
  // "Tournament Draw" label.
  const [tournamentName, setTournamentName] = useState("");
  const [divisionName, setDivisionName] = useState("");
  const [tournamentLogoUrl, setTournamentLogoUrl] = useState("");
  const [mode, setMode] = useState<Mode>("groups");
  const [groupCount, setGroupCount] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Unified team list regardless of input mode. Detailed rows are
  // filtered to those with a non-empty name so a half-filled row
  // doesn't ruin validation. Bulk paste stays whitespace-split.
  const teams = useMemo(() => {
    if (inputMode === "detailed") {
      return detailedRows
        .map((r) => ({
          name: r.name.trim(),
          countryCode: r.countryCode.trim().toUpperCase() || undefined,
          logoUrl: r.logoUrl.trim() || undefined,
        }))
        .filter((r) => r.name.length > 0);
    }
    return rawTeams
      .split("\n")
      .map((s) => s.trim())
      .filter((s) => s.length > 0)
      .map((name) => ({ name, countryCode: undefined, logoUrl: undefined }));
  }, [inputMode, detailedRows, rawTeams]);

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
  if (mode === "groups" && (groupCount < MIN_GROUPS || groupCount > MAX_GROUPS)) {
    issues.push(t("errorGroupCountRange", { min: MIN_GROUPS, max: MAX_GROUPS }));
  }

  const duplicates = useMemo(() => {
    const seen = new Set<string>();
    const dup: string[] = [];
    for (const team of teams) {
      const key = team.name.toLowerCase();
      if (seen.has(key) && !dup.includes(team.name)) dup.push(team.name);
      seen.add(key);
    }
    return dup;
  }, [teams]);
  if (duplicates.length > 0) {
    issues.push(t("errorDuplicates", { names: duplicates.slice(0, 3).join(", ") }));
  }

  const canSubmit = teams.length >= MIN_TEAMS && issues.length === 0;

  // ── Detailed row operations ───────────────────────────────────────
  const addRow = () => setDetailedRows((rs) => [...rs, freshRow()]);
  const removeRow = (rowId: string) =>
    setDetailedRows((rs) =>
      rs.length > 1 ? rs.filter((r) => r.id !== rowId) : rs,
    );
  const updateRow = (rowId: string, patch: Partial<DetailedRow>) =>
    setDetailedRows((rs) =>
      rs.map((r) => (r.id === rowId ? { ...r, ...patch } : r)),
    );

  // ── Submit: POST to server → short id → navigate ─────────────────
  // We persist the state server-side and navigate with a 6-char id so
  // share URLs stay small enough for SMS / socials / QR codes. If the
  // server round-trip fails (network, 5xx, etc.) we fall back to the
  // legacy base64-in-URL path so the user can still run the show.
  async function handleSubmit(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canSubmit) return;
    setSubmitting(true);
    setError(null);

    const trimmedName = tournamentName.trim();
    const trimmedDivision = divisionName.trim();
    const trimmedLogo = tournamentLogoUrl.trim();
    const branding =
      trimmedName || trimmedDivision || trimmedLogo
        ? {
            tournamentName: trimmedName || undefined,
            divisionName: trimmedDivision || undefined,
            logoUrl: trimmedLogo || undefined,
          }
        : undefined;

    const state: ShareableDrawState = {
      v: 1,
      config: {
        mode,
        groupCount: mode === "groups" ? groupCount : undefined,
        seedingMode: "random",
        seed: Date.now().toString(36),
      },
      teams: teams.map((tm, i) => ({
        id: `t${i}`,
        name: tm.name,
        countryCode: tm.countryCode,
        logoUrl: tm.logoUrl,
      })),
      ...(branding ? { branding } : {}),
    };

    try {
      const res = await fetch("/api/draw/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(state),
      });
      if (res.ok) {
        const { id } = (await res.json()) as { id: string };
        router.push(`/draw/present?s=${id}`);
        return;
      }
      // Server rejected the payload — fall through to base64 fallback.
    } catch {
      // Network error — fall through to base64 fallback.
    }

    try {
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
          {/* ── Tournament branding (optional) ── */}
          <div>
            <LabelRow icon={<Trophy className="w-4 h-4" />}>
              {t("brandingLabel")}
              <span
                className="text-[10px] font-semibold uppercase tracking-widest normal-case"
                style={{ color: "var(--cat-text-muted)" }}
              >
                {t("brandingOptional")}
              </span>
            </LabelRow>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                value={tournamentName}
                onChange={(e) => setTournamentName(e.target.value)}
                placeholder={t("brandingNamePlaceholder")}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--cat-input-bg, var(--cat-card-bg))",
                  border: "1px solid var(--cat-card-border)",
                  color: "var(--cat-text)",
                }}
              />
              <input
                type="text"
                value={divisionName}
                onChange={(e) => setDivisionName(e.target.value)}
                placeholder={t("brandingDivisionPlaceholder")}
                className="rounded-xl px-3 py-2 text-sm outline-none"
                style={{
                  background: "var(--cat-input-bg, var(--cat-card-bg))",
                  border: "1px solid var(--cat-card-border)",
                  color: "var(--cat-text)",
                }}
              />
            </div>
            <input
              type="url"
              value={tournamentLogoUrl}
              onChange={(e) => setTournamentLogoUrl(e.target.value)}
              placeholder={t("brandingLogoPlaceholder")}
              className="w-full mt-2 rounded-xl px-3 py-2 text-sm outline-none"
              style={{
                background: "var(--cat-input-bg, var(--cat-card-bg))",
                border: "1px solid var(--cat-card-border)",
                color: "var(--cat-text)",
              }}
            />
            <p
              className="text-xs mt-1.5"
              style={{ color: "var(--cat-text-muted)" }}
            >
              {t("brandingHint")}
            </p>
          </div>

          {/* ── Input mode toggle ── */}
          <div>
            <LabelRow icon={<Users className="w-4 h-4" />}>
              {t("teamsLabel")}
              <CounterPill count={teams.length} />
            </LabelRow>
            <div
              className="inline-flex p-1 rounded-xl mb-3"
              style={{ background: "var(--cat-tag-bg)" }}
            >
              <ModeTab
                active={inputMode === "bulk"}
                icon={<Rows3 className="w-3.5 h-3.5" />}
                label={t("inputBulk")}
                onClick={() => setInputMode("bulk")}
              />
              <ModeTab
                active={inputMode === "detailed"}
                icon={<ListChecks className="w-3.5 h-3.5" />}
                label={t("inputDetailed")}
                onClick={() => setInputMode("detailed")}
              />
            </div>

            {inputMode === "bulk" ? (
              <>
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
                  {t("teamsHintBulk", { min: MIN_TEAMS, max: MAX_TEAMS })}
                </p>
              </>
            ) : (
              <div className="space-y-2">
                {detailedRows.map((row, i) => (
                  <DetailedRowEditor
                    key={row.id}
                    row={row}
                    index={i}
                    canRemove={detailedRows.length > 1}
                    onUpdate={(patch) => updateRow(row.id, patch)}
                    onRemove={() => removeRow(row.id)}
                    placeholderName={t("rowPlaceholderName")}
                    placeholderLogo={t("rowPlaceholderLogo")}
                    countryLabel={t("rowCountry")}
                  />
                ))}
                <button
                  type="button"
                  onClick={addRow}
                  disabled={detailedRows.length >= MAX_TEAMS}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold mt-2 transition-opacity hover:opacity-80 disabled:opacity-40"
                  style={{
                    background: "rgba(43,254,186,0.08)",
                    color: "var(--cat-accent)",
                    border: "1px dashed rgba(43,254,186,0.4)",
                  }}
                >
                  <Plus className="w-3.5 h-3.5" /> {t("addTeam")}
                </button>
                <p
                  className="text-xs mt-1.5"
                  style={{ color: "var(--cat-text-muted)" }}
                >
                  {t("teamsHintDetailed", { min: MIN_TEAMS, max: MAX_TEAMS })}
                </p>
              </div>
            )}
          </div>

          {/* ── Format ── */}
          <div>
            <LabelRow icon={<ListChecks className="w-4 h-4" />}>
              {t("modeLabel")}
            </LabelRow>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <ModeCard
                active={mode === "groups"}
                icon={<Layers className="w-4 h-4" />}
                title={t("modeGroups")}
                body={t("modeGroupsBody")}
                onClick={() => setMode("groups")}
              />
              <ModeCard
                active={mode === "league"}
                icon={<Repeat className="w-4 h-4" />}
                title={t("modeLeague")}
                body={t("modeLeagueBody")}
                onClick={() => setMode("league")}
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

          {/* ── Group count (mode=groups only) ── */}
          {mode === "groups" && (
            <div>
              <LabelRow icon={<Layers className="w-4 h-4" />}>
                {t("groupCountLabel")}
              </LabelRow>
              <div className="flex flex-wrap items-center gap-2">
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
                {/* Custom count input — accepts any number in range. */}
                <div
                  className="flex items-center gap-1.5 rounded-xl px-2 py-1"
                  style={{
                    background: "var(--cat-tag-bg)",
                    border: "1px solid var(--cat-card-border)",
                  }}
                >
                  <span
                    className="text-xs font-bold uppercase tracking-widest"
                    style={{ color: "var(--cat-text-muted)" }}
                  >
                    {t("groupCountCustom")}
                  </span>
                  <input
                    type="number"
                    min={MIN_GROUPS}
                    max={MAX_GROUPS}
                    value={groupCount}
                    onChange={(e) => {
                      const v = parseInt(e.target.value);
                      if (Number.isFinite(v)) setGroupCount(v);
                    }}
                    className="w-14 text-sm font-bold bg-transparent outline-none text-center"
                    style={{ color: "var(--cat-text)" }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* League summary — tells the user how many rounds/matches. */}
          {mode === "league" && teams.length >= 2 && (
            <div
              className="rounded-2xl px-4 py-3"
              style={{
                background: "rgba(43,254,186,0.05)",
                border: "1px solid rgba(43,254,186,0.25)",
              }}
            >
              <p
                className="text-xs font-semibold leading-relaxed"
                style={{ color: "var(--cat-text-secondary)" }}
              >
                {t("leagueSummary", {
                  rounds: leagueRoundsOf(teams.length),
                  matches: leagueMatchesOf(teams.length),
                })}
              </p>
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

function DetailedRowEditor({
  row,
  index,
  canRemove,
  onUpdate,
  onRemove,
  placeholderName,
  placeholderLogo,
  countryLabel,
}: {
  row: DetailedRow;
  index: number;
  canRemove: boolean;
  onUpdate: (patch: Partial<DetailedRow>) => void;
  onRemove: () => void;
  placeholderName: string;
  placeholderLogo: string;
  countryLabel: string;
}) {
  return (
    <div
      className="flex items-center gap-2 rounded-xl p-2"
      style={{
        background: "var(--cat-tag-bg)",
        border: "1px solid var(--cat-card-border)",
      }}
    >
      <span
        className="w-6 h-6 rounded-md flex items-center justify-center text-[11px] font-black shrink-0"
        style={{ background: "rgba(43,254,186,0.12)", color: "var(--cat-accent)" }}
      >
        {index + 1}
      </span>

      {/* Logo preview or placeholder */}
      <div
        className="w-8 h-8 rounded-md flex items-center justify-center shrink-0 overflow-hidden"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
        }}
      >
        {row.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={row.logoUrl}
            alt=""
            className="w-full h-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <ImageIcon
            className="w-4 h-4"
            style={{ color: "var(--cat-text-muted)" }}
          />
        )}
      </div>

      <input
        type="text"
        value={row.name}
        onChange={(e) => onUpdate({ name: e.target.value })}
        placeholder={placeholderName}
        className="flex-1 min-w-0 bg-transparent outline-none text-sm font-semibold px-1"
        style={{ color: "var(--cat-text)" }}
      />

      <select
        value={row.countryCode}
        onChange={(e) => onUpdate({ countryCode: e.target.value })}
        title={countryLabel}
        className="rounded-md px-1.5 py-1 text-xs outline-none shrink-0"
        style={{
          background: "var(--cat-card-bg)",
          border: "1px solid var(--cat-card-border)",
          color: "var(--cat-text)",
          maxWidth: 140,
        }}
      >
        {COUNTRY_OPTIONS.map((c) => (
          <option key={c.code} value={c.code}>
            {c.label}
          </option>
        ))}
      </select>

      <input
        type="url"
        value={row.logoUrl}
        onChange={(e) => onUpdate({ logoUrl: e.target.value })}
        placeholder={placeholderLogo}
        className="w-36 hidden md:block bg-transparent outline-none text-xs px-1.5 py-1 rounded-md"
        style={{
          color: "var(--cat-text-muted)",
          border: "1px solid var(--cat-card-border)",
          background: "var(--cat-card-bg)",
        }}
      />

      <button
        type="button"
        onClick={onRemove}
        disabled={!canRemove}
        className="w-8 h-8 rounded-md flex items-center justify-center transition-opacity hover:opacity-80 disabled:opacity-30 shrink-0"
        style={{
          color: "var(--cat-text-muted)",
        }}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

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

function ModeTab({
  active,
  icon,
  label,
  onClick,
}: {
  active: boolean;
  icon: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-opacity hover:opacity-80"
      style={{
        background: active ? "var(--cat-card-bg)" : "transparent",
        color: active ? "var(--cat-accent)" : "var(--cat-text-muted)",
        boxShadow: active ? "0 1px 2px rgba(0,0,0,0.15)" : undefined,
      }}
    >
      {icon}
      {label}
    </button>
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

// ─── League math helpers ─────────────────────────────────────────────

/** Round count for a round-robin with n teams (Berger circle method). */
function leagueRoundsOf(n: number): number {
  return n < 2 ? 0 : n % 2 === 0 ? n - 1 : n;
}

/** Total match count for a round-robin with n teams: C(n,2). */
function leagueMatchesOf(n: number): number {
  return n < 2 ? 0 : (n * (n - 1)) / 2;
}

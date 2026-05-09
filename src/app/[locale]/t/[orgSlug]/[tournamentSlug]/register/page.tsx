"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Search, Building2, Plus, X, Upload, Loader2, CheckCircle,
  ArrowRight, ArrowLeft, Eye, EyeOff, Users, Shield,
  ChevronRight, Trophy, Sparkles, LogIn, User, Baby,
  ChevronDown, Tag,
} from "lucide-react";
import { CountrySelect as SharedCountrySelect } from "@/components/ui/country-select";
import { CityInput } from "@/components/ui/city-input";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type TData = { id: number; name: string; slug: string; registrationOpen: boolean; currency: string };
type ClassData = { id: number; name: string; format: string | null; minBirthYear: number | null; maxBirthYear: number | null };
type ClubResult = { id: number; name: string; city: string | null; country: string | null; badgeUrl: string | null; contactName: string | null; teamCount: number; hasAdmin?: boolean };

type View = "search" | "join" | "create" | "done-join" | "done-create";
// Step IDs (semantic, not positional):
//   1 — Club info  (new-club path only)
//   2 — Team       (existing-club path only — pick or create a team)
//   3 — Account    (login or signup, both paths)
//   4 — Tournament (divisions for the actual registration)
type Step = 1 | 2 | 3 | 4;

// Existing team in the club (from API)
type ExistingTeam = {
  id: number;
  name: string | null;
  birthYear: number | null;
  gender: "male" | "female" | "mixed";
  totalTournaments: number;
  playersCount: number;
  // Server-side state for the currently selected tournament. Populated
  // by /api/clubs/[clubId]/teams using session.tournamentId. When this
  // array is non-empty the team has at least one registration already
  // — UI shows "Уже зарегистрирована" instead of "+ Заявить".
  currentSquads?: Array<{
    registrationId: number;
    squadAlias: string;
    displayName: string | null;
    classId: number | null;
    className: string;
    regNumber: number | null;
    status: "draft" | "open" | "confirmed" | "cancelled";
  }>;
};

// One entry in the "teams to register" list (for logged-in club)
type TeamRegistrationEntry = {
  key: string;             // unique local key
  teamId?: number;         // existing team — reuse
  // OR new team fields:
  birthYear?: number;
  gender: "male" | "female" | "mixed";
  // Tournament-specific:
  classId: string;
  squadAlias: string;      // '' = single squad, 'Black'/'White' = second squad
  displayName: string;     // name in this tournament
};

const ROLES = [
  { value: "coach",   label: "Тренер / Coach" },
  { value: "manager", label: "Менеджер" },
  { value: "parent",  label: "Родитель / Parent" },
  { value: "other",   label: "Другое / Other" },
];

const DIV_COLORS = [
  "#3B82F6","#10B981","#8B5CF6","#F59E0B",
  "#EF4444","#06B6D4","#EC4899","#84CC16",
];

const GENDER_LABELS: Record<string, string> = {
  male: "♂ Мальчики",
  female: "♀ Девочки",
  mixed: "⚥ Смешанные",
};

const GENDER_COLORS: Record<string, string> = {
  male: "#3B82F6",
  female: "#EC4899",
  mixed: "#8B5CF6",
};

/* ─── Step indicator ─────────────────────────────────────────────────────── */
function StepBar({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: total }, (_, i) => {
        const done  = i + 1 < step;
        const active = i + 1 === step;
        return (
          <div key={i} className="flex items-center gap-2 flex-1">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black shrink-0 border transition-all ${
              done    ? "border-transparent text-black"
              : active ? "border-[var(--cat-accent)] text-[var(--cat-accent)]"
                       : "border-[var(--cat-card-border)] text-[var(--cat-text-faint)]"
            }`}
              style={done ? { background: "var(--cat-accent)" } : active ? { background: "var(--cat-pill-active-bg)" } : { background: "var(--cat-tag-bg)" }}>
              {done ? "✓" : i + 1}
            </div>
            {i + 1 < total && (
              <div className="flex-1 h-px" style={{ background: done ? "var(--cat-accent)" : "var(--cat-card-border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ─── Auto-redirect after successful create ──────────────────────────────── */
// The register endpoint already set the session cookie — the user has
// nothing to do here. Bounce to the dashboard ~1.2s later so they get a
// glimpse of the "Заявка отправлена!" confirmation but aren't blocked
// behind a button click.
function DoneCreateAutoRedirect() {
  useEffect(() => {
    const id = setTimeout(() => {
      window.location.href = "/club/dashboard";
    }, 1200);
    return () => clearTimeout(id);
  }, []);
  return null;
}

/* ─── Styled input ───────────────────────────────────────────────────────── */
function Field({
  label, value, onChange, placeholder, type = "text", hint, required,
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; hint?: string; required?: boolean }) {
  const [show, setShow] = useState(false);
  const isPass = type === "password";
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <div className="relative">
        <input
          type={isPass && show ? "text" : type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none transition-all"
          style={{
            background: "var(--cat-input-bg)",
            borderColor: "var(--cat-input-border)",
            color: "var(--cat-text)",
          }}
          onFocus={e => {
            e.currentTarget.style.borderColor = "var(--cat-accent)";
            e.currentTarget.style.boxShadow = "0 0 0 3px var(--cat-input-focus-glow)";
          }}
          onBlur={e => {
            e.currentTarget.style.borderColor = "var(--cat-input-border)";
            e.currentTarget.style.boxShadow = "none";
          }}
        />
        {isPass && (
          <button type="button" onClick={() => setShow(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 opacity-50 hover:opacity-100 transition-opacity"
            style={{ color: "var(--cat-text-muted)" }}>
            {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        )}
      </div>
      {hint && <p className="text-[10px] mt-1" style={{ color: "var(--cat-text-faint)" }}>{hint}</p>}
    </div>
  );
}

/* ─── Country select wrapper ─────────────────────────────────────────────── */
function CountrySelect({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <SharedCountrySelect
        value={value}
        onChange={onChange}
        placeholder="— select —"
        variant="onboarding"
      />
    </div>
  );
}

/* ─── Club card ─────────────────────────────────────────────────────────── */
function ClubCard({ club, onSelect }: { club: ClubResult; onSelect: () => void }) {
  const initials = club.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase();
  // Some legacy clubs in the DB carry badgeUrl pointing to /uploads/kc/...
  // files that no longer exist. Fall back to the initials avatar on 404 so
  // the row never shows a broken-image icon.
  const [imgFailed, setImgFailed] = useState(false);
  const showImage = !!club.badgeUrl && !imgFailed;
  return (
    <button type="button" onClick={onSelect}
      className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:scale-[1.01] group"
      style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-accent)";
        (e.currentTarget as HTMLElement).style.background = "var(--cat-pill-active-bg)";
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-card-border)";
        (e.currentTarget as HTMLElement).style.background = "var(--cat-tag-bg)";
      }}>
      {showImage ? (
        <img
          src={club.badgeUrl!}
          alt=""
          className="w-10 h-10 rounded-xl object-contain p-0.5 shrink-0"
          style={{ background: "var(--cat-card-bg)" }}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black shrink-0"
          style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
          {initials}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>{club.name}</p>
        <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
          {[club.city, club.country].filter(Boolean).join(", ")}
          {club.teamCount > 0 && ` · ${club.teamCount} команд`}
        </p>
      </div>
      {club.hasAdmin && (
        <span
          className="text-[10px] font-bold px-2 py-1 rounded-md shrink-0"
          style={{ background: "rgba(59,130,246,0.12)", color: "#3b82f6" }}
        >
          🔐 Войти
        </span>
      )}
      <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--cat-accent)" }} />
    </button>
  );
}

/* ─── Team identity badge ────────────────────────────────────────────────── */
function TeamIdentityBadge({ team, clubName }: { team: ExistingTeam; clubName?: string }) {
  // Display name priority:
  //   1. Team's custom name (the user explicitly typed something — e.g.
  //      "FCI Tallinn" override on FCI Levadia club).
  //   2. Club name fallback — the natural label when the coach didn't
  //      bother customising. Most teams just want to be "<Club Name>"
  //      across every division.
  // The birth-year + gender pills carry the per-team identity, so the
  // textual label can safely be the club brand.
  const displayName = team.name ?? clubName ?? null;
  const gColor = GENDER_COLORS[team.gender] ?? "#64748b";
  return (
    <div className="flex items-center gap-2 min-w-0">
      {team.birthYear ? (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: `${gColor}18`, color: gColor, border: `1px solid ${gColor}30` }}>
          <Baby className="w-3 h-3" /> {team.birthYear}
        </span>
      ) : (
        <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0"
          style={{ background: `${gColor}18`, color: gColor, border: `1px solid ${gColor}30` }}>
          <User className="w-3 h-3" /> Взрослые
        </span>
      )}
      <span className="text-[11px] px-1.5 py-0.5 rounded-md shrink-0"
        style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}>
        {GENDER_LABELS[team.gender]}
      </span>
      {displayName && (
        <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>{displayName}</span>
      )}
      {team.totalTournaments > 0 && (
        <span className="text-[10px]" style={{ color: "var(--cat-text-faint)" }}>
          · {team.totalTournaments} {team.totalTournaments === 1 ? "турнир" : "турниров"}
        </span>
      )}
    </div>
  );
}

/* ─── Existing team entry card (in logged-in step 3) ────────────────────── */
function ExistingTeamEntry({
  team, entry, classes, clubName, onUpdate, onRemove,
}: {
  team: ExistingTeam;
  entry: TeamRegistrationEntry;
  classes: ClassData[];
  clubName: string;
  onUpdate: (patch: Partial<TeamRegistrationEntry>) => void;
  onRemove: () => void;
}) {
  const [showAlias, setShowAlias] = useState(false);
  const classInfo = classes.find(c => String(c.id) === entry.classId);
  const classColor = DIV_COLORS[classes.findIndex(c => String(c.id) === entry.classId) % DIV_COLORS.length] ?? "#64748b";

  return (
    <div className="rounded-2xl border overflow-hidden"
      style={{ background: "var(--cat-card-bg)", borderColor: entry.classId ? classColor : "var(--cat-card-border)" }}>
      {/* Team identity header */}
      <div className="flex items-center gap-3 px-4 py-3" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
        <TeamIdentityBadge team={team} clubName={clubName} />
        <div className="flex-1" />
        <button onClick={onRemove} className="w-6 h-6 rounded-lg flex items-center justify-center opacity-40 hover:opacity-100 transition-opacity"
          style={{ background: "rgba(239,68,68,0.1)", color: "#ef4444" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="px-4 py-3 space-y-3">
        {/* Division picker */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
            Дивизион в турнире *
          </label>
          <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))" }}>
            {classes.map((cls, i) => {
              const col = DIV_COLORS[i % DIV_COLORS.length];
              const selected = entry.classId === String(cls.id);
              return (
                <button key={cls.id} type="button"
                  onClick={() => onUpdate({ classId: String(cls.id) })}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl border text-left text-[12px] font-semibold transition-all"
                  style={selected ? {
                    background: `${col}18`, borderColor: col, color: col,
                  } : {
                    background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)",
                  }}>
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
                  {cls.name}
                </button>
              );
            })}
          </div>
        </div>

        {/* Display name in tournament */}
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
            Название в этом турнире
          </label>
          <input type="text" value={entry.displayName}
            onChange={e => onUpdate({ displayName: e.target.value })}
            placeholder={`${clubName}${team.birthYear ? ` ${team.birthYear}` : ""}`}
            className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
            style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
          />
        </div>

        {/* Squad alias (second squad toggle) */}
        <div>
          <button type="button" onClick={() => setShowAlias(v => !v)}
            className="flex items-center gap-1.5 text-[11px] font-semibold hover:opacity-70 transition-opacity"
            style={{ color: "var(--cat-text-muted)" }}>
            <Tag className="w-3 h-3" />
            {showAlias ? "Убрать псевдоним состава" : "+ Псевдоним состава (2-й состав: Black/White/A/B)"}
          </button>
          {showAlias && (
            <input type="text" value={entry.squadAlias}
              onChange={e => onUpdate({ squadAlias: e.target.value })}
              placeholder="Black, White, A, B..."
              className="mt-2 w-full rounded-xl px-3 py-2 text-sm border outline-none"
              style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── New team form (inline, in logged-in step 3) ────────────────────────── */
function NewTeamForm({
  classes, clubName, onAdd, onCancel,
}: {
  classes: ClassData[];
  clubName: string;
  onAdd: (entry: TeamRegistrationEntry) => void;
  onCancel: () => void;
}) {
  const [birthYear, setBirthYear] = useState("");
  const [gender, setGender] = useState<"male" | "female" | "mixed">("male");
  const [classId, setClassId] = useState("");
  const [displayName, setDisplayName] = useState("");

  function submit() {
    if (!classId) return;
    onAdd({
      key: `new-${Date.now()}`,
      birthYear: birthYear ? parseInt(birthYear) : undefined,
      gender,
      classId,
      squadAlias: "",
      displayName,
    });
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 25 }, (_, i) => currentYear - 5 - i);

  return (
    <div className="rounded-2xl border p-4 space-y-3"
      style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-accent)", boxShadow: "0 0 0 1px var(--cat-accent)20" }}>
      <div className="flex items-center justify-between">
        <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>Новая команда</p>
        <button onClick={onCancel} className="w-6 h-6 rounded-lg flex items-center justify-center opacity-40 hover:opacity-100"
          style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Year + Gender */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
            Год рождения
          </label>
          <select value={birthYear} onChange={e => setBirthYear(e.target.value)}
            className="w-full rounded-xl px-3 py-2.5 text-sm border outline-none"
            style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}>
            <option value="">— Взрослые —</option>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
            Пол
          </label>
          <div className="grid grid-cols-3 gap-1">
            {(["male", "female", "mixed"] as const).map(g => (
              <button key={g} type="button" onClick={() => setGender(g)}
                className="py-2 rounded-xl border text-[10px] font-bold transition-all"
                style={gender === g ? {
                  background: `${GENDER_COLORS[g]}18`, borderColor: GENDER_COLORS[g], color: GENDER_COLORS[g],
                } : {
                  background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)",
                }}>
                {g === "male" ? "♂" : g === "female" ? "♀" : "⚥"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Division */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
          Дивизион *
        </label>
        <div className="grid gap-1.5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))" }}>
          {classes.map((cls, i) => {
            const col = DIV_COLORS[i % DIV_COLORS.length];
            return (
              <button key={cls.id} type="button"
                onClick={() => setClassId(String(cls.id))}
                className="flex items-center gap-2 px-3 py-2 rounded-xl border text-[12px] font-semibold transition-all"
                style={classId === String(cls.id) ? {
                  background: `${col}18`, borderColor: col, color: col,
                } : {
                  background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)",
                }}>
                <div className="w-2 h-2 rounded-full shrink-0" style={{ background: col }} />
                {cls.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Display name */}
      <div>
        <label className="text-[10px] font-black uppercase tracking-widest mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
          Название в турнире
        </label>
        <input type="text" value={displayName} onChange={e => setDisplayName(e.target.value)}
          placeholder={`${clubName}${birthYear ? ` ${birthYear}` : ""}`}
          className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
          style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
        />
      </div>

      <button onClick={submit} disabled={!classId}
        className="w-full py-2.5 rounded-xl text-sm font-black flex items-center justify-center gap-2 disabled:opacity-40 transition-opacity hover:opacity-90"
        style={{ background: "var(--cat-accent)", color: "#000" }}>
        <Plus className="w-4 h-4" /> Добавить команду
      </button>
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("tournament");
  const orgSlug   = params.orgSlug as string;
  const tournamentSlug = params.tournamentSlug as string;

  /* Tournament data */
  const [tournament, setTournament] = useState<TData | null>(null);
  const [classes, setClasses]   = useState<ClassData[]>([]);
  const [notFound, setNotFound] = useState(false);

  /* Logged-in club detection */
  const [loggedInClub, setLoggedInClub] = useState<{ id: number; name: string; country: string | null; city: string | null } | null>(null);
  const [sessionChecked, setSessionChecked] = useState(false);

  /* Existing teams of the logged-in club */
  const [existingTeams, setExistingTeams] = useState<ExistingTeam[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(false);
  // In-flight edit/withdraw on submitted squads (per registrationId).
  const [editingRegId, setEditingRegId] = useState<number | null>(null);
  const [editingClassId, setEditingClassId] = useState<string>("");
  const [editingDisplayName, setEditingDisplayName] = useState<string>("");
  const [busyRegId, setBusyRegId] = useState<number | null>(null);

  /* Wizard */
  const [view, setView]         = useState<View>("search");
  const [step, setStep]         = useState<Step>(1);

  /* Search */
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<ClubResult[]>([]);
  const [globalResults, setGlobalResults] = useState<ClubResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [selectedClub, setSelected] = useState<ClubResult | null>(null);
  // When the user picks an existing club from the global search, remember
  // its id so we can re-use the club row on submit instead of creating a
  // duplicate. Cleared if the user types a new clubName manually.
  const [pickedGlobalClubId, setPickedGlobalClubId] = useState<number | null>(null);
  // True when the picked club already has admin(s) — controls default
  // tab on the auth step (login first vs signup first).
  const [pickedGlobalClubHasAdmin, setPickedGlobalClubHasAdmin] = useState(false);
  // Team-picker state (only the existing-club path uses these). Either
  // joinTeamId is set (existing team) OR newTeam is filled (creating
  // a brand-new team for this coach).
  type ClubTeamLite = { id: number; name: string | null; birthYear: number | null; gender: string; label: string };
  const [clubTeamsList, setClubTeamsList] = useState<ClubTeamLite[]>([]);
  const [clubTeamsLoading, setClubTeamsLoading] = useState(false);
  const [joinTeamId, setJoinTeamId] = useState<number | null>(null);
  const [newTeamMode, setNewTeamMode] = useState(false);
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamBirthYear, setNewTeamBirthYear] = useState("");
  const [newTeamGender, setNewTeamGender] = useState<"male" | "female" | "mixed">("male");
  // Tab on step 2 when an existing club is picked: "login" lets a coach
  // who already has access sign in; "signup" creates a fresh clubUser
  // tied to the same club.
  const [authMode, setAuthMode] = useState<"login" | "signup">("signup");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginBusy, setLoginBusy] = useState(false);
  // Soft suggestion when the user is typing a clubName in step 1 of the
  // create-flow that exactly matches an existing global club — nudges them
  // to pick that one instead of creating yet another duplicate.
  const [duplicateClubHint, setDuplicateClubHint] = useState<ClubResult | null>(null);

  /* Join request */
  const [joinName,  setJoinName]  = useState("");
  const [joinEmail, setJoinEmail] = useState("");
  const [joinRole,  setJoinRole]  = useState("coach");
  const [joining, setJoining]     = useState(false);
  const [joinError, setJoinError] = useState("");

  /* Create — club info */
  const [clubName, setClubName]   = useState("");
  const [country, setCountry]     = useState("");
  const [city, setCity]           = useState("");
  const [logo, setLogo]           = useState<File | null>(null);
  const [logoPreview, setLogoPrev] = useState<string | null>(null);

  /* Create — account */
  const [contactName, setContactName]   = useState("");
  const [contactEmail, setContactEmail] = useState("");
  // Email verification state — required before step 2 → 3.
  const [emailVerified, setEmailVerified] = useState(false);
  const [verifyPhase, setVerifyPhase] = useState<"idle" | "sending" | "sent" | "checking">("idle");
  const [verifyCode, setVerifyCode] = useState("");
  const [verifyError, setVerifyError] = useState("");
  const [password, setPassword]         = useState("");

  /* NEW CLUB — teams (classId + name, original flow) */
  const [newClubTeams, setNewClubTeams] = useState<{ classId: string; name: string }[]>([]);

  /* LOGGED-IN CLUB — team registration entries */
  const [teamEntries, setTeamEntries] = useState<TeamRegistrationEntry[]>([]);
  const [showNewTeamForm, setShowNewTeamForm] = useState(false);

  /* Submit */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  /* Load tournament */
  useEffect(() => {
    fetch(`/api/public/t/${orgSlug}/${tournamentSlug}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(d => { if (d) { setTournament(d.tournament); setClasses(d.classes); } });
  }, [orgSlug, tournamentSlug]);

  /* Check if already logged in as a club */
  useEffect(() => {
    fetch("/api/auth/me")
      .then(r => r.json())
      .then(d => {
        if (d.authenticated && d.role === "club" && d.club) {
          setLoggedInClub(d.club);
          setClubName(d.club.name);
          setCountry(d.club.country ?? "");
          setCity(d.club.city ?? "");
          setView("create");
          setStep(4); // tournament step (logged-in clubs skip every other step)
        }
        setSessionChecked(true);
      })
      .catch(() => setSessionChecked(true));
  }, []);

  /* Load existing teams when logged-in club detected. Pass tournamentId
     so currentSquads in the response reflects THIS tournament, not the
     session's last one. */
  const reloadExistingTeams = useCallback(async () => {
    if (!loggedInClub) return;
    setTeamsLoading(true);
    const url = tournament
      ? `/api/clubs/${loggedInClub.id}/teams?tournamentId=${tournament.id}`
      : `/api/clubs/${loggedInClub.id}/teams`;
    try {
      const r = await fetch(url, { credentials: "include" });
      if (r.ok) setExistingTeams(await r.json());
    } finally {
      setTeamsLoading(false);
    }
  }, [loggedInClub, tournament]);
  useEffect(() => { reloadExistingTeams(); }, [reloadExistingTeams]);

  /* Withdraw an already-submitted registration. */
  async function withdrawRegistration(registrationId: number, label: string) {
    if (!loggedInClub) return;
    if (!confirm(`Отозвать заявку «${label}»? Команду придётся регистрировать заново если передумаете.`)) return;
    setBusyRegId(registrationId);
    try {
      const r = await fetch(`/api/clubs/${loggedInClub.id}/registrations/${registrationId}`, { method: "DELETE" });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? "Не удалось отозвать заявку");
        return;
      }
      await reloadExistingTeams();
      setEditingRegId(null);
    } finally {
      setBusyRegId(null);
    }
  }

  /* Open the inline editor for an existing registration. */
  function startEditingRegistration(registrationId: number, classId: number | null, displayName: string | null) {
    setEditingRegId(registrationId);
    setEditingClassId(classId ? String(classId) : "");
    setEditingDisplayName(displayName ?? "");
    setError("");
  }

  /* Save the edited registration. */
  async function saveEditedRegistration() {
    if (!loggedInClub || editingRegId === null) return;
    setBusyRegId(editingRegId);
    try {
      const r = await fetch(`/api/clubs/${loggedInClub.id}/registrations/${editingRegId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          classId: editingClassId ? parseInt(editingClassId) : undefined,
          displayName: editingDisplayName || null,
        }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error ?? "Не удалось сохранить");
        return;
      }
      await reloadExistingTeams();
      setEditingRegId(null);
    } finally {
      setBusyRegId(null);
    }
  }

  /* Load clubTeamsList when an existing club is picked (team-picker step). */
  useEffect(() => {
    if (pickedGlobalClubId === null) {
      setClubTeamsList([]);
      return;
    }
    setClubTeamsLoading(true);
    fetch(`/api/public/clubs/${pickedGlobalClubId}/teams`)
      .then(r => r.ok ? r.json() : [])
      .then((data: ClubTeamLite[]) => setClubTeamsList(data))
      .catch(() => {})
      .finally(() => setClubTeamsLoading(false));
  }, [pickedGlobalClubId]);

  /* While the user is typing a clubName in the create-club step (and hasn't
     already picked from the global list), softly check whether their input
     matches an existing global club. If yes — show a hint they can click
     to switch to the existing club instead of creating a duplicate. */
  useEffect(() => {
    if (view !== "create" || step !== 1 || pickedGlobalClubId !== null || clubName.trim().length < 3) {
      setDuplicateClubHint(null);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const r = await fetch(`/api/public/clubs/search?q=${encodeURIComponent(clubName.trim())}`);
        if (!r.ok) return;
        const list: ClubResult[] = await r.json();
        const norm = (s: string) => s.trim().toLowerCase();
        const target = norm(clubName);
        // Exact-name match (case-insensitive). If user typed country/city,
        // narrow further; otherwise the first exact-name hit wins.
        const exact = list.find(c => norm(c.name) === target
          && (!country || (c.country && norm(c.country) === norm(country))));
        setDuplicateClubHint(exact ?? null);
      } catch {/* ignore */}
    }, 400);
    return () => clearTimeout(timer);
  }, [clubName, country, view, step, pickedGlobalClubId]);

  /* Debounced club search — checks both this tournament's clubs and the
     global clubs DB so the user can pick an existing club even if it
     hasn't registered to this tournament yet. */
  useEffect(() => {
    if (query.length < 2) { setResults([]); setGlobalResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const [tournamentRes, globalRes] = await Promise.all([
          fetch(`/api/public/t/${orgSlug}/${tournamentSlug}/clubs?q=${encodeURIComponent(query)}`),
          fetch(`/api/public/clubs/search?q=${encodeURIComponent(query)}`),
        ]);
        const inTourn = tournamentRes.ok ? await tournamentRes.json() : [];
        const allGlobal = globalRes.ok ? await globalRes.json() : [];
        const inTournIds = new Set<number>(inTourn.map((c: { id: number }) => c.id));
        // Show in the "global" bucket only clubs NOT already in the tournament list.
        setResults(inTourn);
        setGlobalResults(allGlobal.filter((c: { id: number }) => !inTournIds.has(c.id)));
      } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, orgSlug, tournamentSlug]);

  /* ── Team entry helpers (for logged-in club) ── */
  function addExistingTeam(team: ExistingTeam) {
    // Avoid duplicate (same teamId)
    if (teamEntries.some(e => e.teamId === team.id)) return;
    // Auto-pick the class whose birth-year band contains the team's
    // birthYear. Falls back to the empty string when nothing matches
    // (e.g. team has no birthYear set or band-less class) — the user
    // sees the class picker and chooses manually.
    const autoClassId = team.birthYear
      ? classes.find((c) =>
          (c.minBirthYear ?? -Infinity) <= team.birthYear! &&
          (c.maxBirthYear ?? Infinity) >= team.birthYear!
        )?.id
      : undefined;
    setTeamEntries(prev => [...prev, {
      key: `existing-${team.id}-${Date.now()}`,
      teamId: team.id,
      gender: team.gender,
      birthYear: team.birthYear ?? undefined,
      classId: autoClassId ? String(autoClassId) : "",
      squadAlias: "",
      displayName: "",
    }]);
  }

  function addNewTeamEntry(entry: TeamRegistrationEntry) {
    setTeamEntries(prev => [...prev, entry]);
    setShowNewTeamForm(false);
  }

  function updateEntry(key: string, patch: Partial<TeamRegistrationEntry>) {
    setTeamEntries(prev => prev.map(e => e.key === key ? { ...e, ...patch } : e));
  }

  function removeEntry(key: string) {
    setTeamEntries(prev => prev.filter(e => e.key !== key));
  }

  /* ── New-club team helpers ── */
  function toggleClass(classId: string) {
    setNewClubTeams(prev => {
      const exists = prev.find(t => t.classId === classId);
      return exists ? prev.filter(t => t.classId !== classId) : [...prev, { classId, name: "" }];
    });
  }
  function updateTeamName(classId: string, name: string) {
    setNewClubTeams(prev => prev.map(t => t.classId === classId ? { ...t, name } : t));
  }

  /* Email verification — reset state if user edits the email after a code
     was sent or after the address was verified. */
  function onEmailChange(v: string) {
    setContactEmail(v);
    if (verifyPhase !== "idle" || emailVerified) {
      setEmailVerified(false);
      setVerifyPhase("idle");
      setVerifyCode("");
      setVerifyError("");
    }
  }
  async function sendVerifyCode() {
    setVerifyError("");
    const email = contactEmail.trim();
    if (!email.includes("@") || email.length < 5) {
      setVerifyError("Введите корректный email");
      return;
    }
    setVerifyPhase("sending");
    try {
      const r = await fetch("/api/auth/email-verify/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setVerifyError(d.error ?? "Не удалось отправить код. Попробуйте позже.");
        setVerifyPhase("idle");
        return;
      }
      setVerifyPhase("sent");
    } catch {
      setVerifyError("Сетевая ошибка");
      setVerifyPhase("idle");
    }
  }
  async function checkVerifyCode() {
    setVerifyError("");
    if (!/^\d{6}$/.test(verifyCode)) {
      setVerifyError("Код состоит из 6 цифр");
      return;
    }
    setVerifyPhase("checking");
    try {
      const r = await fetch("/api/auth/email-verify/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: contactEmail.trim(), code: verifyCode }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) {
        setVerifyError(d.error ?? "Неверный код");
        setVerifyPhase("sent");
        return;
      }
      setEmailVerified(true);
      setVerifyPhase("idle");
    } catch {
      setVerifyError("Сетевая ошибка");
      setVerifyPhase("sent");
    }
  }

  /* Inline login during registration — when the picked club already has
     an admin, let the returning coach sign in without leaving the page.
     On success we switch to loggedInClub mode (the same code path as the
     global "already-signed-in" branch in the session-check effect),
     which renders the team-picker step directly. */
  async function inlineLogin() {
    setLoginError("");
    if (!loginEmail.trim() || !loginPassword) {
      setLoginError("Введите email и пароль");
      return;
    }
    setLoginBusy(true);
    try {
      const attachToTeamId = joinTeamId !== null ? joinTeamId : undefined;
      const attachNewTeam = !attachToTeamId && newTeamMode
        ? {
            name: newTeamName.trim() || null,
            birthYear: newTeamBirthYear ? parseInt(newTeamBirthYear) : null,
            gender: newTeamGender,
          }
        : undefined;
      const r = await fetch("/api/auth/club-login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: loginEmail.trim(),
          password: loginPassword,
          ...(attachToTeamId ? { attachToTeamId } : {}),
          ...(attachNewTeam ? { attachNewTeam } : {}),
        }),
      });
      if (!r.ok) {
        setLoginError("Неверный email или пароль");
        return;
      }
      // Re-hit /me to populate loggedInClub from the fresh cookie. The
      // useEffect in this component already does that on mount, but we
      // need it now without a remount.
      const meRes = await fetch("/api/auth/me");
      const me = await meRes.json().catch(() => null);
      if (me?.authenticated && me.role === "club" && me.club) {
        setLoggedInClub(me.club);
        setClubName(me.club.name);
        setCountry(me.club.country ?? "");
        setCity(me.club.city ?? "");
        setStep(4); // jump straight to tournament-divisions step
      }
    } finally {
      setLoginBusy(false);
    }
  }

  /* Logo */
  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogo(file);
    setLogoPrev(URL.createObjectURL(file));
  }

  /* Join request submit */
  async function handleJoin() {
    setJoinError("");
    if (!joinName.trim() || !joinEmail.trim()) { setJoinError("Заполните имя и email"); return; }
    setJoining(true);
    try {
      const r = await fetch("/api/public/clubs/join-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clubId: selectedClub!.id, requesterName: joinName, requesterEmail: joinEmail, role: joinRole }),
      });
      if (!r.ok) { setJoinError("Ошибка. Попробуйте снова."); return; }
      setView("done-join");
    } finally { setJoining(false); }
  }

  /* Create / register submit */
  async function handleCreate() {
    setError("");

    /* ── LOGGED-IN CLUB: only register teams in this tournament ── */
    if (loggedInClub) {
      if (teamEntries.length === 0) { setError("Выберите хотя бы одну команду"); return; }
      if (teamEntries.some(e => !e.classId)) { setError("Выберите дивизион для каждой команды"); return; }

      setSubmitting(true);
      try {
        const r = await fetch(`/api/clubs/${loggedInClub.id}/tournament-register`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            tournamentId: tournament!.id,
            teams: teamEntries.map(e => ({
              ...(e.teamId ? { teamId: e.teamId } : {
                birthYear: e.birthYear,
                gender: e.gender,
              }),
              classId: parseInt(e.classId),
              squadAlias: e.squadAlias || undefined,
              displayName: e.displayName || undefined,
            })),
          }),
        });
        if (!r.ok) {
          const d = await r.json().catch(() => ({}));
          setError(d.error || t("registrationFailed"));
          return;
        }
        router.push("/team/overview");
      } finally { setSubmitting(false); }
      return;
    }

    /* ── NEW CLUB: full registration flow ── */
    if (!clubName.trim() || !contactEmail.trim() || !password.trim()) { setError(t("fillRequired")); return; }
    if (newClubTeams.length === 0) { setError(t("selectAgeClass")); return; }
    if (newClubTeams.some(tm => !tm.classId)) { setError(t("selectAgeClass")); return; }

    const fd = new FormData();
    fd.append("clubName", clubName.trim());
    fd.append("country", country.trim());
    fd.append("city", city.trim());
    fd.append("contactName", contactName.trim());
    fd.append("contactEmail", contactEmail.trim());
    fd.append("password", password);
    fd.append("tournamentId", String(tournament!.id));
    fd.append("teams", JSON.stringify(newClubTeams.map(tm => ({
      classId: parseInt(tm.classId),
      name: tm.name.trim() || undefined,
    }))));
    if (logo) fd.append("logo", logo);
    // Reuse the global club row instead of creating a duplicate
    if (pickedGlobalClubId !== null) {
      fd.append("existingClubId", String(pickedGlobalClubId));
      // Existing-club path: must declare which team the new coach joins.
      if (joinTeamId !== null) {
        fd.append("joinTeamId", String(joinTeamId));
      } else if (newTeamMode) {
        fd.append("newTeam", JSON.stringify({
          name: newTeamName.trim() || null,
          birthYear: newTeamBirthYear ? parseInt(newTeamBirthYear) : null,
          gender: newTeamGender,
        }));
      }
    }

    setSubmitting(true);
    try {
      const r = await fetch("/api/clubs/register", { method: "POST", body: fd });
      if (!r.ok) {
        const d = await r.json().catch(() => ({}));
        setError(d.error || t("registrationFailed"));
        return;
      }
      setView("done-create");
    } finally { setSubmitting(false); }
  }

  /* Step flow per path. Logical step ids: 1=club info, 2=team picker,
     3=account, 4=tournament. Existing-club path skips club info, new-club
     path skips team picker. */
  const flowSteps: Step[] = pickedGlobalClubId !== null ? [2, 3, 4] : [1, 3, 4];
  const stepIdx = flowSteps.indexOf(step);
  function gotoNext() { const next = flowSteps[stepIdx + 1]; if (next !== undefined) setStep(next); }
  function gotoPrev() { const prev = flowSteps[stepIdx - 1]; if (prev !== undefined) setStep(prev); }
  const isFirstStep = stepIdx <= 0;
  const isLastStep = stepIdx === flowSteps.length - 1;

  /* Validate steps */
  function canGoNext(): boolean {
    if (step === 1) return !!clubName.trim() && !!country.trim() && !!city.trim();
    if (step === 2) {
      // Team picker: must have either an existing team selected OR
      // a complete new-team form. Birth year is REQUIRED — it's the
      // canonical identity of a team (club + year + gender).
      if (joinTeamId !== null) return true;
      if (newTeamMode) {
        const yr = parseInt(newTeamBirthYear);
        return Number.isFinite(yr) && yr >= 1990 && yr <= new Date().getFullYear();
      }
      return false;
    }
    if (step === 3) return !!contactName.trim() && !!contactEmail.trim() && password.length >= 6 && emailVerified;
    if (step === 4) {
      if (loggedInClub) return teamEntries.length > 0 && teamEntries.every(e => !!e.classId);
      return newClubTeams.length > 0;
    }
    return false;
  }

  /* ─── LOADING ── */
  if (!tournament && !notFound) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 animate-spin" style={{ color: "var(--cat-accent)" }} />
    </div>
  );

  if (notFound) return (
    <div className="py-20 text-center">
      <p style={{ color: "var(--cat-text-secondary)" }}>Турнир не найден</p>
      <Link href="/catalog" className="text-sm mt-2 block hover:underline" style={{ color: "var(--cat-accent)" }}>← Каталог</Link>
    </div>
  );

  /* ─── If registration closed ── */
  if (!tournament!.registrationOpen) return (
    <div className="py-20 text-center space-y-4">
      <div className="w-16 h-16 rounded-full mx-auto flex items-center justify-center"
        style={{ background: "var(--cat-tag-bg)" }}>
        <Shield className="w-8 h-8" style={{ color: "var(--cat-text-muted)" }} />
      </div>
      <h2 className="text-xl font-black" style={{ color: "var(--cat-text)" }}>Регистрация закрыта</h2>
      <p className="text-sm" style={{ color: "var(--cat-text-secondary)" }}>Приём заявок на этот турнир завершён.</p>
      <Link href={`/t/${orgSlug}/${tournamentSlug}`}
        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-80"
        style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text)" }}>
        <ArrowLeft className="w-4 h-4" /> {t("backToTournament")}
      </Link>
    </div>
  );

  /* ─── SUCCESS STATES ── */
  if (view === "done-join") return (
    <div className="py-16 text-center space-y-5 max-w-md mx-auto">
      <div className="w-20 h-20 rounded-full mx-auto flex items-center justify-center"
        style={{ background: "var(--cat-badge-open-bg)", border: "2px solid var(--cat-badge-open-border)" }}>
        <CheckCircle className="w-10 h-10" style={{ color: "var(--cat-accent)" }} />
      </div>
      <h2 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>Запрос отправлен!</h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
        Организатор и администратор клуба <strong style={{ color: "var(--cat-text)" }}>{selectedClub?.name}</strong> получили ваш запрос.
        Вам напишут на <strong style={{ color: "var(--cat-text)" }}>{joinEmail}</strong>.
      </p>
      <Link href={`/t/${orgSlug}/${tournamentSlug}`}
        className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90"
        style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
        {t("viewTournament")} <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );

  if (view === "done-create") return (
    <div className="py-16 text-center space-y-5 max-w-md mx-auto">
      <DoneCreateAutoRedirect />
      <div className="relative w-20 h-20 mx-auto">
        <div className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: "var(--cat-badge-open-bg)", border: "2px solid var(--cat-badge-open-border)" }}>
          <Sparkles className="w-10 h-10" style={{ color: "var(--cat-accent)" }} />
        </div>
      </div>
      <h2 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>{t("registrationSuccess")}</h2>
      <p className="text-sm leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
        {t("registrationSuccessDesc", { tournament: tournament!.name, email: contactEmail })}
      </p>
      <div className="flex flex-col gap-2 items-center">
        {/* /api/clubs/register has already set the session cookie, so go
            straight to the dashboard — the user just typed a password and
            verified an email two clicks ago, asking them to log in again
            is friction with no upside. */}
        <Link href="/club/dashboard"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90"
          style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
          <LogIn className="w-4 h-4" /> Открыть кабинет клуба
        </Link>
        <Link href={`/t/${orgSlug}/${tournamentSlug}`}
          className="text-sm hover:underline" style={{ color: "var(--cat-text-muted)" }}>
          {t("viewTournament")} →
        </Link>
      </div>
    </div>
  );

  /* ─── SEARCH VIEW ── */
  if (view === "search") return (
    <div className="max-w-lg mx-auto py-6 space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-6 h-6 rounded-lg flex items-center justify-center"
            style={{ background: "var(--cat-badge-open-bg)" }}>
            <Building2 className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
          </div>
          <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
            Регистрация клуба
          </span>
        </div>
        <h1 className="text-2xl font-black" style={{ color: "var(--cat-text)" }}>
          Найдите ваш клуб
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--cat-text-secondary)" }}>
          Возможно, ваш клуб уже зарегистрирован в <strong style={{ color: "var(--cat-text)" }}>{tournament!.name}</strong>. Проверьте сначала.
        </p>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "var(--cat-text-muted)" }} />
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Название клуба или email..."
          className="w-full pl-10 pr-4 py-3 rounded-xl border text-sm outline-none transition-all"
          style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
          onFocus={e => { e.currentTarget.style.borderColor = "var(--cat-accent)"; e.currentTarget.style.boxShadow = "0 0 0 3px var(--cat-input-focus-glow)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "var(--cat-input-border)"; e.currentTarget.style.boxShadow = "none"; }}
          autoFocus
        />
        {searching && (
          <Loader2 className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin" style={{ color: "var(--cat-text-muted)" }} />
        )}
      </div>

      {results.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
            <Users className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
            <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
              Клубы в этом турнире ({results.length})
            </p>
          </div>
          <div className="p-2 space-y-1">
            {results.map(club => (
              <ClubCard key={club.id} club={club} onSelect={() => { setSelected(club); setView("join"); }} />
            ))}
          </div>
        </div>
      )}

      {/* Global clubs that aren't in this tournament yet — pick one to
          pre-fill the create-club form with its name (badge etc inherited
          server-side once the user submits team data). */}
      {globalResults.length > 0 && (
        <div className="rounded-2xl border overflow-hidden" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
            <Search className="w-3.5 h-3.5" style={{ color: "var(--cat-text-muted)" }} />
            <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
              Из глобальной базы — пока не в турнире ({globalResults.length})
            </p>
          </div>
          <div className="p-2 space-y-1">
            {globalResults.map(club => (
              <ClubCard
                key={club.id}
                club={club}
                onSelect={() => {
                  // Skip the club-info wizard step — we already know
                  // name/country/city/badge from the global DB. The
                  // auth step itself offers two tabs: "log in" for an
                  // existing account or "sign up" to create a fresh
                  // clubUser tied to this same club. If the club has
                  // an admin, default to login (most common case for a
                  // returning coach); otherwise default to signup.
                  setClubName(club.name);
                  setCountry(club.country ?? "");
                  setCity(club.city ?? "");
                  setPickedGlobalClubId(club.id);
                  setPickedGlobalClubHasAdmin(!!club.hasAdmin);
                  setAuthMode(club.hasAdmin ? "login" : "signup");
                  setJoinTeamId(null);
                  setNewTeamMode(false);
                  setView("create");
                  setStep(2); // team-picker
                }}
              />
            ))}
          </div>
        </div>
      )}

      {query.length >= 2 && !searching && results.length === 0 && globalResults.length === 0 && (
        <div className="rounded-2xl border px-4 py-4 text-center" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--cat-text)" }}>Клуб не найден</p>
          <p className="text-[12px]" style={{ color: "var(--cat-text-muted)" }}>Зарегистрируйте новый клуб ниже</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--cat-divider)" }} />
        <span className="text-[11px] font-semibold" style={{ color: "var(--cat-text-faint)" }}>или</span>
        <div className="flex-1 h-px" style={{ background: "var(--cat-divider)" }} />
      </div>

      <button
        onClick={() => { setClubName(query); setView("create"); setStep(1); }}
        className="w-full flex items-center justify-between px-5 py-4 rounded-2xl border transition-all hover:scale-[1.01] group"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-accent)"; (e.currentTarget as HTMLElement).style.background = "var(--cat-pill-active-bg)"; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-card-border)"; (e.currentTarget as HTMLElement).style.background = "var(--cat-card-bg)"; }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "var(--cat-badge-open-bg)" }}>
            <Plus className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
          </div>
          <div className="text-left">
            <p className="text-sm font-black" style={{ color: "var(--cat-text)" }}>Зарегистрировать новый клуб</p>
            <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>Создайте клуб и зарегистрируйте команды</p>
          </div>
        </div>
        <ChevronRight className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
      </button>

      <p className="text-xs text-center" style={{ color: "var(--cat-text-muted)" }}>
        {t("alreadyRegistered")}{" "}
        <Link href="/login" className="hover:underline" style={{ color: "var(--cat-accent)" }}>{t("signInHere")}</Link>
      </p>
    </div>
  );

  /* ─── JOIN REQUEST VIEW ── */
  if (view === "join") return (
    <div className="max-w-lg mx-auto py-6 space-y-5">
      <button onClick={() => setView("search")}
        className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
        style={{ color: "var(--cat-text-muted)" }}>
        <ArrowLeft className="w-4 h-4" /> Назад
      </button>

      <div>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
          Запрос на вступление
        </span>
        <h1 className="text-2xl font-black mt-1" style={{ color: "var(--cat-text)" }}>
          Вступить в клуб
        </h1>
      </div>

      {selectedClub && (
        <div className="flex items-center gap-3 p-4 rounded-2xl border"
          style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
          {selectedClub.badgeUrl ? (
            <img src={selectedClub.badgeUrl} alt="" className="w-12 h-12 rounded-xl object-contain" />
          ) : (
            <div className="w-12 h-12 rounded-xl flex items-center justify-center text-sm font-black"
              style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
              {selectedClub.name.split(" ").map(w => w[0]).slice(0, 2).join("").toUpperCase()}
            </div>
          )}
          <div>
            <p className="font-black" style={{ color: "var(--cat-text)" }}>{selectedClub.name}</p>
            <p className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
              {[selectedClub.city, selectedClub.country].filter(Boolean).join(", ")}
              {selectedClub.teamCount > 0 && ` · ${selectedClub.teamCount} команд в турнире`}
            </p>
          </div>
        </div>
      )}

      <div className="rounded-2xl border p-5 space-y-4"
        style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
        <Field label="Ваше имя" value={joinName} onChange={setJoinName} placeholder="John Smith" required />
        <Field label="Email" type="email" value={joinEmail} onChange={setJoinEmail} placeholder="john@club.example" required />
        <div>
          <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
            Ваша роль
          </label>
          <div className="grid grid-cols-2 gap-2">
            {ROLES.map(r => (
              <button key={r.value} type="button" onClick={() => setJoinRole(r.value)}
                className="px-3 py-2 rounded-xl text-[12px] font-semibold border transition-all"
                style={joinRole === r.value ? {
                  background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)", color: "var(--cat-accent)",
                } : {
                  background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)",
                }}>
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {joinError && (
        <p className="text-sm text-red-400 px-4 py-3 rounded-xl" style={{ background: "rgba(239,68,68,0.1)" }}>{joinError}</p>
      )}

      <button onClick={handleJoin} disabled={joining}
        className="w-full py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-opacity hover:opacity-90 disabled:opacity-50"
        style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))", color: "var(--cat-accent-text)" }}>
        {joining ? <><Loader2 className="w-4 h-4 animate-spin" /> Отправка...</> : <>Отправить запрос <ArrowRight className="w-4 h-4" /></>}
      </button>

      <p className="text-[11px] text-center" style={{ color: "var(--cat-text-faint)" }}>
        Организатор турнира получит ваш запрос и свяжется с вами
      </p>
    </div>
  );

  /* ─── CREATE WIZARD VIEW ── */
  return (
    <div className="max-w-lg mx-auto py-6 space-y-5">
      <button onClick={() => {
        if (loggedInClub) return; // logged-in club can't go back in wizard
        if (isFirstStep) { setView("search"); return; }
        gotoPrev();
      }}
        className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
        style={{ color: "var(--cat-text-muted)", visibility: loggedInClub ? "hidden" : "visible" }}>
        <ArrowLeft className="w-4 h-4" /> {isFirstStep ? "Назад к поиску" : "Назад"}
      </button>

      <div>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
          {loggedInClub
            ? `${loggedInClub.name} · Регистрация`
            : pickedGlobalClubId !== null
              ? `${clubName} · Шаг ${stepIdx + 1} из ${flowSteps.length}`
              : `Новый клуб · Шаг ${stepIdx + 1} из ${flowSteps.length}`}
        </span>
        <h1 className="text-2xl font-black mt-1" style={{ color: "var(--cat-text)" }}>
          {loggedInClub ? `Команды для ${tournament!.name}` : (
            step === 1 ? "Данные клуба"
              : step === 2 ? "Ваша команда"
              : step === 3 ? "Ваш аккаунт"
              : "Команды для регистрации"
          )}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--cat-text-secondary)" }}>
          {loggedInClub
            ? "Выберите команды клуба или создайте новую"
            : (step === 1 ? "Расскажите о вашем клубе"
              : step === 2 ? `Какую команду клуба «${clubName}» вы тренируете?`
              : step === 3 ? (pickedGlobalClubId !== null
                  ? `Создайте вход в личный кабинет клуба «${clubName}»`
                  : "Создайте вход в личный кабинет клуба")
              : `Выберите дивизионы в турнире ${tournament!.name}`)}
        </p>
      </div>

      {!loggedInClub && <StepBar step={stepIdx + 1} total={flowSteps.length} />}

      {/* ── Step 1: Club info ── */}
      {!loggedInClub && step === 1 && (
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl border-2 border-dashed overflow-hidden shrink-0 flex items-center justify-center"
              style={{ borderColor: "var(--cat-input-border)", background: "var(--cat-input-bg)" }}>
              {logoPreview ? (
                <img src={logoPreview} alt="" className="w-full h-full object-contain" />
              ) : (
                <Upload className="w-5 h-5" style={{ color: "var(--cat-text-faint)" }} />
              )}
            </div>
            <div>
              <label className="cursor-pointer inline-flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-lg border transition-all hover:opacity-80"
                style={{ borderColor: "var(--cat-accent)", color: "var(--cat-accent)", background: "var(--cat-badge-open-bg)" }}>
                <Upload className="w-3.5 h-3.5" /> {t("uploadBadge")}
                <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
              </label>
              <p className="text-[10px] mt-1" style={{ color: "var(--cat-text-faint)" }}>PNG, JPG · макс 2МБ</p>
            </div>
          </div>
          <Field label={t("clubName")} value={clubName} onChange={setClubName} placeholder="FC Barcelona" required />
          {duplicateClubHint && (
            <button
              type="button"
              onClick={() => {
                // Same flow as the global-bucket pick: jump to step 2
                // and let the user choose login vs signup there.
                setPickedGlobalClubId(duplicateClubHint.id);
                setPickedGlobalClubHasAdmin(!!duplicateClubHint.hasAdmin);
                setAuthMode(duplicateClubHint.hasAdmin ? "login" : "signup");
                setClubName(duplicateClubHint.name);
                setCountry(duplicateClubHint.country ?? country);
                setCity(duplicateClubHint.city ?? city);
                setJoinTeamId(null);
                setNewTeamMode(false);
                setDuplicateClubHint(null);
                setStep(2); // team-picker
              }}
              className="w-full flex items-start gap-3 px-4 py-3 rounded-xl border text-left transition-all hover:scale-[1.005]"
              style={{ background: "rgba(245,158,11,0.08)", borderColor: "rgba(245,158,11,0.35)" }}
            >
              <span className="text-lg shrink-0 leading-none mt-0.5">⚠️</span>
              <span className="flex-1 min-w-0">
                <span className="text-sm font-bold block" style={{ color: "var(--cat-text)" }}>
                  Такой клуб уже есть: {duplicateClubHint.name}
                </span>
                <span className="text-xs block mt-0.5" style={{ color: "var(--cat-text-muted)" }}>
                  {[duplicateClubHint.city, duplicateClubHint.country].filter(Boolean).join(", ")} · нажмите чтобы использовать его, не создавая дубликат
                </span>
              </span>
            </button>
          )}
          <div className="grid grid-cols-2 gap-3">
            <CountrySelect label={t("country")} value={country} onChange={setCountry} required />
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
                {t("city")}<span className="text-red-400 ml-0.5">*</span>
              </label>
              <CityInput value={city} onChange={setCity} country={country} placeholder="Barcelona" variant="onboarding" />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Team picker (existing-club path only) ── */}
      {!loggedInClub && step === 2 && (
        <div className="rounded-2xl border p-5 space-y-3"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          {clubTeamsLoading ? (
            <div className="py-6 flex items-center justify-center" style={{ color: "var(--cat-text-muted)" }}>
              <Loader2 className="w-4 h-4 animate-spin mr-2" /> Загружаем команды клуба…
            </div>
          ) : (
            <>
              {clubTeamsList.length > 0 && (
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--cat-text-muted)" }}>
                    Существующие команды клуба
                  </p>
                  {clubTeamsList.map(t => {
                    const sel = !newTeamMode && joinTeamId === t.id;
                    const genderIcon = t.gender === "male" ? "♂" : t.gender === "female" ? "♀" : "⚥";
                    const genderColor = t.gender === "male" ? "#3B82F6" : t.gender === "female" ? "#EC4899" : "#8B5CF6";
                    const noYear = t.birthYear === null;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => { setJoinTeamId(t.id); setNewTeamMode(false); }}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all"
                        style={{
                          background: sel ? "var(--cat-badge-open-bg)" : "var(--cat-tag-bg)",
                          borderColor: sel ? "var(--cat-accent)" : "var(--cat-card-border)",
                        }}
                      >
                        <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                          style={{ borderColor: sel ? "var(--cat-accent)" : "var(--cat-input-border)" }}>
                          {sel && <div className="w-2 h-2 rounded-full" style={{ background: "var(--cat-accent)" }} />}
                        </div>

                        {/* Year-of-birth tile — primary identity */}
                        <div
                          className="shrink-0 rounded-xl flex flex-col items-center justify-center w-14 h-14"
                          style={{
                            background: noYear ? "rgba(245,158,11,0.12)" : "var(--cat-card-bg)",
                            border: `1px solid ${noYear ? "rgba(245,158,11,0.4)" : "var(--cat-card-border)"}`,
                            color: noYear ? "#f59e0b" : "var(--cat-text)",
                          }}
                        >
                          <span className="text-[18px] font-black leading-none">
                            {t.birthYear ?? "?"}
                          </span>
                          <span className="text-[14px] leading-none mt-0.5" style={{ color: genderColor }}>
                            {genderIcon}
                          </span>
                        </div>

                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold truncate" style={{ color: "var(--cat-text)" }}>
                            {t.name ?? (t.birthYear ? `Команда ${t.birthYear}` : "Команда без года")}
                          </p>
                          <p className="text-[11px]" style={{ color: noYear ? "#f59e0b" : "var(--cat-text-muted)" }}>
                            {noYear
                              ? "⚠ Год не указан — попросите админа клуба исправить или создайте новую команду"
                              : `${t.birthYear} · ${t.gender === "male" ? "Мальчики" : t.gender === "female" ? "Девочки" : "Смешанная"}`}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Create-new-team toggle */}
              <button
                type="button"
                onClick={() => { setNewTeamMode(v => !v); setJoinTeamId(null); }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl border text-left transition-all border-dashed"
                style={{
                  background: newTeamMode ? "var(--cat-badge-open-bg)" : "transparent",
                  borderColor: newTeamMode ? "var(--cat-accent)" : "var(--cat-card-border)",
                }}
              >
                <div className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                  style={{ borderColor: newTeamMode ? "var(--cat-accent)" : "var(--cat-input-border)" }}>
                  {newTeamMode && <div className="w-2 h-2 rounded-full" style={{ background: "var(--cat-accent)" }} />}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                    + Создать новую команду
                  </p>
                  <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                    Если вашей команды ещё нет в клубе — добавьте её
                  </p>
                </div>
              </button>

              {/* New-team form */}
              {newTeamMode && (
                <div className="space-y-3 p-4 rounded-xl border"
                  style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                  <div>
                    <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
                      Название команды
                    </label>
                    <input
                      type="text"
                      value={newTeamName}
                      onChange={e => setNewTeamName(e.target.value)}
                      placeholder={clubName || "Название"}
                      className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                      style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
                        Год рождения<span className="text-red-400 ml-0.5">*</span>
                      </label>
                      <input
                        type="number"
                        inputMode="numeric"
                        value={newTeamBirthYear}
                        onChange={e => setNewTeamBirthYear(e.target.value.replace(/\D/g, "").slice(0, 4))}
                        placeholder="2015"
                        className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                        style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
                      />
                    </div>
                    <div>
                      <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
                        Пол
                      </label>
                      <div className="flex gap-1">
                        {(["male", "female", "mixed"] as const).map(g => (
                          <button
                            key={g}
                            type="button"
                            onClick={() => setNewTeamGender(g)}
                            className="flex-1 rounded-xl py-2 text-xs font-semibold border transition-all"
                            style={newTeamGender === g
                              ? { background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-accent)", color: "var(--cat-accent)" }
                              : { background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text-muted)" }}
                          >
                            {g === "male" ? "♂" : g === "female" ? "♀" : "⚥"}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                  <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                    Год рождения обязателен — это базовая идентичность команды. Своё название можно оставить пустым (отобразится «{clubName} {newTeamBirthYear || "год"}»).
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ── Step 3: Account (login or signup) ── */}
      {!loggedInClub && step === 3 && (
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          {/* Login/signup tabs — only when an existing club is picked.
              For "Зарегистрировать новый клуб" the user must sign up. */}
          {pickedGlobalClubId !== null && (
            <div className="flex gap-2 p-1 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
              <button
                type="button"
                onClick={() => setAuthMode("login")}
                className="flex-1 rounded-lg py-2 text-sm font-bold transition-all"
                style={{
                  background: authMode === "login" ? "var(--cat-accent)" : "transparent",
                  color: authMode === "login" ? "#000" : "var(--cat-text-muted)",
                }}
              >
                У меня уже есть аккаунт
              </button>
              <button
                type="button"
                onClick={() => setAuthMode("signup")}
                className="flex-1 rounded-lg py-2 text-sm font-bold transition-all"
                style={{
                  background: authMode === "signup" ? "var(--cat-accent)" : "transparent",
                  color: authMode === "signup" ? "#000" : "var(--cat-text-muted)",
                }}
              >
                Создать аккаунт
              </button>
            </div>
          )}

          {/* Inline login form — replaces the redirect to /login. */}
          {pickedGlobalClubId !== null && authMode === "login" && (
            <div className="space-y-3">
              <p className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                Войдите под своим аккаунтом — после входа сразу перейдёте к выбору команд для турнира.
              </p>
              <Field label={t("emailLabel")} type="email" value={loginEmail} onChange={setLoginEmail} placeholder="coach@club.example" required />
              <Field label={t("passwordLabel")} type="password" value={loginPassword} onChange={setLoginPassword} placeholder="••••••••" required />
              {loginError && (
                <p className="text-[11px]" style={{ color: "#ef4444" }}>{loginError}</p>
              )}
              <button
                type="button"
                onClick={inlineLogin}
                disabled={loginBusy}
                className="w-full rounded-xl py-3 text-sm font-black transition-all hover:opacity-90 disabled:opacity-40"
                style={{ background: "var(--cat-accent)", color: "#000" }}
              >
                {loginBusy ? "Входим…" : "Войти"}
              </button>
              <p className="text-[11px] text-center" style={{ color: "var(--cat-text-muted)" }}>
                Забыли пароль? <a href="/forgot-password" className="underline" style={{ color: "var(--cat-accent)" }}>Восстановить</a>
              </p>
            </div>
          )}

          {/* Signup form — same as before, gated by email verification. */}
          {(pickedGlobalClubId === null || authMode === "signup") && (
          <>
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
            <Shield className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
            <p className="text-[11px]" style={{ color: "var(--cat-text-secondary)" }}>
              {pickedGlobalClubHasAdmin
                ? "Создайте свой аккаунт — у клуба уже есть администратор, ваш аккаунт будет добавлен как тренер."
                : t("loginCredentialsHint")}
            </p>
          </div>
          <Field label={t("contactPerson")} value={contactName} onChange={setContactName} placeholder="John Smith" required />

          {/* Email + 6-digit verification — required before continuing.
              Backend (/api/clubs/register) refuses to create an account
              without a recent verified row for this address. */}
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
              {t("emailLabel")}<span className="text-red-400 ml-0.5">*</span>
            </label>
            <div className="flex gap-2">
              <input
                type="email"
                value={contactEmail}
                onChange={e => onEmailChange(e.target.value)}
                placeholder="coach@club.example"
                disabled={emailVerified}
                className="flex-1 rounded-xl px-3 py-2 text-sm border outline-none transition-all"
                style={{
                  background: emailVerified ? "var(--cat-tag-bg)" : "var(--cat-input-bg)",
                  borderColor: emailVerified ? "rgba(16,185,129,0.5)" : "var(--cat-input-border)",
                  color: "var(--cat-text)",
                }}
              />
              {emailVerified ? (
                <span className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shrink-0"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                  ✓ Подтверждён
                </span>
              ) : (
                <button
                  type="button"
                  onClick={sendVerifyCode}
                  disabled={verifyPhase === "sending" || !contactEmail.trim().includes("@")}
                  className="px-3 py-2 rounded-xl text-xs font-bold shrink-0 transition-all hover:opacity-90 disabled:opacity-40"
                  style={{ background: "var(--cat-accent)", color: "#000" }}
                >
                  {verifyPhase === "sending" ? "Отправляем…" : verifyPhase === "sent" ? "Отправить ещё раз" : "Отправить код"}
                </button>
              )}
            </div>
            {!emailVerified && (verifyPhase === "sent" || verifyPhase === "checking") && (
              <div className="mt-3 p-3 rounded-xl border space-y-2"
                style={{ background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)" }}>
                <p className="text-[12px]" style={{ color: "var(--cat-text-secondary)" }}>
                  Код отправлен на <strong style={{ color: "var(--cat-text)" }}>{contactEmail}</strong>. Проверьте почту (и папку «Спам»).
                </p>
                <div className="flex gap-2">
                  <input
                    type="text"
                    inputMode="numeric"
                    maxLength={6}
                    value={verifyCode}
                    onChange={e => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="000000"
                    className="flex-1 rounded-xl px-3 py-2 text-base border outline-none font-mono tracking-[0.5em] text-center"
                    style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={checkVerifyCode}
                    disabled={verifyPhase === "checking" || verifyCode.length !== 6}
                    className="px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all hover:opacity-90 disabled:opacity-40"
                    style={{ background: "var(--cat-accent)", color: "#000" }}
                  >
                    {verifyPhase === "checking" ? "Проверяем…" : "Проверить"}
                  </button>
                </div>
              </div>
            )}
            {verifyError && (
              <p className="mt-2 text-[11px]" style={{ color: "#ef4444" }}>{verifyError}</p>
            )}
            {!emailVerified && verifyPhase === "idle" && (
              <p className="mt-1.5 text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                Подтвердите email — на него организаторы будут присылать важную информацию о турнире.
              </p>
            )}
          </div>

          <Field label={t("passwordLabel")} type="password" value={password} onChange={setPassword}
            placeholder="Минимум 6 символов" hint={t("passwordMinHint")} required />
          </>
          )}
        </div>
      )}

      {/* ── Step 4: Tournament classes (NEW CLUB) ── */}
      {!loggedInClub && step === 4 && (
        <div className="space-y-3">
          {classes.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <p style={{ color: "var(--cat-text-muted)" }}>Дивизионы не настроены организатором</p>
            </div>
          ) : (
            classes.map((cls, i) => {
              const isSelected = newClubTeams.some(t => t.classId === String(cls.id));
              const color = DIV_COLORS[i % DIV_COLORS.length];
              const teamEntry = newClubTeams.find(t => t.classId === String(cls.id));
              return (
                <div key={cls.id} className="rounded-2xl border transition-all overflow-hidden"
                  style={{ background: "var(--cat-card-bg)", borderColor: isSelected ? color : "var(--cat-card-border)" }}>
                  <div className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => toggleClass(String(cls.id))}>
                    <div className="w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-all"
                      style={isSelected ? { background: color, borderColor: color } : { borderColor: "var(--cat-input-border)" }}>
                      {isSelected && <span className="text-white text-[10px] font-black">✓</span>}
                    </div>
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ background: color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>{cls.name}</p>
                      {cls.format && (
                        <p className="text-[10px]" style={{ color: "var(--cat-text-muted)" }}>
                          {cls.format}
                          {cls.minBirthYear ? ` · ${cls.minBirthYear}` : ""}
                          {cls.maxBirthYear && cls.maxBirthYear !== cls.minBirthYear ? `–${cls.maxBirthYear}` : ""}
                        </p>
                      )}
                    </div>
                    <Trophy className="w-3.5 h-3.5 shrink-0" style={{ color: isSelected ? color : "var(--cat-text-faint)" }} />
                  </div>
                  {isSelected && (
                    <div className="px-4 pb-3">
                      <input type="text" value={teamEntry?.name ?? ""}
                        onChange={e => updateTeamName(String(cls.id), e.target.value)}
                        placeholder={`Название команды (необязательно) · ${clubName || "FC Club"}`}
                        className="w-full rounded-xl px-3 py-2 text-[12px] border outline-none"
                        style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
                        onClick={e => e.stopPropagation()}
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
          {newClubTeams.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: "var(--cat-badge-open-bg)" }}>
              <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
              <p className="text-[12px] font-semibold" style={{ color: "var(--cat-text)" }}>
                Выбрано: <strong>{newClubTeams.length}</strong> {newClubTeams.length === 1 ? "команда" : newClubTeams.length < 5 ? "команды" : "команд"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Step 4: Tournament classes (LOGGED-IN CLUB) ── */}
      {loggedInClub && (
        <div className="space-y-4">
          {/* Existing teams of this club */}
          {teamsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin" style={{ color: "var(--cat-accent)" }} />
            </div>
          ) : existingTeams.length > 0 ? (
            <div className="rounded-2xl border overflow-hidden"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <div className="px-4 py-2.5 flex items-center gap-2" style={{ borderBottom: "1px solid var(--cat-divider)" }}>
                <Users className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                <p className="text-[11px] font-black uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
                  Команды клуба ({existingTeams.length})
                </p>
              </div>
              <div className="divide-y" style={{ borderColor: "var(--cat-divider)" }}>
                {existingTeams.map(team => {
                  const entry = teamEntries.find(e => e.teamId === team.id);
                  const alreadyAdded = !!entry;
                  const submitted = (team.currentSquads ?? []).filter(s => s.status !== "cancelled");
                  const alreadySubmitted = submitted.length > 0;
                  return (
                    <div key={team.id}
                      className="px-4 py-3 transition-all"
                      style={{ background: alreadyAdded ? "var(--cat-badge-open-bg)" : undefined }}>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 min-w-0">
                          <TeamIdentityBadge team={team} clubName={loggedInClub.name} />
                          {team.playersCount > 0 && (
                            <p className="text-[10px] mt-0.5 ml-0" style={{ color: "var(--cat-text-faint)" }}>
                              {team.playersCount} игроков
                            </p>
                          )}
                        </div>
                        {alreadyAdded ? (
                          <button onClick={() => removeEntry(entry!.key)}
                            className="flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80"
                            style={{ background: "rgba(239,68,68,0.12)", color: "#ef4444" }}>
                            <X className="w-3 h-3" /> Убрать заявку
                          </button>
                        ) : alreadySubmitted ? null : (
                          <button onClick={() => addExistingTeam(team)}
                            className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl border transition-all hover:opacity-80"
                            style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)", color: "var(--cat-accent)" }}>
                            <Plus className="w-3.5 h-3.5" /> Заявить на турнир
                          </button>
                        )}
                      </div>

                      {/* Submitted squads — one block per server-side
                          tournament_registration. Status drives the visual:
                          open=amber "ждём ответа", confirmed=green
                          "подтверждена", anything else = neutral. */}
                      {alreadySubmitted && submitted.map(squad => {
                        const isEditingThis = editingRegId === squad.registrationId;
                        const busy = busyRegId === squad.registrationId;
                        const label = squad.className || squad.displayName || `#${squad.regNumber}`;
                        const statusViz =
                          squad.status === "confirmed"
                            ? { icon: "✓", text: "Подтверждена организатором", color: "#10b981", bg: "rgba(16,185,129,0.10)", border: "rgba(16,185,129,0.35)" }
                            : squad.status === "open"
                              ? { icon: "🕓", text: "На рассмотрении организатором", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.35)" }
                              : squad.status === "draft"
                                ? { icon: "📝", text: "Черновик", color: "var(--cat-text-muted)", bg: "var(--cat-tag-bg)", border: "var(--cat-card-border)" }
                                : { icon: "•", text: squad.status, color: "var(--cat-text-muted)", bg: "var(--cat-tag-bg)", border: "var(--cat-card-border)" };
                        return (
                          <div key={squad.registrationId}
                            className="mt-2 rounded-xl border p-3"
                            style={{
                              background: statusViz.bg,
                              borderColor: isEditingThis ? "var(--cat-accent)" : statusViz.border,
                            }}>
                            {!isEditingThis ? (
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1"
                                  style={{ background: statusViz.bg, color: statusViz.color, border: `1px solid ${statusViz.border}` }}>
                                  <span aria-hidden>{statusViz.icon}</span> {statusViz.text}
                                </span>
                                <span className="text-[12px] font-bold" style={{ color: "var(--cat-text)" }}>
                                  {squad.className}
                                </span>
                                {squad.displayName && (
                                  <span className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>
                                    · {squad.displayName}
                                  </span>
                                )}
                                {squad.squadAlias && (
                                  <span className="text-[10px] px-1.5 py-0.5 rounded"
                                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-muted)" }}>
                                    {squad.squadAlias}
                                  </span>
                                )}
                                {squad.regNumber && (
                                  <span className="text-[10px]" style={{ color: "var(--cat-text-faint)" }}>
                                    №{squad.regNumber}
                                  </span>
                                )}
                                <div className="ml-auto flex gap-1.5">
                                  <button type="button"
                                    onClick={() => startEditingRegistration(squad.registrationId, squad.classId, squad.displayName)}
                                    disabled={busy || squad.status === "confirmed"}
                                    title={squad.status === "confirmed" ? "Подтверждённую заявку нельзя изменить — попросите организатора" : ""}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80 disabled:opacity-30 disabled:cursor-not-allowed"
                                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}>
                                    Изменить
                                  </button>
                                  <button type="button"
                                    onClick={() => withdrawRegistration(squad.registrationId, label)}
                                    disabled={busy}
                                    className="text-[11px] font-semibold px-2.5 py-1 rounded-lg transition-all hover:opacity-80 disabled:opacity-40"
                                    style={{ background: "rgba(239,68,68,0.10)", color: "#ef4444" }}>
                                    {busy ? "..." : "Отзаявить"}
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                                    Дивизион
                                  </p>
                                  <div className="flex flex-wrap gap-1.5">
                                    {classes.map(c => {
                                      const sel = editingClassId === String(c.id);
                                      return (
                                        <button key={c.id} type="button"
                                          onClick={() => setEditingClassId(String(c.id))}
                                          className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-90"
                                          style={sel
                                            ? { background: "var(--cat-accent)", borderColor: "var(--cat-accent)", color: "#000" }
                                            : { background: "var(--cat-tag-bg)", borderColor: "var(--cat-card-border)", color: "var(--cat-text-secondary)" }}>
                                          {c.name}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                                <div>
                                  <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                                    Название в турнире
                                  </p>
                                  <input type="text"
                                    value={editingDisplayName}
                                    onChange={e => setEditingDisplayName(e.target.value)}
                                    placeholder={loggedInClub.name}
                                    className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                                    style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
                                  />
                                </div>
                                <div className="flex gap-2 pt-1">
                                  <button type="button"
                                    onClick={saveEditedRegistration}
                                    disabled={busy}
                                    className="px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all hover:opacity-90 disabled:opacity-40"
                                    style={{ background: "var(--cat-accent)", color: "#000" }}>
                                    {busy ? "Сохраняем…" : "Сохранить"}
                                  </button>
                                  <button type="button"
                                    onClick={() => setEditingRegId(null)}
                                    className="px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all hover:opacity-80"
                                    style={{ background: "var(--cat-tag-bg)", color: "var(--cat-text-secondary)" }}>
                                    Отмена
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}

                      {/* Inline registration editor — shows up right under
                          the team row when this team is in teamEntries.
                          Class auto-picked from birth year, name pre-fills
                          to "<Club> <Year>", but both are editable. */}
                      {alreadyAdded && (
                        <div className="mt-3 pl-1 space-y-3">
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                              Дивизион в турнире<span className="text-red-400 ml-0.5">*</span>
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {classes.map(c => {
                                const sel = entry!.classId === String(c.id);
                                const matchesYear = team.birthYear &&
                                  (c.minBirthYear ?? -Infinity) <= team.birthYear &&
                                  (c.maxBirthYear ?? Infinity) >= team.birthYear;
                                return (
                                  <button key={c.id} type="button"
                                    onClick={() => updateEntry(entry!.key, { classId: String(c.id) })}
                                    className="text-[12px] font-semibold px-3 py-1.5 rounded-lg border transition-all hover:opacity-90"
                                    style={sel
                                      ? { background: "var(--cat-accent)", borderColor: "var(--cat-accent)", color: "#000" }
                                      : { background: "var(--cat-tag-bg)", borderColor: matchesYear ? "var(--cat-accent)" : "var(--cat-card-border)", color: "var(--cat-text-secondary)" }
                                    }>
                                    {c.name}
                                    {matchesYear && !sel && <span className="ml-1" style={{ color: "var(--cat-accent)" }}>★</span>}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <p className="text-[10px] font-black uppercase tracking-wider mb-1.5" style={{ color: "var(--cat-text-muted)" }}>
                              Название в этом турнире
                            </p>
                            <input type="text"
                              value={entry!.displayName ?? ""}
                              onChange={e => updateEntry(entry!.key, { displayName: e.target.value })}
                              placeholder={`${loggedInClub.name}`}
                              className="w-full rounded-xl px-3 py-2 text-sm border outline-none"
                              style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text)" }}
                            />
                            <input type="text"
                              value={entry!.squadAlias ?? ""}
                              onChange={e => updateEntry(entry!.key, { squadAlias: e.target.value })}
                              placeholder="Псевдоним состава (Black/White) — необязательно"
                              className="mt-2 w-full rounded-xl px-3 py-2 text-[12px] border outline-none"
                              style={{ background: "var(--cat-input-bg)", borderColor: "var(--cat-input-border)", color: "var(--cat-text-secondary)" }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="px-4 py-6 rounded-2xl border text-center"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <p className="text-sm" style={{ color: "var(--cat-text-muted)" }}>У клуба нет постоянных команд</p>
              <p className="text-[11px] mt-1" style={{ color: "var(--cat-text-faint)" }}>Создайте команду ниже</p>
            </div>
          )}

          {/* Brand-new teams (not in existingTeams) — filled-out entries
              still need to be visible somewhere; show only those. */}
          {teamEntries.some(e => !e.teamId) && (
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
                Новые команды ({teamEntries.filter(e => !e.teamId).length})
              </p>
              {teamEntries.filter(e => !e.teamId).map(entry => {
                const team = { id: 0, name: null, birthYear: entry.birthYear ?? null, gender: entry.gender, totalTournaments: 0, playersCount: 0 };
                return (
                  <ExistingTeamEntry key={entry.key}
                    team={team} entry={entry} classes={classes} clubName={loggedInClub.name}
                    onUpdate={patch => updateEntry(entry.key, patch)}
                    onRemove={() => removeEntry(entry.key)}
                  />
                );
              })}
            </div>
          )}

          {/* New team form */}
          {showNewTeamForm ? (
            <NewTeamForm
              classes={classes}
              clubName={loggedInClub.name}
              onAdd={addNewTeamEntry}
              onCancel={() => setShowNewTeamForm(false)}
            />
          ) : (
            <button onClick={() => setShowNewTeamForm(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl border-2 border-dashed text-sm font-bold transition-all hover:opacity-70"
              style={{ borderColor: "var(--cat-card-border)", color: "var(--cat-text-muted)" }}>
              <Plus className="w-4 h-4" /> Добавить новую команду
            </button>
          )}

          {/* Summary */}
          {teamEntries.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: "var(--cat-badge-open-bg)" }}>
              <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
              <p className="text-[12px] font-semibold" style={{ color: "var(--cat-text)" }}>
                К регистрации: <strong>{teamEntries.length}</strong> {teamEntries.length === 1 ? "команда" : teamEntries.length < 5 ? "команды" : "команд"}
              </p>
              {teamEntries.some(e => !e.classId) && (
                <span className="text-[11px] text-amber-500 font-semibold ml-auto">⚠ Выберите дивизион</span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="px-4 py-3 rounded-xl text-sm space-y-2" style={{ background: "rgba(239,68,68,0.1)" }}>
          <p className="text-red-400">{error}</p>
          {/* If the backend says the email is already registered, offer
              a one-click jump to /login pre-filled with the typed email
              and a `next` back to this page. */}
          {/already exists/i.test(error) && (
            <button
              type="button"
              onClick={() => {
                const next = `/t/${orgSlug}/${tournamentSlug}/register`;
                const url = `/login?next=${encodeURIComponent(next)}${contactEmail ? `&email=${encodeURIComponent(contactEmail)}` : ""}`;
                router.push(url);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all hover:opacity-90"
              style={{ background: "var(--cat-accent)", color: "#000" }}
            >
              🔐 Войти под {contactEmail || "этим email"}
            </button>
          )}
        </div>
      )}

      {/* Navigation — hide "Далее" on the login tab (inline "Войти" submits
          its own form). The last step ("Команды для регистрации") submits
          the whole registration via handleCreate. */}
      <div className="flex gap-3" hidden={!loggedInClub && step === 3 && pickedGlobalClubId !== null && authMode === "login"}>
        {!loggedInClub && !isLastStep ? (
          <button
            onClick={() => canGoNext() && gotoNext()}
            disabled={!canGoNext()}
            className="flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))", color: "var(--cat-accent-text)" }}>
            Далее <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleCreate}
            disabled={submitting || !canGoNext()}
            className="flex-1 py-3 rounded-xl text-sm font-black flex items-center justify-center gap-2 transition-all hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed"
            style={{ background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))", color: "var(--cat-accent-text)" }}>
            {submitting
              ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("submitting")}</>
              : <><Sparkles className="w-4 h-4" /> {t("submitRegistration")}</>
            }
          </button>
        )}
      </div>
    </div>
  );
}

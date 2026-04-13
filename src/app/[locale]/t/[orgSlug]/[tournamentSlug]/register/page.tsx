"use client";

import { useEffect, useState, useRef } from "react";
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
type ClubResult = { id: number; name: string; city: string | null; country: string | null; badgeUrl: string | null; contactName: string | null; teamCount: number };

type View = "search" | "join" | "create" | "done-join" | "done-create";
type Step = 1 | 2 | 3; // club info → account → teams

// Existing team in the club (from API)
type ExistingTeam = {
  id: number;
  name: string | null;
  birthYear: number | null;
  gender: "male" | "female" | "mixed";
  totalTournaments: number;
  playersCount: number;
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
      {club.badgeUrl ? (
        <img src={club.badgeUrl} alt="" className="w-10 h-10 rounded-xl object-contain p-0.5 shrink-0"
          style={{ background: "var(--cat-card-bg)" }} />
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
      <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
        style={{ color: "var(--cat-accent)" }} />
    </button>
  );
}

/* ─── Team identity badge ────────────────────────────────────────────────── */
function TeamIdentityBadge({ team }: { team: ExistingTeam }) {
  const label = team.name ?? (team.birthYear ? `${team.birthYear}` : "Взрослые");
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
      {team.name && (
        <span className="text-sm font-semibold truncate" style={{ color: "var(--cat-text)" }}>{team.name}</span>
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
        <TeamIdentityBadge team={team} />
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

  /* Wizard */
  const [view, setView]         = useState<View>("search");
  const [step, setStep]         = useState<Step>(1);

  /* Search */
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState<ClubResult[]>([]);
  const [searching, setSearching]   = useState(false);
  const [selectedClub, setSelected] = useState<ClubResult | null>(null);

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
          setStep(3);
        }
        setSessionChecked(true);
      })
      .catch(() => setSessionChecked(true));
  }, []);

  /* Load existing teams when logged-in club detected */
  useEffect(() => {
    if (!loggedInClub) return;
    setTeamsLoading(true);
    fetch(`/api/clubs/${loggedInClub.id}/teams`, { credentials: "include" })
      .then(r => r.ok ? r.json() : [])
      .then((data: ExistingTeam[]) => setExistingTeams(data))
      .catch(() => {})
      .finally(() => setTeamsLoading(false));
  }, [loggedInClub]);

  /* Debounced club search */
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/public/t/${orgSlug}/${tournamentSlug}/clubs?q=${encodeURIComponent(query)}`);
        if (r.ok) setResults(await r.json());
      } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(timer);
  }, [query, orgSlug, tournamentSlug]);

  /* ── Team entry helpers (for logged-in club) ── */
  function addExistingTeam(team: ExistingTeam) {
    // Avoid duplicate (same teamId)
    if (teamEntries.some(e => e.teamId === team.id)) return;
    setTeamEntries(prev => [...prev, {
      key: `existing-${team.id}-${Date.now()}`,
      teamId: team.id,
      gender: team.gender,
      birthYear: team.birthYear ?? undefined,
      classId: "",
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

  /* Validate steps */
  function canGoNext(): boolean {
    if (step === 1) return !!clubName.trim() && !!country.trim() && !!city.trim();
    if (step === 2) return !!contactName.trim() && !!contactEmail.trim() && password.length >= 6;
    if (step === 3) {
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
        <Link href="/login"
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-black transition-opacity hover:opacity-90"
          style={{ background: "var(--cat-accent)", color: "var(--cat-accent-text)" }}>
          <LogIn className="w-4 h-4" /> Войти в кабинет клуба
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

      {query.length >= 2 && !searching && results.length === 0 && (
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
        <Field label="Ваше имя" value={joinName} onChange={setJoinName} placeholder="Иван Иванов" required />
        <Field label="Email" type="email" value={joinEmail} onChange={setJoinEmail} placeholder="ivan@club.ee" required />
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
        step === 1 ? setView("search") : setStep(s => (s - 1) as Step);
      }}
        className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
        style={{ color: "var(--cat-text-muted)", visibility: loggedInClub ? "hidden" : "visible" }}>
        <ArrowLeft className="w-4 h-4" /> {step === 1 ? "Назад к поиску" : "Назад"}
      </button>

      <div>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
          {loggedInClub ? `${loggedInClub.name} · Регистрация` : `Новый клуб · Шаг ${step} из 3`}
        </span>
        <h1 className="text-2xl font-black mt-1" style={{ color: "var(--cat-text)" }}>
          {loggedInClub ? `Команды для ${tournament!.name}` : (
            step === 1 ? "Данные клуба" : step === 2 ? "Ваш аккаунт" : "Команды для регистрации"
          )}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--cat-text-secondary)" }}>
          {loggedInClub
            ? "Выберите команды клуба или создайте новую"
            : (step === 1 ? "Расскажите о вашем клубе"
              : step === 2 ? "Создайте вход в личный кабинет клуба"
              : `Выберите дивизионы в турнире ${tournament!.name}`)}
        </p>
      </div>

      {!loggedInClub && <StepBar step={step} total={3} />}

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
          <Field label={t("clubName")} value={clubName} onChange={setClubName} placeholder="FC Tallinn" required />
          <div className="grid grid-cols-2 gap-3">
            <CountrySelect label={t("country")} value={country} onChange={setCountry} required />
            <div>
              <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
                {t("city")}<span className="text-red-400 ml-0.5">*</span>
              </label>
              <CityInput value={city} onChange={setCity} country={country} placeholder="Tallinn" variant="onboarding" />
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: Account ── */}
      {!loggedInClub && step === 2 && (
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: "var(--cat-tag-bg)" }}>
            <Shield className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
            <p className="text-[11px]" style={{ color: "var(--cat-text-secondary)" }}>
              {t("loginCredentialsHint")}
            </p>
          </div>
          <Field label={t("contactPerson")} value={contactName} onChange={setContactName} placeholder="Ivan Ivanov" required />
          <Field label={t("emailLabel")} type="email" value={contactEmail} onChange={setContactEmail} placeholder="coach@club.ee" required />
          <Field label={t("passwordLabel")} type="password" value={password} onChange={setPassword}
            placeholder="Минимум 6 символов" hint={t("passwordMinHint")} required />
        </div>
      )}

      {/* ── Step 3: Teams (NEW CLUB) ── */}
      {!loggedInClub && step === 3 && (
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
                        placeholder={`Название команды (необязательно) · ${clubName || "FC Club"} ${cls.name}`}
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

      {/* ── Step 3: Teams (LOGGED-IN CLUB) ── */}
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
                  const alreadyAdded = teamEntries.some(e => e.teamId === team.id);
                  return (
                    <div key={team.id}
                      className="flex items-center gap-3 px-4 py-3 transition-all"
                      style={{ background: alreadyAdded ? "var(--cat-badge-open-bg)" : undefined }}>
                      <div className="flex-1 min-w-0">
                        <TeamIdentityBadge team={team} />
                        {team.playersCount > 0 && (
                          <p className="text-[10px] mt-0.5 ml-0" style={{ color: "var(--cat-text-faint)" }}>
                            {team.playersCount} игроков
                          </p>
                        )}
                      </div>
                      {alreadyAdded ? (
                        <span className="text-[11px] font-bold px-2 py-1 rounded-lg"
                          style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}>
                          Добавлена ✓
                        </span>
                      ) : (
                        <button onClick={() => addExistingTeam(team)}
                          className="flex items-center gap-1.5 text-[12px] font-bold px-3 py-1.5 rounded-xl border transition-all hover:opacity-80"
                          style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)", color: "var(--cat-accent)" }}>
                          <Plus className="w-3.5 h-3.5" /> Заявить
                        </button>
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

          {/* Selected entries with class picker */}
          {teamEntries.length > 0 && (
            <div className="space-y-3">
              <p className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-text-muted)" }}>
                Заявки ({teamEntries.length})
              </p>
              {teamEntries.map(entry => {
                const team = entry.teamId
                  ? existingTeams.find(t => t.id === entry.teamId) ?? {
                      id: entry.teamId!, name: null, birthYear: entry.birthYear ?? null,
                      gender: entry.gender, totalTournaments: 0, playersCount: 0
                    }
                  : { id: 0, name: null, birthYear: entry.birthYear ?? null, gender: entry.gender, totalTournaments: 0, playersCount: 0 };
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
        <div className="px-4 py-3 rounded-xl text-sm text-red-400" style={{ background: "rgba(239,68,68,0.1)" }}>
          {error}
        </div>
      )}

      {/* Navigation */}
      <div className="flex gap-3">
        {!loggedInClub && step < 3 ? (
          <button
            onClick={() => canGoNext() && setStep(s => (s + 1) as Step)}
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

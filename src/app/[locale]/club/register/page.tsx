"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import {
  Crown, ChevronRight, ChevronLeft, Check, Plus, Trash2,
  ImageIcon, ChevronDown, Search, ArrowLeft, AlertTriangle,
  Building2, MapPin, Users, LogIn, X,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Alert } from "@/components/ui/alert";
import { cn } from "@/lib/utils";

const COUNTRIES = [
  { name: "Estonia", flag: "🇪🇪" },
  { name: "Latvia", flag: "🇱🇻" },
  { name: "Lithuania", flag: "🇱🇹" },
  { name: "Finland", flag: "🇫🇮" },
  { name: "Russia", flag: "🇷🇺" },
  { name: "Ukraine", flag: "🇺🇦" },
  { name: "Belarus", flag: "🇧🇾" },
  { name: "Germany", flag: "🇩🇪" },
  { name: "Poland", flag: "🇵🇱" },
  { name: "Sweden", flag: "🇸🇪" },
  { name: "Norway", flag: "🇳🇴" },
  { name: "Denmark", flag: "🇩🇰" },
  { name: "Netherlands", flag: "🇳🇱" },
  { name: "Belgium", flag: "🇧🇪" },
  { name: "France", flag: "🇫🇷" },
  { name: "England", flag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿" },
  { name: "Spain", flag: "🇪🇸" },
  { name: "Italy", flag: "🇮🇹" },
  { name: "Portugal", flag: "🇵🇹" },
  { name: "Czech Republic", flag: "🇨🇿" },
  { name: "Slovakia", flag: "🇸🇰" },
  { name: "Hungary", flag: "🇭🇺" },
  { name: "Romania", flag: "🇷🇴" },
  { name: "Bulgaria", flag: "🇧🇬" },
  { name: "Croatia", flag: "🇭🇷" },
  { name: "Serbia", flag: "🇷🇸" },
  { name: "Slovenia", flag: "🇸🇮" },
  { name: "Austria", flag: "🇦🇹" },
  { name: "Switzerland", flag: "🇨🇭" },
  { name: "Greece", flag: "🇬🇷" },
  { name: "Turkey", flag: "🇹🇷" },
  { name: "Israel", flag: "🇮🇱" },
  { name: "Georgia", flag: "🇬🇪" },
  { name: "Armenia", flag: "🇦🇲" },
  { name: "Azerbaijan", flag: "🇦🇿" },
  { name: "Kazakhstan", flag: "🇰🇿" },
  { name: "Iceland", flag: "🇮🇸" },
  { name: "Ireland", flag: "🇮🇪" },
  { name: "Scotland", flag: "🏴󠁧󠁢󠁳󠁣󠁴󠁿" },
  { name: "Wales", flag: "🏴󠁧󠁢󠁷󠁬󠁳󠁿" },
  { name: "Moldova", flag: "🇲🇩" },
  { name: "Albania", flag: "🇦🇱" },
  { name: "North Macedonia", flag: "🇲🇰" },
  { name: "Bosnia and Herzegovina", flag: "🇧🇦" },
  { name: "Montenegro", flag: "🇲🇪" },
  { name: "Kosovo", flag: "🇽🇰" },
  { name: "Cyprus", flag: "🇨🇾" },
  { name: "Malta", flag: "🇲🇹" },
  { name: "Luxembourg", flag: "🇱🇺" },
  { name: "Other", flag: "🌍" },
];

function CountrySelect({
  value,
  onChange,
  label,
  required,
}: {
  value: string;
  onChange: (val: string) => void;
  label: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  const selected = COUNTRIES.find((c) => c.name === value);
  const filtered = COUNTRIES.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setSearch("");
      }
    }
    document.addEventListener("pointerdown", handleOutside as EventListener);
    return () => {
      document.removeEventListener("pointerdown", handleOutside as EventListener);
    };
  }, []);

  useEffect(() => {
    if (open && searchRef.current) searchRef.current.focus();
  }, [open]);

  return (
    <div ref={ref} className="relative z-10">
      <label className="block text-sm font-medium th-text mb-1.5">
        {label}{required && <span className="text-error ml-0.5">*</span>}
      </label>
      <button
        type="button"
        onClick={() => { setOpen((o) => !o); setSearch(""); }}
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2.5 rounded-xl border th-card text-sm transition-colors",
          open ? "border-navy ring-2 ring-navy/20" : "th-border hover:border-navy/40",
          !value && "th-text-2"
        )}
      >
        {selected ? (
          <>
            <span className="text-xl leading-none">{selected.flag}</span>
            <span className="flex-1 text-left th-text">{selected.name}</span>
          </>
        ) : (
          <span className="flex-1 text-left">Select country...</span>
        )}
        <ChevronDown className={cn("w-4 h-4 th-text-2 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 w-full mt-1 popup-bg th-border border rounded-xl shadow-lg overflow-hidden">
          <div className="flex items-center gap-2 px-3 py-2 border-b th-border">
            <Search className="w-3.5 h-3.5 th-text-2 shrink-0" />
            <input
              ref={searchRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search..."
              className="flex-1 text-sm outline-none bg-transparent"
              style={{ color: "var(--cat-text)" }}
            />
          </div>
          <div className="max-h-52 overflow-y-auto">
            {filtered.length === 0 ? (
              <p className="text-sm th-text-2 text-center py-3">No results</p>
            ) : (
              filtered.map((c) => (
                <button
                  key={c.name}
                  type="button"
                  onClick={() => { onChange(c.name); setOpen(false); setSearch(""); }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left transition-colors hover:th-bg th-text",
                    value === c.name && "bg-navy/5 font-medium"
                  )}
                  style={{ color: value === c.name ? "var(--cat-accent)" : "var(--cat-text)" }}
                >
                  <span className="text-xl leading-none">{c.flag}</span>
                  <span>{c.name}</span>
                  {value === c.name && <Check className="w-3.5 h-3.5 ml-auto" style={{ color: "var(--cat-accent)" }} />}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Club search types ───────────────────────────────────────────────────────

type ClubResult = {
  id: number;
  name: string;
  country: string | null;
  city: string | null;
  badgeUrl: string | null;
  tournamentId: number;
  teamCount: number;
};

// ─── Club search panel ───────────────────────────────────────────────────────

function ClubSearchPanel({
  onSelectClub,
  onCreateNew,
  tcr,
}: {
  onSelectClub: (club: ClubResult) => void;
  onCreateNew: () => void;
  tcr: ReturnType<typeof useTranslations>;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ClubResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 2) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/public/clubs/search?q=${encodeURIComponent(query.trim())}`);
        const data = await res.json();
        setResults(data);
        setSearched(true);
      } finally {
        setLoading(false);
      }
    }, 350);
  }, [query]);

  return (
    <div className="space-y-6">
      {/* Title */}
      <div>
        <h2 className="text-2xl font-black th-text mb-1">{tcr("findTitle")}</h2>
        <p className="text-sm th-text-2 leading-relaxed">{tcr("findSubtitle")}</p>
      </div>

      {/* Warning banner */}
      <div
        className="flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm"
        style={{
          background: "rgba(251,191,36,0.08)",
          borderColor: "rgba(251,191,36,0.25)",
          color: "var(--cat-text-secondary)",
        }}
      >
        <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: "#f59e0b" }} />
        <span>{tcr("findWarning")}</span>
      </div>

      {/* Search input */}
      <div className="relative">
        <div
          className="flex items-center gap-3 px-4 py-3.5 rounded-xl border-2 transition-all"
          style={{
            background: "var(--cat-input-bg)",
            borderColor: "var(--cat-accent)",
            boxShadow: "0 0 0 3px var(--cat-accent-glow)",
          }}
        >
          <Search
            className={cn("w-5 h-5 shrink-0 transition-opacity", loading ? "opacity-40" : "")}
            style={{ color: "var(--cat-accent)" }}
          />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={tcr("findPlaceholder")}
            className="flex-1 text-[15px] bg-transparent outline-none font-medium"
            style={{ color: "var(--cat-text)" }}
            autoFocus
          />
          {query && (
            <button
              type="button"
              onClick={() => { setQuery(""); setResults([]); setSearched(false); }}
              className="opacity-40 hover:opacity-70 transition-opacity"
            >
              <X className="w-4 h-4" style={{ color: "var(--cat-text)" }} />
            </button>
          )}
          {loading && (
            <div
              className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin shrink-0"
              style={{ borderColor: "var(--cat-accent)", borderTopColor: "transparent" }}
            />
          )}
        </div>

        {/* Hint */}
        {query.trim().length === 0 && (
          <p className="text-xs mt-2 ml-1" style={{ color: "var(--cat-text-muted)" }}>
            {tcr("findHint")}
          </p>
        )}

        {/* Results count */}
        {searched && results.length > 0 && (
          <p className="text-xs mt-2 ml-1 font-medium" style={{ color: "var(--cat-accent)" }}>
            {tcr("foundCount").replace("{count}", String(results.length))}
          </p>
        )}
      </div>

      {/* Results list */}
      {results.length > 0 && (
        <div className="space-y-2">
          {results.map((club) => (
            <button
              key={club.id}
              type="button"
              onClick={() => onSelectClub(club)}
              className="w-full text-left rounded-xl border p-4 transition-all hover:scale-[1.01] group"
              style={{
                background: "var(--cat-card-bg)",
                borderColor: "var(--cat-card-border)",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-accent)";
                (e.currentTarget as HTMLElement).style.boxShadow = "0 0 0 2px var(--cat-accent-glow)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-card-border)";
                (e.currentTarget as HTMLElement).style.boxShadow = "none";
              }}
            >
              <div className="flex items-center gap-3">
                {/* Badge */}
                <div
                  className="w-11 h-11 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                  style={{ background: "var(--cat-badge-open-bg)" }}
                >
                  {club.badgeUrl ? (
                    <img src={club.badgeUrl} alt={club.name} className="w-full h-full object-contain" />
                  ) : (
                    <Building2 className="w-5 h-5" style={{ color: "var(--cat-text-muted)" }} />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p
                    className="font-bold text-[15px] truncate group-hover:text-[var(--cat-accent)] transition-colors"
                    style={{ color: "var(--cat-text)" }}
                  >
                    {club.name}
                  </p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {(club.city || club.country) && (
                      <span className="flex items-center gap-1 text-xs" style={{ color: "var(--cat-text-secondary)" }}>
                        <MapPin className="w-3 h-3" />
                        {[club.city, club.country].filter(Boolean).join(", ")}
                      </span>
                    )}
                    <span className="flex items-center gap-1 text-xs" style={{ color: "var(--cat-text-muted)" }}>
                      <Users className="w-3 h-3" />
                      {tcr("foundTeams").replace("{count}", String(club.teamCount))}
                    </span>
                  </div>
                </div>

                {/* Arrow */}
                <ChevronRight className="w-4 h-4 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: "var(--cat-accent)" }} />
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results */}
      {searched && results.length === 0 && !loading && (
        <div
          className="text-center py-6 rounded-xl border"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
        >
          <p className="text-sm font-medium" style={{ color: "var(--cat-text-secondary)" }}>
            {tcr("findNoResults")}
          </p>
          <p className="text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
            «{query}»
          </p>
        </div>
      )}

      {/* Create new button */}
      <button
        type="button"
        onClick={onCreateNew}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-dashed text-sm font-semibold transition-all hover:opacity-80"
        style={{
          borderColor: "var(--cat-card-border)",
          color: "var(--cat-text-secondary)",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-accent)";
          (e.currentTarget as HTMLElement).style.color = "var(--cat-accent)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.borderColor = "var(--cat-card-border)";
          (e.currentTarget as HTMLElement).style.color = "var(--cat-text-secondary)";
        }}
      >
        <Plus className="w-4 h-4" />
        {tcr("createNewBtn")}
      </button>
    </div>
  );
}

// ─── Club found panel ─────────────────────────────────────────────────────────

type TeamInfo = { id: number; name: string; className: string };

function ClubFoundPanel({
  club,
  onBack,
  onCreateAnyway,
  tcr,
}: {
  club: ClubResult;
  onBack: () => void;
  onCreateAnyway: () => void;
  tcr: ReturnType<typeof useTranslations>;
}) {
  const [teams, setTeams] = useState<TeamInfo[]>([]);

  useEffect(() => {
    fetch(`/api/public/clubs/${club.id}/teams`)
      .then(r => r.json())
      .then(data => setTeams(Array.isArray(data) ? data : []));
  }, [club.id]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-black th-text mb-1">{tcr("foundTitle")}</h2>
        <p className="text-sm th-text-2 leading-relaxed">{tcr("foundMessage")}</p>
      </div>

      {/* Club card — highlighted */}
      <div
        className="rounded-2xl border-2 p-5"
        style={{
          background: "var(--cat-card-bg)",
          borderColor: "var(--cat-accent)",
          boxShadow: "0 0 0 4px var(--cat-accent-glow)",
        }}
      >
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl shrink-0 flex items-center justify-center overflow-hidden"
            style={{ background: "var(--cat-badge-open-bg)" }}
          >
            {club.badgeUrl ? (
              <img src={club.badgeUrl} alt={club.name} className="w-full h-full object-contain" />
            ) : (
              <Building2 className="w-7 h-7" style={{ color: "var(--cat-accent)" }} />
            )}
          </div>
          <div className="flex-1">
            <p className="font-black text-xl" style={{ color: "var(--cat-text)" }}>{club.name}</p>
            {(club.city || club.country) && (
              <p className="flex items-center gap-1 text-sm mt-0.5" style={{ color: "var(--cat-text-secondary)" }}>
                <MapPin className="w-3.5 h-3.5" />
                {[club.city, club.country].filter(Boolean).join(", ")}
              </p>
            )}
            <p className="flex items-center gap-1 text-xs mt-1" style={{ color: "var(--cat-text-muted)" }}>
              <Users className="w-3 h-3" />
              {tcr("foundTeams").replace("{count}", String(club.teamCount))}
            </p>
          </div>
        </div>
      </div>

      {/* Sign in CTA */}
      <Link
        href="/login"
        className="flex items-center justify-center gap-2 w-full py-3.5 rounded-xl text-sm font-bold transition-opacity hover:opacity-90"
        style={{
          background: "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark))",
          color: "var(--cat-accent-text)",
        }}
      >
        <LogIn className="w-4 h-4" />
        {tcr("signInToClub")}
      </Link>

      {/* Teams list */}
      {teams.length > 0 && (
        <div className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: "var(--cat-text-muted)" }}>
            {tcr("teamsInClub")}
          </p>
          {teams.map((team) => (
            <Link
              key={team.id}
              href="/login"
              className="flex items-center justify-between px-4 py-3 rounded-xl border transition-all hover:opacity-80 group"
              style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
            >
              <div>
                <p className="text-[13px] font-semibold" style={{ color: "var(--cat-text)" }}>{team.name}</p>
                {team.className && (
                  <p className="text-[11px]" style={{ color: "var(--cat-text-muted)" }}>{team.className}</p>
                )}
              </div>
              <div
                className="text-[11px] font-semibold flex items-center gap-1 px-2.5 py-1 rounded-lg"
                style={{ background: "var(--cat-badge-open-bg)", color: "var(--cat-accent)" }}
              >
                <LogIn className="w-3 h-3" /> {tcr("signInToClub")}
              </div>
            </Link>
          ))}
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
        <span className="text-xs" style={{ color: "var(--cat-text-muted)" }}>or</span>
        <div className="flex-1 h-px" style={{ background: "var(--cat-card-border)" }} />
      </div>

      {/* Secondary actions */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={onBack}
          className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-70"
          style={{ color: "var(--cat-text-secondary)" }}
        >
          {tcr("backToSearch")}
        </button>
        <button
          type="button"
          onClick={onCreateAnyway}
          className="w-full py-2.5 rounded-xl text-sm transition-opacity hover:opacity-70"
          style={{ color: "var(--cat-text-muted)" }}
        >
          {tcr("continueCreate")}
        </button>
      </div>
    </div>
  );
}

// ─── Main types ───────────────────────────────────────────────────────────────

type TournamentClass = { id: number; name: string; minBirthYear: number | null };
type TeamEntry = { name: string; classId: string };

const FORM_STEPS = ["club", "teams", "contact", "review"] as const;
type FormStep = (typeof FORM_STEPS)[number];
type Phase = "search" | "found" | "create";

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RegisterPage() {
  const t = useTranslations("register");
  const tc = useTranslations("common");
  const tcr = useTranslations("clubRegister");
  const router = useRouter();
  const logoInputRef = useRef<HTMLInputElement>(null);

  const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
  const tournamentIdParam = searchParams?.get("tournamentId") ?? null;

  // Phase: search → found OR create
  const [phase, setPhase] = useState<Phase>("search");
  const [foundClub, setFoundClub] = useState<ClubResult | null>(null);

  // Form steps (only in "create" phase)
  const [step, setStep] = useState<FormStep>("club");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [classes, setClasses] = useState<TournamentClass[]>([]);

  // Club info
  const [clubName, setClubName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Teams
  const [teamsList, setTeamsList] = useState<TeamEntry[]>([{ name: "", classId: "" }]);

  // Contact
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRole, setContactRole] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirm, setPasswordConfirm] = useState("");

  useEffect(() => {
    const url = tournamentIdParam
      ? `/api/tournaments/active?tournamentId=${tournamentIdParam}`
      : "/api/tournaments/active";
    fetch(url).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes ?? []);
      }
    });
  }, [tournamentIdParam]);

  const stepIndex = FORM_STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === FORM_STEPS.length - 1;

  const contactRoles = [
    { value: "manager", label: t("contact.roles.manager") },
    { value: "headCoach", label: t("contact.roles.headCoach") },
    { value: "assistant", label: t("contact.roles.assistant") },
    { value: "president", label: t("contact.roles.president") },
    { value: "other", label: t("contact.roles.other") },
  ];

  const stepLabels = [tcr("step1"), tcr("step2"), tcr("step3"), tcr("step4")];

  function next() {
    setError("");
    if (step === "club" && !clubName.trim()) { setError(t("errors.clubNameRequired")); return; }
    if (step === "club" && !country.trim()) { setError(t("errors.countryRequired")); return; }
    if (step === "teams") {
      for (const tm of teamsList) {
        if (!tm.name.trim()) { setError(t("errors.teamNameRequired")); return; }
        if (!tm.classId) { setError(t("errors.ageClassRequired")); return; }
      }
    }
    if (step === "contact") {
      if (!contactName.trim()) { setError(t("errors.contactNameRequired")); return; }
      if (!contactEmail.trim()) { setError(t("errors.emailRequired")); return; }
      if (!password) { setError(t("errors.passwordRequired")); return; }
      if (password.length < 6) { setError(t("errors.passwordTooShort")); return; }
      if (password !== passwordConfirm) { setError(t("errors.passwordMismatch")); return; }
    }
    if (!isLast) setStep(FORM_STEPS[stepIndex + 1]);
  }

  function prev() {
    setError("");
    if (!isFirst) setStep(FORM_STEPS[stepIndex - 1]);
    else {
      // Back to search from first form step
      setPhase("search");
    }
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  }

  function addTeam() { setTeamsList([...teamsList, { name: "", classId: "" }]); }
  function removeTeam(i: number) { setTeamsList(teamsList.filter((_, idx) => idx !== i)); }
  function updateTeam(i: number, field: keyof TeamEntry, value: string) {
    setTeamsList(teamsList.map((tm, idx) => idx === i ? { ...tm, [field]: value } : tm));
  }
  function getClassName(classId: string) {
    const cls = classes.find((c) => String(c.id) === classId);
    return cls ? cls.name : classId;
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("clubName", clubName);
      fd.append("country", country);
      fd.append("city", city);
      fd.append("contactName", contactName);
      fd.append("contactEmail", contactEmail);
      fd.append("contactPhone", contactPhone);
      fd.append("contactRole", contactRole);
      fd.append("password", password);
      fd.append("teams", JSON.stringify(teamsList));
      if (logoFile) fd.append("logo", logoFile);
      if (tournamentIdParam) fd.append("tournamentId", tournamentIdParam);

      const res = await fetch("/api/clubs/register", { method: "POST", body: fd });
      if (res.ok) {
        router.push("/team/overview");
      } else {
        if (res.status === 409) setError(t("errors.emailAlreadyExists"));
        else setError(t("errors.registrationFailed"));
      }
    } finally {
      setSubmitting(false);
    }
  }

  const classOptions = classes.map((c) => ({
    value: String(c.id),
    label: c.minBirthYear ? `${c.name} (born ${c.minBirthYear}+)` : c.name,
  }));

  // ── Left panel content based on phase ─────────────────────────────────────

  function leftPanelBadgeLabel() {
    if (phase === "search") return "Club Search";
    if (phase === "found") return "Club Found";
    return "Club Registration";
  }

  function leftPanelTitle() {
    if (phase === "search") return tcr("findTitle");
    if (phase === "found") return tcr("foundTitle");
    return tcr("heroTitle");
  }

  function leftPanelSubtitle() {
    if (phase === "search") return tcr("findSubtitle");
    if (phase === "found") return tcr("foundMessage");
    return tcr("heroSubtitle");
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen flex" style={{ background: "var(--cat-bg)" }}>

        {/* ── Left panel ──────────────────────────── */}
        <div className="hidden lg:flex flex-col w-[38%] relative overflow-hidden"
          style={{ background: "linear-gradient(135deg, var(--cat-banner-from), var(--cat-banner-via), var(--cat-banner-to))" }}>

          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.08]"
              style={{ background: "radial-gradient(circle, var(--cat-accent), transparent 70%)" }} />
            <div className="absolute bottom-[-20%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05]"
              style={{ background: "radial-gradient(circle, #8B5CF6, transparent 70%)" }} />
          </div>

          {/* Logo */}
          <div className="relative z-10 p-10">
            <Link href="/" className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)", boxShadow: "0 4px 20px var(--cat-accent-glow)" }}
              >
                <img src="/playGrowWin1.png" alt="Goality" className="w-full h-full object-contain" />
              </div>
              <span className="font-black text-[18px] tracking-tight" style={{ color: "var(--cat-text)" }}>Goality TMC</span>
            </Link>
          </div>

          {/* Center content — adapts to phase */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-10">
            <div className="mb-8">
              <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border"
                style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
                <Crown className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                <span className="text-[11px] font-semibold uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
                  {leftPanelBadgeLabel()}
                </span>
              </div>
              <h1 className="text-3xl xl:text-4xl font-black tracking-tight leading-[1.1] mb-4"
                style={{ color: "var(--cat-text)" }}>
                {leftPanelTitle()}
              </h1>
              <p className="text-[14px] leading-relaxed" style={{ color: "var(--cat-text-secondary)" }}>
                {leftPanelSubtitle()}
              </p>
            </div>

            {/* Step indicators — only in create phase */}
            {phase === "create" && (
              <ul className="space-y-3">
                {FORM_STEPS.map((s, i) => {
                  const isActive = i === stepIndex;
                  const isDone = i < stepIndex;
                  return (
                    <li key={s} className="flex items-center gap-3">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold transition-all"
                        style={
                          isDone
                            ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
                            : isActive
                            ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)", boxShadow: "0 0 0 3px var(--cat-accent-glow)" }
                            : { background: "var(--cat-badge-open-bg)", color: "var(--cat-text-muted)", border: "1px solid var(--cat-card-border)" }
                        }
                      >
                        {isDone ? <Check className="w-4 h-4" /> : i + 1}
                      </div>
                      <span
                        className="text-[13px] font-medium"
                        style={{ color: isActive ? "var(--cat-text)" : isDone ? "var(--cat-text-secondary)" : "var(--cat-text-muted)" }}
                      >
                        {stepLabels[i]}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Search phase: visual icon */}
            {phase === "search" && (
              <div
                className="flex items-center gap-4 p-5 rounded-2xl border"
                style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}
              >
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: "var(--cat-badge-open-bg)" }}
                >
                  <Search className="w-6 h-6" style={{ color: "var(--cat-accent)" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "var(--cat-text)" }}>
                    {tcr("findWarning")}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Bottom quote */}
          <div className="relative z-10 mx-8 mb-8 p-5 rounded-2xl border"
            style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
            <p className="text-[13px] italic mb-2" style={{ color: "var(--cat-text-secondary)" }}>
              "{tcr("heroQuote")}"
            </p>
            <p className="text-[11px] font-semibold" style={{ color: "var(--cat-text-muted)" }}>
              {tcr("heroQuoteAuthor")}
            </p>
          </div>
        </div>

        {/* ── Right panel ─────────────────────────── */}
        <div className="flex-1 flex flex-col overflow-y-auto">

          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 lg:px-10">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <img src="/playGrowWin1.png" alt="Goality" className="w-full h-full object-contain" />
              </div>
              <span className="font-bold text-[15px]" style={{ color: "var(--cat-text)" }}>Goality TMC</span>
            </Link>
            <div className="ml-auto flex items-center gap-3">
              <LanguageSwitcher variant="light" />
              <Link href="/login"
                className="hidden sm:inline-flex items-center gap-1.5 text-[13px] font-medium px-3 py-1.5 rounded-lg border transition-colors"
                style={{ color: "var(--cat-text-secondary)", borderColor: "var(--cat-card-border)" }}>
                Sign in
              </Link>
            </div>
          </div>

          {/* Mobile step indicators — only in create phase */}
          {phase === "create" && (
            <div className="lg:hidden px-6 pb-4">
              <div className="flex items-center gap-2">
                {FORM_STEPS.map((s, i) => (
                  <div key={s} className="flex items-center gap-1">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold transition-all"
                      style={
                        i < stepIndex
                          ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
                          : i === stepIndex
                          ? { background: "var(--cat-accent)", color: "var(--cat-accent-text)" }
                          : { background: "var(--cat-badge-open-bg)", color: "var(--cat-text-muted)" }
                      }
                    >
                      {i < stepIndex ? <Check className="w-3 h-3" /> : i + 1}
                    </div>
                    {i < FORM_STEPS.length - 1 && (
                      <div className="w-6 h-0.5" style={{ background: i < stepIndex ? "var(--cat-accent)" : "var(--cat-card-border)" }} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Main content area */}
          <div className="flex-1 px-6 py-4 lg:px-12 lg:py-8 max-w-2xl w-full mx-auto">

            {error && <Alert variant="error" className="mb-4">{error}</Alert>}

            {/* ── PHASE: search ── */}
            {phase === "search" && (
              <Card className="p-8">
                <ClubSearchPanel
                  onSelectClub={(club) => { setFoundClub(club); setPhase("found"); }}
                  onCreateNew={() => setPhase("create")}
                  tcr={tcr}
                />
              </Card>
            )}

            {/* ── PHASE: found ── */}
            {phase === "found" && foundClub && (
              <Card className="p-8">
                <ClubFoundPanel
                  club={foundClub}
                  onBack={() => { setFoundClub(null); setPhase("search"); }}
                  onCreateAnyway={() => setPhase("create")}
                  tcr={tcr}
                />
              </Card>
            )}

            {/* ── PHASE: create (multi-step form) ── */}
            {phase === "create" && (
              <Card className="p-8">

                {/* ── STEP 1: Club ── */}
                {step === "club" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold th-text">{t("club.title")}</h2>
                      <p className="text-sm th-text-2 mt-1">{t("club.description")}</p>
                    </div>

                    <Input id="clubName" label={t("club.name")} value={clubName}
                      onChange={(e) => setClubName(e.target.value)} placeholder={t("club.namePlaceholder")} required />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <CountrySelect label={t("club.country")} value={country} onChange={setCountry} required />
                      <Input id="city" label={t("club.city")} value={city}
                        onChange={(e) => setCity(e.target.value)} placeholder={t("club.cityPlaceholder")} />
                    </div>

                    {/* Logo upload */}
                    <div className="space-y-1.5">
                      <label className="block text-sm font-medium th-text">
                        {t("club.badge")} <span className="th-text-2 font-normal">{t("club.badgeOptional")}</span>
                      </label>
                      <div
                        onClick={() => logoInputRef.current?.click()}
                        className="border-2 border-dashed th-border rounded-xl p-6 text-center hover:border-navy/40 hover:bg-surface/50 transition-colors cursor-pointer"
                      >
                        {logoPreview ? (
                          <img src={logoPreview} alt="Logo preview" className="w-20 h-20 object-contain mx-auto rounded-lg" />
                        ) : (
                          <>
                            <ImageIcon className="w-8 h-8 text-text-secondary/40 mx-auto mb-2" />
                            <p className="text-sm th-text-2">
                              <span className="text-navy font-medium">{t("club.uploadLogo")}</span> {t("club.dragDrop")}
                            </p>
                            <p className="text-xs th-text-2 mt-1">{t("club.fileTypes")}</p>
                          </>
                        )}
                        {logoFile && <p className="text-xs text-navy mt-2 font-medium">{logoFile.name}</p>}
                      </div>
                      <input ref={logoInputRef} type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
                    </div>
                  </div>
                )}

                {/* ── STEP 2: Teams ── */}
                {step === "teams" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold th-text">{t("teams.title")}</h2>
                      <p className="text-sm th-text-2 mt-1">{t("teams.description")}</p>
                    </div>

                    <div className="space-y-4">
                      {teamsList.map((team, i) => (
                        <div key={i} className="rounded-xl border th-border p-4 space-y-3">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-semibold text-navy">{t("teams.teamLabel", { n: i + 1 })}</p>
                            {teamsList.length > 1 && (
                              <button onClick={() => removeTeam(i)} className="th-text-2 hover:text-error cursor-pointer">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                          <Input
                            id={`teamName-${i}`}
                            label={t("teams.teamName")}
                            value={team.name}
                            onChange={(e) => updateTeam(i, "name", e.target.value)}
                            placeholder={t("teams.teamNamePlaceholder", { club: clubName || "FC Club" })}
                            required
                          />
                          <Select
                            id={`classId-${i}`}
                            label={t("teams.ageClass")}
                            value={team.classId}
                            onChange={(e) => updateTeam(i, "classId", e.target.value)}
                            options={classOptions}
                            placeholder={t("teams.selectAgeClass")}
                          />
                        </div>
                      ))}
                    </div>

                    <Button variant="ghost" onClick={addTeam} className="w-full border border-dashed th-border">
                      <Plus className="w-4 h-4" />
                      {t("teams.addAnother")}
                    </Button>
                  </div>
                )}

                {/* ── STEP 3: Contact ── */}
                {step === "contact" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold th-text">{t("contact.title")}</h2>
                      <p className="text-sm th-text-2 mt-1">{t("contact.description")}</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Input id="contactName" label={t("contact.fullName")} value={contactName}
                        onChange={(e) => setContactName(e.target.value)} required />
                      <Select id="contactRole" label={t("contact.role")} value={contactRole}
                        onChange={(e) => setContactRole(e.target.value)}
                        options={contactRoles} placeholder={t("contact.selectRole")} />
                    </div>

                    <Input id="contactEmail" label={t("contact.email")} type="email" value={contactEmail}
                      onChange={(e) => setContactEmail(e.target.value)} required />

                    <Input id="contactPhone" label={t("contact.phone")} type="tel" value={contactPhone}
                      onChange={(e) => setContactPhone(e.target.value)} />

                    <div className="border-t th-border pt-4 space-y-4">
                      <p className="text-xs font-semibold uppercase tracking-wider th-text-2">
                        {t("contact.passwordSection")}
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <Input id="password" label={t("contact.password")} type="password" value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder={t("contact.passwordPlaceholder")} required />
                        <Input id="passwordConfirm" label={t("contact.confirmPassword")} type="password" value={passwordConfirm}
                          onChange={(e) => setPasswordConfirm(e.target.value)} required />
                      </div>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: Review ── */}
                {step === "review" && (
                  <div className="space-y-5">
                    <div>
                      <h2 className="text-xl font-bold th-text">{t("review.title")}</h2>
                      <p className="text-sm th-text-2 mt-1">{t("review.description")}</p>
                    </div>

                    <div className="space-y-3">
                      <div className="rounded-xl th-bg p-4 space-y-2">
                        <p className="text-xs font-semibold uppercase tracking-wider th-text-2">{t("review.club")}</p>
                        <div className="flex items-center gap-3">
                          {logoPreview && (
                            <img src={logoPreview} alt="badge" className="w-10 h-10 object-contain rounded" />
                          )}
                          <div>
                            <p className="text-sm font-medium">{clubName}</p>
                            <p className="text-sm th-text-2">{city}{city && country ? ", " : ""}{country}</p>
                          </div>
                        </div>
                      </div>

                      <div className="rounded-xl th-bg p-4 space-y-3">
                        <p className="text-xs font-semibold uppercase tracking-wider th-text-2">
                          {t("review.teams")} ({teamsList.length})
                        </p>
                        {teamsList.map((tm, i) => (
                          <div key={i} className="flex items-center justify-between py-1.5 border-b th-border last:border-0">
                            <p className="text-sm font-medium">{tm.name}</p>
                            <p className="text-sm th-text-2">{getClassName(tm.classId)}</p>
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl th-bg p-4 space-y-1">
                        <p className="text-xs font-semibold uppercase tracking-wider th-text-2">{t("review.contact")}</p>
                        <p className="text-sm font-medium">{contactName}
                          {contactRole && <span className="th-text-2 font-normal ml-2">
                            · {contactRoles.find(r => r.value === contactRole)?.label}
                          </span>}
                        </p>
                        <p className="text-sm th-text-2">{contactEmail}</p>
                        {contactPhone && <p className="text-sm th-text-2">{contactPhone}</p>}
                      </div>
                    </div>
                  </div>
                )}

                {/* Navigation */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t th-border">
                  <Button variant="ghost" onClick={prev}>
                    <ChevronLeft className="w-4 h-4" />
                    {isFirst ? tcr("backToSearch") : tc("back")}
                  </Button>

                  {isLast ? (
                    <Button variant="gold" size="lg" disabled={submitting} onClick={handleSubmit}>
                      {submitting ? t("submitting") : t("submit")}
                    </Button>
                  ) : (
                    <Button onClick={next}>
                      {t("next")} <ChevronRight className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </Card>
            )}

            {/* Back to home */}
            <div className="mt-6 text-center">
              <Link href="/" className="inline-flex items-center gap-1.5 text-[12px] hover:opacity-80 transition-opacity"
                style={{ color: "var(--cat-text-muted)" }}>
                <ArrowLeft className="w-3 h-3" /> Back to home
              </Link>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

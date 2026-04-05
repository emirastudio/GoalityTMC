"use client";

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import {
  Search, Building2, Plus, X, Upload, Loader2, CheckCircle,
  ArrowRight, ArrowLeft, Eye, EyeOff, Users, Shield,
  ChevronRight, Trophy, Sparkles, LogIn,
} from "lucide-react";

/* ─── Types ──────────────────────────────────────────────────────────────── */
type TData = { id: number; name: string; slug: string; registrationOpen: boolean; currency: string };
type ClassData = { id: number; name: string; format: string | null; minBirthYear: number | null; maxBirthYear: number | null };
type ClubResult = { id: number; name: string; city: string | null; country: string | null; badgeUrl: string | null; contactName: string | null; teamCount: number };

type View = "search" | "join" | "create" | "done-join" | "done-create";
type Step = 1 | 2 | 3; // club info → account → teams

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

/* ─── Country list ───────────────────────────────────────────────────────── */
const COUNTRIES = [
  // Europe
  "Albania","Andorra","Armenia","Austria","Azerbaijan","Belarus","Belgium",
  "Bosnia and Herzegovina","Bulgaria","Croatia","Cyprus","Czech Republic",
  "Denmark","Estonia","Finland","France","Georgia","Germany","Greece",
  "Hungary","Iceland","Ireland","Italy","Kazakhstan","Kosovo","Latvia",
  "Liechtenstein","Lithuania","Luxembourg","Malta","Moldova","Monaco",
  "Montenegro","Netherlands","North Macedonia","Norway","Poland","Portugal",
  "Romania","Russia","San Marino","Serbia","Slovakia","Slovenia","Spain",
  "Sweden","Switzerland","Turkey","Ukraine","United Kingdom","Vatican",
  // Americas
  "Argentina","Bolivia","Brazil","Canada","Chile","Colombia","Cuba",
  "Ecuador","Mexico","Paraguay","Peru","United States","Uruguay","Venezuela",
  // Asia / Pacific
  "Australia","China","India","Indonesia","Iran","Israel","Japan",
  "Malaysia","New Zealand","Pakistan","Philippines","Saudi Arabia",
  "Singapore","South Korea","Thailand","UAE","Vietnam",
  // Africa
  "Algeria","Egypt","Ethiopia","Ghana","Kenya","Morocco","Nigeria",
  "Senegal","South Africa","Tanzania","Tunisia",
  // Other
  "Other",
];

function CountrySelect({ label, value, onChange, required }: {
  label: string; value: string; onChange: (v: string) => void; required?: boolean;
}) {
  return (
    <div>
      <label className="text-[11px] font-semibold uppercase tracking-wide mb-1.5 block" style={{ color: "var(--cat-text-muted)" }}>
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full rounded-xl px-3.5 py-2.5 text-sm border outline-none transition-all appearance-none"
        style={{
          background: "var(--cat-input-bg)",
          borderColor: "var(--cat-input-border)",
          color: value ? "var(--cat-text)" : "var(--cat-text-faint)",
        }}
        onFocus={e => {
          e.currentTarget.style.borderColor = "var(--cat-accent)";
          e.currentTarget.style.boxShadow = "0 0 0 3px var(--cat-input-focus-glow)";
        }}
        onBlur={e => {
          e.currentTarget.style.borderColor = "var(--cat-input-border)";
          e.currentTarget.style.boxShadow = "none";
        }}
      >
        <option value="" disabled>— select —</option>
        {COUNTRIES.map(c => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
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

/* ─── Main page ──────────────────────────────────────────────────────────── */
export default function RegisterPage() {
  const params = useParams();
  const t = useTranslations("tournament");
  const orgSlug   = params.orgSlug as string;
  const tournamentSlug = params.tournamentSlug as string;

  /* Tournament data */
  const [tournament, setTournament] = useState<TData | null>(null);
  const [classes, setClasses]   = useState<ClassData[]>([]);
  const [notFound, setNotFound] = useState(false);

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

  /* Create — teams */
  const [teams, setTeams] = useState<{ classId: string; name: string }[]>([]);

  /* Submit */
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]           = useState("");

  /* Load tournament */
  useEffect(() => {
    fetch(`/api/public/t/${orgSlug}/${tournamentSlug}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(d => { if (d) { setTournament(d.tournament); setClasses(d.classes); } });
  }, [orgSlug, tournamentSlug]);

  /* Debounced club search */
  useEffect(() => {
    if (query.length < 2) { setResults([]); return; }
    const t = setTimeout(async () => {
      setSearching(true);
      try {
        const r = await fetch(`/api/public/t/${orgSlug}/${tournamentSlug}/clubs?q=${encodeURIComponent(query)}`);
        if (r.ok) setResults(await r.json());
      } finally { setSearching(false); }
    }, 350);
    return () => clearTimeout(t);
  }, [query, orgSlug, tournamentSlug]);

  /* Team helpers */
  function toggleClass(classId: string) {
    setTeams(prev => {
      const exists = prev.find(t => t.classId === classId);
      return exists ? prev.filter(t => t.classId !== classId) : [...prev, { classId, name: "" }];
    });
  }
  function updateTeamName(classId: string, name: string) {
    setTeams(prev => prev.map(t => t.classId === classId ? { ...t, name } : t));
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

  /* Create club submit */
  async function handleCreate() {
    setError("");
    if (!clubName.trim() || !contactEmail.trim() || !password.trim()) { setError(t("fillRequired")); return; }
    if (teams.length === 0) { setError(t("selectAgeClass")); return; }
    if (teams.some(tm => !tm.classId)) { setError(t("selectAgeClass")); return; }

    const fd = new FormData();
    fd.append("clubName", clubName.trim());
    fd.append("country", country.trim());
    fd.append("city", city.trim());
    fd.append("contactName", contactName.trim());
    fd.append("contactEmail", contactEmail.trim());
    fd.append("password", password);
    fd.append("tournamentId", String(tournament!.id));
    fd.append("teams", JSON.stringify(teams.map(tm => ({
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
    if (step === 3) return teams.length > 0;
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
      {/* Header */}
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

      {/* Search box */}
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

      {/* Results */}
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

      {/* No results hint */}
      {query.length >= 2 && !searching && results.length === 0 && (
        <div className="rounded-2xl border px-4 py-4 text-center" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          <p className="text-sm font-semibold mb-1" style={{ color: "var(--cat-text)" }}>Клуб не найден</p>
          <p className="text-[12px]" style={{ color: "var(--cat-text-muted)" }}>Зарегистрируйте новый клуб ниже</p>
        </div>
      )}

      {/* Divider */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-px" style={{ background: "var(--cat-divider)" }} />
        <span className="text-[11px] font-semibold" style={{ color: "var(--cat-text-faint)" }}>или</span>
        <div className="flex-1 h-px" style={{ background: "var(--cat-divider)" }} />
      </div>

      {/* Create new */}
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

      {/* Club info */}
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

      {/* Form */}
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
                  background: "var(--cat-badge-open-bg)",
                  borderColor: "var(--cat-badge-open-border)",
                  color: "var(--cat-accent)",
                } : {
                  background: "var(--cat-tag-bg)",
                  borderColor: "var(--cat-card-border)",
                  color: "var(--cat-text-secondary)",
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
      <button onClick={() => step === 1 ? setView("search") : setStep(s => (s - 1) as Step)}
        className="flex items-center gap-1.5 text-sm hover:opacity-70 transition-opacity"
        style={{ color: "var(--cat-text-muted)" }}>
        <ArrowLeft className="w-4 h-4" /> {step === 1 ? "Назад к поиску" : "Назад"}
      </button>

      <div>
        <span className="text-[11px] font-black uppercase tracking-widest" style={{ color: "var(--cat-accent)" }}>
          Новый клуб · Шаг {step} из 3
        </span>
        <h1 className="text-2xl font-black mt-1" style={{ color: "var(--cat-text)" }}>
          {step === 1 && "Данные клуба"}
          {step === 2 && "Ваш аккаунт"}
          {step === 3 && "Команды для регистрации"}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--cat-text-secondary)" }}>
          {step === 1 && "Расскажите о вашем клубе"}
          {step === 2 && "Создайте вход в личный кабинет клуба"}
          {step === 3 && `Выберите дивизионы в турнире ${tournament!.name}`}
        </p>
      </div>

      <StepBar step={step} total={3} />

      {/* ── Step 1: Club info ── */}
      {step === 1 && (
        <div className="rounded-2xl border p-5 space-y-4"
          style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
          {/* Logo */}
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
            <Field label={t("city")} value={city} onChange={setCity} placeholder="Tallinn" required />
          </div>
        </div>
      )}

      {/* ── Step 2: Account ── */}
      {step === 2 && (
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

      {/* ── Step 3: Teams ── */}
      {step === 3 && (
        <div className="space-y-3">
          {classes.length === 0 ? (
            <div className="rounded-2xl border p-8 text-center" style={{ background: "var(--cat-card-bg)", borderColor: "var(--cat-card-border)" }}>
              <p style={{ color: "var(--cat-text-muted)" }}>Дивизионы не настроены организатором</p>
            </div>
          ) : (
            classes.map((cls, i) => {
              const isSelected = teams.some(t => t.classId === String(cls.id));
              const color = DIV_COLORS[i % DIV_COLORS.length];
              const teamEntry = teams.find(t => t.classId === String(cls.id));
              return (
                <div key={cls.id} className="rounded-2xl border transition-all overflow-hidden"
                  style={{ background: "var(--cat-card-bg)", borderColor: isSelected ? color : "var(--cat-card-border)" }}>
                  <div
                    className="flex items-center gap-3 px-4 py-3 cursor-pointer"
                    onClick={() => toggleClass(String(cls.id))}>
                    {/* Checkbox */}
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
                      <input
                        type="text"
                        value={teamEntry?.name ?? ""}
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

          {teams.length > 0 && (
            <div className="flex items-center gap-2 px-4 py-3 rounded-xl"
              style={{ background: "var(--cat-badge-open-bg)", borderColor: "var(--cat-badge-open-border)" }}>
              <Trophy className="w-4 h-4 shrink-0" style={{ color: "var(--cat-accent)" }} />
              <p className="text-[12px] font-semibold" style={{ color: "var(--cat-text)" }}>
                Выбрано: <strong>{teams.length}</strong> {teams.length === 1 ? "команда" : teams.length < 5 ? "команды" : "команд"}
              </p>
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

      {/* Navigation buttons */}
      <div className="flex gap-3">
        {step < 3 ? (
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
            disabled={submitting || teams.length === 0}
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

"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { Trophy, Plus, X, Upload, ChevronLeft, Loader2, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/ui/theme-provider";

type OrgData = { name: string; slug: string; logo: string | null; brandColor: string };
type TournamentData = { id: number; name: string; slug: string; registrationOpen: boolean; currency: string };
type ClassData = { id: number; name: string; format: string | null; minBirthYear: number | null; maxBirthYear: number | null };

export default function RegisterPage() {
  const params = useParams();
  const router = useRouter();
  const orgSlug = params.orgSlug as string;
  const tournamentSlug = params.tournamentSlug as string;

  const [org, setOrg] = useState<OrgData | null>(null);
  const [tournament, setTournament] = useState<TournamentData | null>(null);
  const [classes, setClasses] = useState<ClassData[]>([]);
  const [notFound, setNotFound] = useState(false);
  const [done, setDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Form state
  const [clubName, setClubName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logo, setLogo] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [selectedTeams, setSelectedTeams] = useState<{ classId: string; name: string }[]>([{ classId: "", name: "" }]);

  useEffect(() => {
    fetch(`/api/public/t/${orgSlug}/${tournamentSlug}`)
      .then(r => { if (!r.ok) { setNotFound(true); return null; } return r.json(); })
      .then(d => {
        if (!d) return;
        setOrg(d.org);
        setTournament(d.tournament);
        setClasses(d.classes);
      });
  }, [orgSlug, tournamentSlug]);

  function addTeam() {
    setSelectedTeams(prev => [...prev, { classId: "", name: "" }]);
  }

  function removeTeam(i: number) {
    setSelectedTeams(prev => prev.filter((_, idx) => idx !== i));
  }

  function updateTeam(i: number, field: "classId" | "name", value: string) {
    setSelectedTeams(prev => prev.map((t, idx) => idx === i ? { ...t, [field]: value } : t));
  }

  function handleLogo(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogo(file);
    setLogoPreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!clubName.trim() || !contactEmail.trim() || !password.trim()) {
      setError("Please fill in all required fields.");
      return;
    }
    if (selectedTeams.some(t => !t.classId)) {
      setError("Please select an age class for each team.");
      return;
    }

    const fd = new FormData();
    fd.append("clubName", clubName.trim());
    fd.append("country", country.trim());
    fd.append("city", city.trim());
    fd.append("contactName", contactName.trim());
    fd.append("contactEmail", contactEmail.trim());
    fd.append("password", password);
    fd.append("tournamentId", String(tournament!.id));
    fd.append("teams", JSON.stringify(selectedTeams.map(t => ({
      classId: parseInt(t.classId),
      name: t.name.trim() || undefined,
    }))));
    if (logo) fd.append("logo", logo);

    setSubmitting(true);
    try {
      const res = await fetch("/api/clubs/register", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Registration failed. Please try again.");
        return;
      }
      setDone(true);
    } finally {
      setSubmitting(false);
    }
  }

  if (notFound) return (
    <ThemeProvider defaultTheme="light">
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cat-bg)" }}>
      <div className="text-center">
        <p style={{ color: "var(--cat-text-secondary)" }}>Tournament not found.</p>
        <Link href="/catalog" className="text-sm hover:underline mt-2 block" style={{ color: "var(--cat-accent)" }}>← Back to catalog</Link>
      </div>
    </div>
    </ThemeProvider>
  );

  if (!org || !tournament) return (
    <ThemeProvider defaultTheme="light">
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--cat-bg)" }}>
      <div className="w-8 h-8 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "var(--cat-accent)", borderTopColor: "transparent" }} />
    </div>
    </ThemeProvider>
  );

  const brand = org.brandColor || "#272D2D";

  if (done) return (
    <ThemeProvider defaultTheme="light">
    <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
      <div className="h-1" style={{ backgroundColor: brand }} />
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-emerald-600" />
        </div>
        <h1 className="text-xl font-bold text-text-primary mb-2">Registration submitted!</h1>
        <p className="text-sm text-text-secondary mb-6">
          Your club has been registered for <strong>{tournament.name}</strong>. You will receive login credentials at <strong>{contactEmail}</strong>.
        </p>
        <Link
          href={`/t/${orgSlug}/${tournamentSlug}`}
          className="inline-flex items-center gap-2 text-sm font-semibold text-white px-5 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
          style={{ backgroundColor: brand }}
        >
          View tournament
        </Link>
      </div>
    </div>
    </ThemeProvider>
  );

  return (
    <ThemeProvider defaultTheme="light">
    <div className="min-h-screen" style={{ background: "var(--cat-bg)" }}>
      {/* Colored top bar */}
      <div className="h-1" style={{ backgroundColor: brand }} />

      {/* Navbar */}
      <header className="bg-white border-b border-border">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center gap-3">
          <Link href={`/t/${orgSlug}/${tournamentSlug}`} className="flex items-center gap-1.5 text-text-secondary hover:text-text-primary transition-colors text-sm">
            <ChevronLeft className="w-4 h-4" /> Back
          </Link>
          <div className="w-px h-5 bg-border" />
          <span className="text-[13px] font-semibold text-text-primary truncate">{tournament.name}</span>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-xl font-bold text-text-primary">Register your club</h1>
          <p className="text-sm text-text-secondary mt-1">Fill in the details below to register for {tournament.name}.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Club info */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
            <p className="text-sm font-semibold text-text-primary">Club information</p>

            {/* Logo upload */}
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-xl border-2 border-dashed border-border flex items-center justify-center overflow-hidden shrink-0 bg-surface">
                {logoPreview ? (
                  <img src={logoPreview} alt="" className="w-full h-full object-contain" />
                ) : (
                  <Upload className="w-5 h-5 text-text-secondary/40" />
                )}
              </div>
              <div>
                <label className="cursor-pointer inline-flex items-center gap-1.5 text-sm font-medium text-navy border border-navy/20 rounded-lg px-3 py-1.5 hover:bg-navy/5 transition-colors">
                  <Upload className="w-3.5 h-3.5" /> Upload badge
                  <input type="file" accept="image/*" className="hidden" onChange={handleLogo} />
                </label>
                <p className="text-xs text-text-secondary mt-1">PNG or JPG, max 2MB</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3">
              <Field label="Club name *" value={clubName} onChange={setClubName} placeholder="FC Tallinn" />
              <div className="grid grid-cols-2 gap-3">
                <Field label="Country" value={country} onChange={setCountry} placeholder="Estonia" />
                <Field label="City" value={city} onChange={setCity} placeholder="Tallinn" />
              </div>
              <Field label="Contact person" value={contactName} onChange={setContactName} placeholder="John Smith" />
            </div>
          </div>

          {/* Account */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-4">
            <p className="text-sm font-semibold text-text-primary">Login credentials</p>
            <p className="text-xs text-text-secondary -mt-2">You will use these to access the team cabinet.</p>
            <Field label="Email *" type="email" value={contactEmail} onChange={setContactEmail} placeholder="coach@fcclub.ee" />
            <Field label="Password *" type="password" value={password} onChange={setPassword} placeholder="Min. 8 characters" />
          </div>

          {/* Teams */}
          <div className="bg-white rounded-2xl border border-border shadow-sm p-5 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-text-primary">Teams</p>
              <button type="button" onClick={addTeam} className="flex items-center gap-1 text-xs font-medium text-navy hover:text-navy/80 transition-colors">
                <Plus className="w-3.5 h-3.5" /> Add team
              </button>
            </div>

            {selectedTeams.map((team, i) => (
              <div key={i} className="flex items-start gap-2">
                <div className="flex-1 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary mb-1 block">Age class *</label>
                    <select
                      value={team.classId}
                      onChange={e => updateTeam(i, "classId", e.target.value)}
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm bg-white focus:outline-none focus:border-navy/40"
                      required
                    >
                      <option value="">Select class</option>
                      {classes.map(c => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-text-secondary mb-1 block">Team name (optional)</label>
                    <input
                      type="text"
                      value={team.name}
                      onChange={e => updateTeam(i, "name", e.target.value)}
                      placeholder="e.g. FC Tallinn U12"
                      className="w-full rounded-xl border border-border px-3 py-2 text-sm focus:outline-none focus:border-navy/40"
                    />
                  </div>
                </div>
                {selectedTeams.length > 1 && (
                  <button type="button" onClick={() => removeTeam(i)} className="mt-6 p-1.5 hover:bg-surface rounded-lg transition-colors shrink-0">
                    <X className="w-4 h-4 text-text-secondary" />
                  </button>
                )}
              </div>
            ))}
          </div>

          {error && (
            <div className="bg-error-light border border-error/20 rounded-xl px-4 py-3 text-sm text-error">{error}</div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-xl text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
            style={{ backgroundColor: brand }}
          >
            {submitting ? <><Loader2 className="w-4 h-4 animate-spin" /> Submitting...</> : "Submit registration"}
          </button>

          <p className="text-xs text-text-secondary text-center">
            Already registered? <Link href="/en/login" className="text-navy hover:underline">Sign in here</Link>
          </p>
        </form>
      </div>
    </div>
    </ThemeProvider>
  );
}

function Field({
  label, value, onChange, placeholder, type = "text"
}: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div>
      <label className="text-[11px] font-medium text-text-secondary mb-1 block">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border px-3 py-2.5 text-sm focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/8"
      />
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Link } from "@/i18n/navigation";
import { ThemeProvider } from "@/components/ui/theme-provider";
import { LanguageSwitcher } from "@/components/ui/language-switcher";
import { CountrySelect } from "@/components/ui/country-select";
import {
  Crown, ChevronRight, ChevronLeft, Check,
  ImageIcon, Building2, Globe, Phone, Mail, User,
  Upload, Shield, Link2,
} from "lucide-react";

const STEPS = ["info", "branding", "contact"] as const;
type Step = (typeof STEPS)[number];

type ClubData = {
  id: number;
  name: string;
  country: string | null;
  city: string | null;
  badgeUrl: string | null;
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  website: string | null;
  instagram: string | null;
  facebook: string | null;
};

export default function ClubOnboardingPage() {
  const t = useTranslations("clubOnboarding");
  const router = useRouter();

  const [step, setStep] = useState<Step>("info");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [clubId, setClubId] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Step 1: Club Info
  const [clubName, setClubName] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  // Step 2: Branding
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [website, setWebsite] = useState("");
  const [instagram, setInstagram] = useState("");
  const [facebook, setFacebook] = useState("");
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Step 3: Contact
  const [contactName, setContactName] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactPhone, setContactPhone] = useState("");

  const stepIndex = STEPS.indexOf(step);
  const isFirst = stepIndex === 0;
  const isLast = stepIndex === STEPS.length - 1;

  const stepLabels = [t("step1"), t("step2"), t("step3")];

  // Fetch existing club data
  useEffect(() => {
    (async () => {
      try {
        const meRes = await fetch("/api/auth/me");
        const me = await meRes.json();
        if (!me.authenticated || me.role !== "club" || !me.clubId) {
          router.push("/login");
          return;
        }
        setClubId(me.clubId);

        const profileRes = await fetch(`/api/clubs/${me.clubId}/onboarding`);
        if (profileRes.ok) {
          const data: ClubData = await profileRes.json();
          setClubName(data.name || "");
          setCountry(data.country || "");
          setCity(data.city || "");
          setContactName(data.contactName || "");
          setContactEmail(data.contactEmail || "");
          setContactPhone(data.contactPhone || "");
          setWebsite(data.website || "");
          setInstagram(data.instagram || "");
          setFacebook(data.facebook || "");
          if (data.badgeUrl) setLogoPreview(data.badgeUrl);
        }
      } catch (e) {
        console.error("Failed to load club data:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function next() {
    setError("");
    if (step === "info" && !clubName.trim()) {
      setError("Club name is required");
      return;
    }
    if (!isLast) setStep(STEPS[stepIndex + 1]);
  }

  function prev() {
    setError("");
    if (!isFirst) setStep(STEPS[stepIndex - 1]);
  }

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  }

  function handleLogoDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files?.[0];
    if (!f) return;
    if (!f.type.startsWith("image/")) return;
    setLogoFile(f);
    setLogoPreview(URL.createObjectURL(f));
  }

  async function handleSubmit() {
    setError("");
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("name", clubName);
      fd.append("country", country);
      fd.append("city", city);
      fd.append("contactName", contactName);
      fd.append("contactEmail", contactEmail);
      fd.append("contactPhone", contactPhone);
      fd.append("website", website);
      fd.append("instagram", instagram);
      fd.append("facebook", facebook);
      if (logoFile) fd.append("logo", logoFile);

      const res = await fetch(`/api/clubs/${clubId}/onboarding`, {
        method: "PATCH",
        body: fd,
      });

      if (res.ok) {
        router.push("/club/dashboard");
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Failed to save");
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <ThemeProvider defaultTheme="dark">
        <div
          className="min-h-screen flex items-center justify-center"
          style={{ background: "var(--cat-bg)" }}
        >
          <div
            className="w-8 h-8 rounded-full border-3 border-t-transparent animate-spin"
            style={{ borderColor: "var(--cat-accent)", borderTopColor: "transparent" }}
          />
        </div>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider defaultTheme="dark">
      <div className="min-h-screen flex" style={{ background: "var(--cat-bg)" }}>

        {/* Left panel */}
        <div
          className="hidden lg:flex flex-col w-[38%] relative overflow-hidden"
          style={{
            background:
              "linear-gradient(135deg, var(--cat-banner-from), var(--cat-banner-via), var(--cat-banner-to))",
          }}
        >
          <div className="absolute inset-0 pointer-events-none">
            <div
              className="absolute top-[-15%] left-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.08]"
              style={{
                background: "radial-gradient(circle, var(--cat-accent), transparent 70%)",
              }}
            />
            <div
              className="absolute bottom-[-20%] right-[-5%] w-[400px] h-[400px] rounded-full opacity-[0.05]"
              style={{
                background: "radial-gradient(circle, #8B5CF6, transparent 70%)",
              }}
            />
          </div>

          {/* Logo */}
          <div className="relative z-10 p-10">
            <Link href="/" className="flex items-center gap-3">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  boxShadow: "0 4px 20px var(--cat-accent-glow)",
                }}
              >
                <img
                  src="/playGrowWin1.png"
                  alt="Goality"
                  className="w-full h-full object-contain"
                />
              </div>
              <span
                className="font-black text-[18px] tracking-tight"
                style={{ color: "var(--cat-text)" }}
              >
                Goality TMC
              </span>
            </Link>
          </div>

          {/* Center content */}
          <div className="relative z-10 flex-1 flex flex-col justify-center px-10 pb-10">
            <div className="mb-8">
              <div
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 border"
                style={{
                  background: "var(--cat-badge-open-bg)",
                  borderColor: "var(--cat-badge-open-border)",
                }}
              >
                <Crown className="w-3.5 h-3.5" style={{ color: "var(--cat-accent)" }} />
                <span
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: "var(--cat-accent)" }}
                >
                  {t("title")}
                </span>
              </div>
              <h1
                className="text-3xl xl:text-4xl font-black tracking-tight leading-[1.1] mb-4"
                style={{ color: "var(--cat-text)" }}
              >
                {t("title")}
              </h1>
              <p
                className="text-[14px] leading-relaxed"
                style={{ color: "var(--cat-text-secondary)" }}
              >
                {t("subtitle")}
              </p>
            </div>

            {/* Step indicators */}
            <ul className="space-y-3">
              {STEPS.map((s, i) => {
                const isActive = i === stepIndex;
                const isDone = i < stepIndex;
                return (
                  <li key={s} className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-[13px] font-bold transition-all"
                      style={
                        isDone
                          ? {
                              background: "var(--cat-accent)",
                              color: "var(--cat-accent-text)",
                            }
                          : isActive
                          ? {
                              background: "var(--cat-accent)",
                              color: "var(--cat-accent-text)",
                              boxShadow: "0 0 0 3px var(--cat-accent-glow)",
                            }
                          : {
                              background: "var(--cat-badge-open-bg)",
                              color: "var(--cat-text-muted)",
                              border: "1px solid var(--cat-card-border)",
                            }
                      }
                    >
                      {isDone ? <Check className="w-4 h-4" /> : i + 1}
                    </div>
                    <span
                      className="text-[13px] font-medium"
                      style={{
                        color: isActive
                          ? "var(--cat-text)"
                          : isDone
                          ? "var(--cat-text-secondary)"
                          : "var(--cat-text-muted)",
                      }}
                    >
                      {stepLabels[i]}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Bottom decorative card */}
          <div
            className="relative z-10 mx-8 mb-8 p-5 rounded-2xl border"
            style={{
              background: "var(--cat-card-bg)",
              borderColor: "var(--cat-card-border)",
            }}
          >
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5" style={{ color: "var(--cat-accent)" }} />
              <p
                className="text-[13px] leading-relaxed"
                style={{ color: "var(--cat-text-secondary)" }}
              >
                {t("publicNote")}
              </p>
            </div>
          </div>
        </div>

        {/* Right panel */}
        <div className="flex-1 flex flex-col overflow-y-auto">
          {/* Top bar */}
          <div className="flex items-center justify-between px-6 py-4 lg:px-10">
            <Link href="/" className="flex items-center gap-2 lg:hidden">
              <div
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0 overflow-hidden"
                style={{ background: "rgba(255,255,255,0.08)" }}
              >
                <img
                  src="/playGrowWin1.png"
                  alt="Goality"
                  className="w-full h-full object-contain"
                />
              </div>
              <span
                className="font-bold text-[15px]"
                style={{ color: "var(--cat-text)" }}
              >
                Goality TMC
              </span>
            </Link>
            <div className="ml-auto">
              <LanguageSwitcher variant="light" />
            </div>
          </div>

          {/* Form area */}
          <div className="flex-1 flex items-start justify-center px-6 py-8 lg:px-10">
            <div className="w-full max-w-[480px] space-y-6">

              {/* Mobile step indicator */}
              <div className="lg:hidden">
                <div className="flex items-center gap-2 mb-2">
                  {STEPS.map((s, i) => (
                    <div
                      key={s}
                      className="flex-1 h-1 rounded-full transition-all"
                      style={{
                        background:
                          i <= stepIndex ? "var(--cat-accent)" : "var(--cat-card-border)",
                      }}
                    />
                  ))}
                </div>
                <p
                  className="text-xs font-medium"
                  style={{ color: "var(--cat-text-muted)" }}
                >
                  {stepIndex + 1}/{STEPS.length} — {stepLabels[stepIndex]}
                </p>
              </div>

              {/* Title */}
              <div>
                <h2
                  className="text-2xl font-black mb-1"
                  style={{ color: "var(--cat-text)" }}
                >
                  {t("title")}
                </h2>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--cat-text-secondary)" }}
                >
                  {t("subtitle")}
                </p>
              </div>

              {/* Error */}
              {error && (
                <div
                  className="px-4 py-3 rounded-xl text-sm font-medium"
                  style={{
                    background: "rgba(239,68,68,0.1)",
                    color: "#ef4444",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}
                >
                  {error}
                </div>
              )}

              {/* ── Step 1: Club Info ── */}
              {step === "info" && (
                <div className="space-y-4">
                  {/* Club name */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("nameLabel")} <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      value={clubName}
                      onChange={(e) => setClubName(e.target.value)}
                      placeholder={t("namePlaceholder")}
                      className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                      style={{
                        background: "var(--cat-input-bg)",
                        border: "1px solid var(--cat-input-border)",
                        color: "var(--cat-text)",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--cat-accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--cat-input-border)")
                      }
                    />
                  </div>

                  {/* Country */}
                  <CountrySelect
                    value={country}
                    onChange={setCountry}
                    label={t("countryLabel")}
                    placeholder={t("countryLabel")}
                    variant="onboarding"
                  />

                  {/* City */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("cityLabel")}
                    </label>
                    <input
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder={t("cityPlaceholder")}
                      className="w-full px-4 py-3 rounded-xl text-[14px] outline-none transition-all"
                      style={{
                        background: "var(--cat-input-bg)",
                        border: "1px solid var(--cat-input-border)",
                        color: "var(--cat-text)",
                      }}
                      onFocus={(e) =>
                        (e.target.style.borderColor = "var(--cat-accent)")
                      }
                      onBlur={(e) =>
                        (e.target.style.borderColor = "var(--cat-input-border)")
                      }
                    />
                  </div>
                </div>
              )}

              {/* ── Step 2: Branding ── */}
              {step === "branding" && (
                <div className="space-y-4">
                  {/* Logo upload */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("logoLabel")}
                    </label>
                    <p
                      className="text-[11px] mb-2"
                      style={{ color: "var(--cat-text-muted)" }}
                    >
                      {t("logoHint")}
                    </p>

                    <div
                      className="relative flex flex-col items-center justify-center p-6 rounded-xl border-2 border-dashed cursor-pointer transition-all hover:opacity-80"
                      style={{
                        borderColor: logoPreview
                          ? "var(--cat-accent)"
                          : "var(--cat-card-border)",
                        background: "var(--cat-input-bg)",
                      }}
                      onClick={() => logoInputRef.current?.click()}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={handleLogoDrop}
                    >
                      {logoPreview ? (
                        <div className="flex items-center gap-4">
                          <img
                            src={logoPreview}
                            alt="Logo"
                            className="w-20 h-20 rounded-xl object-cover border"
                            style={{ borderColor: "var(--cat-card-border)" }}
                          />
                          <div>
                            <p
                              className="text-sm font-medium"
                              style={{ color: "var(--cat-text)" }}
                            >
                              {t("logoUpload")}
                            </p>
                            <p
                              className="text-xs"
                              style={{ color: "var(--cat-text-muted)" }}
                            >
                              {t("logoDrag")}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <>
                          <Upload
                            className="w-8 h-8 mb-2"
                            style={{ color: "var(--cat-text-muted)" }}
                          />
                          <p
                            className="text-sm font-medium"
                            style={{ color: "var(--cat-text)" }}
                          >
                            {t("logoUpload")}
                          </p>
                          <p
                            className="text-xs mt-0.5"
                            style={{ color: "var(--cat-text-muted)" }}
                          >
                            {t("logoDrag")}
                          </p>
                        </>
                      )}
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/gif,image/webp"
                        onChange={handleLogoChange}
                        className="hidden"
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("websiteLabel")}
                    </label>
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: "var(--cat-input-bg)",
                        border: "1px solid var(--cat-input-border)",
                      }}
                    >
                      <Globe
                        className="w-4 h-4 shrink-0"
                        style={{ color: "var(--cat-text-muted)" }}
                      />
                      <input
                        type="url"
                        value={website}
                        onChange={(e) => setWebsite(e.target.value)}
                        placeholder={t("websitePlaceholder")}
                        className="flex-1 text-[14px] bg-transparent outline-none"
                        style={{ color: "var(--cat-text)" }}
                      />
                    </div>
                  </div>

                  {/* Instagram */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("instagramLabel")}
                    </label>
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: "var(--cat-input-bg)",
                        border: "1px solid var(--cat-input-border)",
                      }}
                    >
                      <Link2
                        className="w-4 h-4 shrink-0"
                        style={{ color: "var(--cat-text-muted)" }}
                      />
                      <input
                        type="text"
                        value={instagram}
                        onChange={(e) => setInstagram(e.target.value)}
                        placeholder={t("instagramPlaceholder")}
                        className="flex-1 text-[14px] bg-transparent outline-none"
                        style={{ color: "var(--cat-text)" }}
                      />
                    </div>
                  </div>

                  {/* Facebook */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("facebookLabel")}
                    </label>
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: "var(--cat-input-bg)",
                        border: "1px solid var(--cat-input-border)",
                      }}
                    >
                      <Link2
                        className="w-4 h-4 shrink-0"
                        style={{ color: "var(--cat-text-muted)" }}
                      />
                      <input
                        type="text"
                        value={facebook}
                        onChange={(e) => setFacebook(e.target.value)}
                        placeholder={t("facebookPlaceholder")}
                        className="flex-1 text-[14px] bg-transparent outline-none"
                        style={{ color: "var(--cat-text)" }}
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* ── Step 3: Contact ── */}
              {step === "contact" && (
                <div className="space-y-4">
                  {/* Privacy notice */}
                  <div
                    className="flex items-start gap-3 px-4 py-3.5 rounded-xl border text-sm"
                    style={{
                      background: "rgba(59,130,246,0.06)",
                      borderColor: "rgba(59,130,246,0.2)",
                      color: "var(--cat-text-secondary)",
                    }}
                  >
                    <Shield
                      className="w-4 h-4 mt-0.5 shrink-0"
                      style={{ color: "#3b82f6" }}
                    />
                    <div>
                      <p className="font-semibold text-[13px] mb-0.5" style={{ color: "var(--cat-text)" }}>
                        {t("contactTitle")}
                      </p>
                      <p className="text-[12px] leading-relaxed">
                        {t("contactHint")}
                      </p>
                    </div>
                  </div>

                  {/* Contact name */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("contactNameLabel")}
                    </label>
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: "var(--cat-input-bg)",
                        border: "1px solid var(--cat-input-border)",
                      }}
                    >
                      <User
                        className="w-4 h-4 shrink-0"
                        style={{ color: "var(--cat-text-muted)" }}
                      />
                      <input
                        type="text"
                        value={contactName}
                        onChange={(e) => setContactName(e.target.value)}
                        placeholder={t("contactNamePlaceholder")}
                        className="flex-1 text-[14px] bg-transparent outline-none"
                        style={{ color: "var(--cat-text)" }}
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("emailLabel")}
                    </label>
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: "var(--cat-input-bg)",
                        border: "1px solid var(--cat-input-border)",
                      }}
                    >
                      <Mail
                        className="w-4 h-4 shrink-0"
                        style={{ color: "var(--cat-text-muted)" }}
                      />
                      <input
                        type="email"
                        value={contactEmail}
                        onChange={(e) => setContactEmail(e.target.value)}
                        placeholder="email@example.com"
                        className="flex-1 text-[14px] bg-transparent outline-none"
                        style={{ color: "var(--cat-text)" }}
                      />
                    </div>
                    <p
                      className="text-[11px] mt-1 ml-1"
                      style={{ color: "var(--cat-text-muted)" }}
                    >
                      {t("emailHint")}
                    </p>
                  </div>

                  {/* Phone */}
                  <div>
                    <label
                      className="block text-[12px] font-semibold mb-1.5"
                      style={{ color: "var(--cat-text-secondary)" }}
                    >
                      {t("phoneLabel")}
                    </label>
                    <div
                      className="flex items-center gap-2 px-4 py-3 rounded-xl transition-all"
                      style={{
                        background: "var(--cat-input-bg)",
                        border: "1px solid var(--cat-input-border)",
                      }}
                    >
                      <Phone
                        className="w-4 h-4 shrink-0"
                        style={{ color: "var(--cat-text-muted)" }}
                      />
                      <input
                        type="tel"
                        value={contactPhone}
                        onChange={(e) => setContactPhone(e.target.value)}
                        placeholder={t("phonePlaceholder")}
                        className="flex-1 text-[14px] bg-transparent outline-none"
                        style={{ color: "var(--cat-text)" }}
                      />
                    </div>
                    <p
                      className="text-[11px] mt-1 ml-1"
                      style={{ color: "var(--cat-text-muted)" }}
                    >
                      {t("phoneHint")}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Navigation buttons ── */}
              <div className="flex items-center gap-3 pt-2">
                {!isFirst && (
                  <button
                    type="button"
                    onClick={prev}
                    className="flex items-center gap-1.5 px-5 py-3 rounded-xl text-sm font-medium transition-all hover:opacity-80"
                    style={{
                      background: "var(--cat-tag-bg)",
                      color: "var(--cat-text-secondary)",
                    }}
                  >
                    <ChevronLeft className="w-4 h-4" />
                    {t("back")}
                  </button>
                )}

                {!isLast ? (
                  <button
                    type="button"
                    onClick={next}
                    className="flex-1 flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark, var(--cat-accent)))",
                      color: "var(--cat-accent-text)",
                      boxShadow: "0 2px 12px var(--cat-accent-glow)",
                    }}
                  >
                    {t("next")}
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-1 flex items-center justify-center gap-1.5 px-5 py-3 rounded-xl text-sm font-bold transition-all hover:opacity-90 disabled:opacity-60"
                    style={{
                      background:
                        "linear-gradient(90deg, var(--cat-accent), var(--cat-accent-dark, var(--cat-accent)))",
                      color: "var(--cat-accent-text)",
                      boxShadow: "0 2px 12px var(--cat-accent-glow)",
                    }}
                  >
                    {submitting ? (
                      <>
                        <div
                          className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin"
                          style={{
                            borderColor: "var(--cat-accent-text)",
                            borderTopColor: "transparent",
                          }}
                        />
                        {t("saving")}
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        {t("finish")}
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
}

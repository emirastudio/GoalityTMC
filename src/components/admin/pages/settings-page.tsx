"use client";

import { useEffect, useState, useCallback } from "react";
import { useTranslations } from "next-intl";
import { useAdminFetch } from "@/lib/tournament-context";
import { Card, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  MapPin,
  UtensilsCrossed,
  Phone,
  FileText,
  Save,
  Loader2,
  Check,
} from "lucide-react";

/* ────────────────────────────────────────────────── types */

interface TournamentInfoData {
  tournamentId: number;
  scheduleUrl?: string | null;
  scheduleDescription?: string | null;
  venueName?: string | null;
  venueAddress?: string | null;
  venueMapUrl?: string | null;
  mealTimes?: string | null;
  mealLocation?: string | null;
  mealNotes?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  additionalNotes?: string | null;
}

/* ────────────────────────────────────────── helpers */

function SectionHeader({
  icon: Icon,
  title,
}: {
  icon: React.ElementType;
  title: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-[var(--cat-accent)]/5">
        <Icon className="w-4 h-4 text-[var(--cat-accent)]" />
      </div>
      <h3 className="text-base font-semibold th-text">{title}</h3>
    </div>
  );
}

function Textarea({
  id,
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <div className="space-y-1.5">
      <label
        htmlFor={id}
        className="block text-sm font-medium th-text"
      >
        {label}
      </label>
      <textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full rounded-lg border th-border th-card px-3 py-2 text-sm th-text placeholder:th-text-2/50 transition-colors focus:outline-none focus:ring-2 focus:ring-[var(--cat-accent)]/15 focus:border-[var(--cat-accent)]"
      />
    </div>
  );
}

/* ────────────────────────────────────────── page */

export function SettingsPageContent() {
  const t = useTranslations("orgAdmin.tournamentSettings");
  const adminFetch = useAdminFetch();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /* form fields */
  const [scheduleUrl, setScheduleUrl] = useState("");
  const [scheduleDescription, setScheduleDescription] = useState("");
  const [venueName, setVenueName] = useState("");
  const [venueAddress, setVenueAddress] = useState("");
  const [venueMapUrl, setVenueMapUrl] = useState("");
  const [mealTimes, setMealTimes] = useState("");
  const [mealLocation, setMealLocation] = useState("");
  const [mealNotes, setMealNotes] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState("");

  /* ─── fetch ─── */
  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/tournament-info");
      if (!res.ok) throw new Error("Failed to load tournament info");
      const d: TournamentInfoData = await res.json();
      setScheduleUrl(d.scheduleUrl ?? "");
      setScheduleDescription(d.scheduleDescription ?? "");
      setVenueName(d.venueName ?? "");
      setVenueAddress(d.venueAddress ?? "");
      setVenueMapUrl(d.venueMapUrl ?? "");
      setMealTimes(d.mealTimes ?? "");
      setMealLocation(d.mealLocation ?? "");
      setMealNotes(d.mealNotes ?? "");
      setEmergencyContact(d.emergencyContact ?? "");
      setEmergencyPhone(d.emergencyPhone ?? "");
      setAdditionalNotes(d.additionalNotes ?? "");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ─── save ─── */
  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    setError(null);
    try {
      const res = await adminFetch("/api/admin/tournament-info", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scheduleUrl: scheduleUrl || null,
          scheduleDescription: scheduleDescription || null,
          venueName: venueName || null,
          venueAddress: venueAddress || null,
          venueMapUrl: venueMapUrl || null,
          mealTimes: mealTimes || null,
          mealLocation: mealLocation || null,
          mealNotes: mealNotes || null,
          emergencyContact: emergencyContact || null,
          emergencyPhone: emergencyPhone || null,
          additionalNotes: additionalNotes || null,
        }),
      });
      if (!res.ok) throw new Error("Save failed");
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  /* ─── render ─── */
  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--cat-accent)]" />
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold th-text">
          {t("title")}
        </h1>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? t("saving") : saved ? t("saved") : t("saveAll")}
        </Button>
      </div>

      {error && (
        <div className="rounded-lg bg-red-50 border border-error/20 px-4 py-3 text-sm text-error">
          {error}
        </div>
      )}

      {saved && (
        <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
          {t("saveSuccess")}
        </div>
      )}

      {/* ─── Schedule ─── */}
      <Card>
        <SectionHeader icon={Calendar} title={t("sectionSchedule")} />
        <div className="space-y-4">
          <Input
            id="scheduleUrl"
            label={t("scheduleUrl")}
            value={scheduleUrl}
            onChange={(e) => setScheduleUrl(e.target.value)}
            placeholder="https://..."
          />
          <Textarea
            id="scheduleDescription"
            label={t("description")}
            value={scheduleDescription}
            onChange={setScheduleDescription}
            placeholder={t("descriptionPlaceholder")}
          />
        </div>
      </Card>

      {/* ─── Venue ─── */}
      <Card>
        <SectionHeader icon={MapPin} title={t("sectionVenue")} />
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              id="venueName"
              label={t("venueName")}
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              placeholder={t("venueNamePlaceholder")}
            />
            <Input
              id="venueAddress"
              label={t("address")}
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              placeholder={t("addressPlaceholder")}
            />
          </div>
          <Input
            id="venueMapUrl"
            label={t("mapUrl")}
            value={venueMapUrl}
            onChange={(e) => setVenueMapUrl(e.target.value)}
            placeholder={t("mapUrlPlaceholder")}
          />
        </div>
      </Card>

      {/* ─── Meals ─── */}
      <Card>
        <SectionHeader icon={UtensilsCrossed} title={t("sectionMeals")} />
        <div className="space-y-4">
          <Input
            id="mealTimes"
            label={t("mealTimes")}
            value={mealTimes}
            onChange={(e) => setMealTimes(e.target.value)}
            placeholder={t("mealTimesPlaceholder")}
          />
          <Input
            id="mealLocation"
            label={t("mealLocation")}
            value={mealLocation}
            onChange={(e) => setMealLocation(e.target.value)}
            placeholder={t("mealLocationPlaceholder")}
          />
          <Textarea
            id="mealNotes"
            label={t("mealNotes")}
            value={mealNotes}
            onChange={setMealNotes}
            placeholder={t("mealNotesPlaceholder")}
          />
        </div>
      </Card>

      {/* ─── Emergency ─── */}
      <Card>
        <SectionHeader icon={Phone} title={t("sectionEmergency")} />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            id="emergencyContact"
            label={t("contactName")}
            value={emergencyContact}
            onChange={(e) => setEmergencyContact(e.target.value)}
            placeholder="Full name"
          />
          <Input
            id="emergencyPhone"
            label="Phone"
            value={emergencyPhone}
            onChange={(e) => setEmergencyPhone(e.target.value)}
            placeholder="+372 ..."
          />
        </div>
      </Card>

      {/* ─── Additional Notes ─── */}
      <Card>
        <SectionHeader icon={FileText} title="Additional Notes" />
        <Textarea
          id="additionalNotes"
          label="Notes"
          value={additionalNotes}
          onChange={setAdditionalNotes}
          placeholder="Any other information teams should know"
          rows={5}
        />
      </Card>

      {/* Bottom save */}
      <div className="flex justify-end pb-8">
        <Button onClick={handleSave} disabled={saving} size="lg">
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : saved ? (
            <Check className="w-4 h-4" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          {saving ? t("saving") : saved ? t("saved") : t("saveAll")}
        </Button>
      </div>
    </div>
  );
}

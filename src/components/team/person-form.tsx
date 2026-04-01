"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardTitle } from "@/components/ui/card";

type PersonType = "player" | "staff" | "accompanying";

interface PersonFormProps {
  type: PersonType;
  title: string;
  teamId: number;
  onClose: () => void;
  onSaved: () => void;
  positionOptions?: { value: string; label: string }[];
  roleOptions?: { value: string; label: string }[];
  showBirthYear?: boolean;
}

export function PersonForm({
  type,
  title,
  teamId,
  onClose,
  onSaved,
  positionOptions,
  roleOptions,
}: PersonFormProps) {
  const t = useTranslations("people");
  const tc = useTranslations("common");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);

    const body = {
      personType: type,
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      email: form.get("email"),
      phone: form.get("phone"),
      dateOfBirth: form.get("dateOfBirth") || null,
      shirtNumber: form.get("shirtNumber") || null,
      position: form.get("position") || null,
      role: form.get("role") || null,
      isResponsibleOnSite: form.get("isResponsibleOnSite") === "on",
      needsHotel: form.get("needsHotel") === "on",
      needsTransfer: form.get("needsTransfer") === "on",
      allergies: form.get("allergies"),
      dietaryRequirements: form.get("dietaryRequirements"),
      medicalNotes: form.get("medicalNotes"),
      showPublicly: form.get("showPublicly") === "on",
    };

    const res = await fetch(`/api/teams/${teamId}/people`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      onSaved();
      onClose();
    }
    setSaving(false);
  }

  return (
    <Card className="border-navy/10 border-2">
      <CardTitle>{title}</CardTitle>
      <form onSubmit={handleSubmit} className="mt-5 space-y-5">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <Input id="firstName" name="firstName" label={t("firstName")} required />
          <Input id="lastName" name="lastName" label={t("lastName")} required />
        </div>

        {/* Contact row */}
        <div className="grid grid-cols-2 gap-4">
          <Input id="email" name="email" type="email" label={t("email")} />
          <Input id="phone" name="phone" type="tel" label={t("phone")} />
        </div>

        {/* Player fields */}
        {type === "player" && (
          <div className="grid grid-cols-3 gap-4">
            <Input id="dateOfBirth" name="dateOfBirth" type="date" label={t("dateOfBirth")} required />
            <Input id="shirtNumber" name="shirtNumber" type="number" label={t("shirtNumber")} />
            {positionOptions && (
              <Select id="position" name="position" label={t("position")} options={positionOptions} placeholder="—" />
            )}
          </div>
        )}

        {/* Staff fields */}
        {type === "staff" && roleOptions && (
          <>
            <Select id="role" name="role" label={t("role")} options={roleOptions} placeholder="—" />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" name="isResponsibleOnSite" className="accent-navy w-4 h-4" />
              {t("responsibleOnSite")}
            </label>
          </>
        )}

        {/* Hotel & Transfer */}
        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="needsHotel" className="accent-navy w-4 h-4" />
            {t("needsHotel")}
          </label>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" name="needsTransfer" className="accent-navy w-4 h-4" />
            {t("needsTransfer")}
          </label>
        </div>

        {/* Medical section */}
        <div className="border-t border-border pt-4 space-y-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-text-secondary/60">
            {t("medicalDietary")}
          </p>
          <Input id="allergies" name="allergies" label={t("allergies")} placeholder={t("allergiesHint")} />
          <Input id="dietaryRequirements" name="dietaryRequirements" label={t("dietaryRequirements")} placeholder={t("dietaryHint")} />
          <Input id="medicalNotes" name="medicalNotes" label={t("medicalNotes")} placeholder={t("medicalHint")} />
        </div>

        {/* GDPR */}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 accent-navy" required />
          <span className="text-text-secondary">{t("gdprConsent")}</span>
        </label>

        <div className="flex gap-3 pt-2">
          <Button type="submit" disabled={saving}>
            {saving ? "..." : tc("save")}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>{tc("cancel")}</Button>
        </div>
      </form>
    </Card>
  );
}

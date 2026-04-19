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

// Person form — справочник клуба. После рефакторинга 0018 здесь ТОЛЬКО
// постоянные данные: ФИ, ДР, амплуа/роль. Контакты (email/phone) — только
// для staff/accompanying, для детей запрещены на уровне БД.
// Всё поездочное (номер футболки, отель, аллергии, ответственный) теперь
// живёт в registration_people и редактируется на странице ростера турнира.
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

  const isAdult = type === "staff" || type === "accompanying";

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);

    const form = new FormData(e.currentTarget);

    const body = {
      personType: type,
      firstName: form.get("firstName"),
      lastName: form.get("lastName"),
      email: isAdult ? form.get("email") : null,
      phone: isAdult ? form.get("phone") : null,
      dateOfBirth: form.get("dateOfBirth") || null,
      position: form.get("position") || null,
      role: form.get("role") || null,
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

        {/* Contact row — только для взрослых (staff/accompanying) */}
        {isAdult && (
          <div className="grid grid-cols-2 gap-4">
            <Input id="email" name="email" type="email" label={t("email")} />
            <Input id="phone" name="phone" type="tel" label={t("phone")} />
          </div>
        )}

        {/* Player fields — только ДР и амплуа (номер живёт на турнире) */}
        {type === "player" && (
          <div className="grid grid-cols-2 gap-4">
            <Input id="dateOfBirth" name="dateOfBirth" type="date" label={t("dateOfBirth")} required />
            {positionOptions && (
              <Select id="position" name="position" label={t("position")} options={positionOptions} placeholder="—" />
            )}
          </div>
        )}

        {/* Staff fields */}
        {type === "staff" && roleOptions && (
          <Select id="role" name="role" label={t("role")} options={roleOptions} placeholder="—" />
        )}

        {/* Accompanying — ДР необязательно */}
        {type === "accompanying" && (
          <Input id="dateOfBirth" name="dateOfBirth" type="date" label={t("dateOfBirth")} />
        )}

        {/* GDPR */}
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" className="mt-1 accent-navy" required />
          <span className="th-text-2">{t("gdprConsent")}</span>
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

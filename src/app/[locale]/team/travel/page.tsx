"use client";

import { useState, useEffect } from "react";
import { useTranslations } from "next-intl";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useTeam } from "@/lib/team-context";
import { Alert } from "@/components/ui/alert";

export default function TravelPage() {
  const t = useTranslations("travel");
  const tc = useTranslations("common");
  const { teamId } = useTeam();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [form, setForm] = useState({
    arrivalType: "",
    arrivalDate: "",
    arrivalTime: "",
    arrivalDetails: "",
    departureType: "",
    departureDate: "",
    departureTime: "",
    departureDetails: "",
  });

  const transportTypes = [
    { value: "airport", label: t("types.airport") },
    { value: "port", label: t("types.port") },
    { value: "railway", label: t("types.railway") },
    { value: "bus_station", label: t("types.bus_station") },
    { value: "own_bus", label: t("types.own_bus") },
  ];

  useEffect(() => {
    if (!teamId) return;
    // Сбросить форму при смене команды
    setForm({ arrivalType: "", arrivalDate: "", arrivalTime: "", arrivalDetails: "", departureType: "", departureDate: "", departureTime: "", departureDetails: "" });
    fetch(`/api/teams/${teamId}/travel`).then(async (res) => {
      if (res.ok) {
        const data = await res.json();
        setForm({
          arrivalType: data.arrivalType ?? "",
          arrivalDate: data.arrivalDate ? new Date(data.arrivalDate).toISOString().split("T")[0] : "",
          arrivalTime: data.arrivalTime ?? "",
          arrivalDetails: data.arrivalDetails ?? "",
          departureType: data.departureType ?? "",
          departureDate: data.departureDate ? new Date(data.departureDate).toISOString().split("T")[0] : "",
          departureTime: data.departureTime ?? "",
          departureDetails: data.departureDetails ?? "",
        });
      }
    });
  }, [teamId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!teamId) return;
    setSaving(true);
    setSaved(false);

    const res = await fetch(`/api/teams/${teamId}/travel`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) setSaved(true);
    setSaving(false);
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {saved && <Alert variant="success">{tc("save")} ✓</Alert>}

      <Card>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>{t("description")}</CardDescription>

        <form onSubmit={handleSubmit} className="mt-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <h3 className="font-semibold text-navy border-b th-border pb-2">{t("arrival")}</h3>
              <Select
                id="arrivalType" label={t("transportType")}
                value={form.arrivalType}
                onChange={(e) => setForm({ ...form, arrivalType: e.target.value })}
                options={transportTypes}
                placeholder="—"
              />
              <Input
                id="arrivalDate" type="date" label={t("arrivalDate")}
                value={form.arrivalDate}
                onChange={(e) => setForm({ ...form, arrivalDate: e.target.value })}
              />
              <Input
                id="arrivalTime" type="time" label={t("arrivalTime")}
                value={form.arrivalTime}
                onChange={(e) => setForm({ ...form, arrivalTime: e.target.value })}
              />
              <Input
                id="arrivalDetails" label={t("arrivalDetails")} placeholder="e.g. FR1234"
                value={form.arrivalDetails}
                onChange={(e) => setForm({ ...form, arrivalDetails: e.target.value })}
              />
            </div>

            <div className="space-y-4">
              <h3 className="font-semibold text-navy border-b th-border pb-2">{t("departure")}</h3>
              <Select
                id="departureType" label={t("transportType")}
                value={form.departureType}
                onChange={(e) => setForm({ ...form, departureType: e.target.value })}
                options={transportTypes}
                placeholder="—"
              />
              <Input
                id="departureDate" type="date" label={t("departureDate")}
                value={form.departureDate}
                onChange={(e) => setForm({ ...form, departureDate: e.target.value })}
              />
              <Input
                id="departureTime" type="time" label={t("departureTime")}
                value={form.departureTime}
                onChange={(e) => setForm({ ...form, departureTime: e.target.value })}
              />
              <Input
                id="departureDetails" label={t("departureDetails")} placeholder="e.g. FR5678"
                value={form.departureDetails}
                onChange={(e) => setForm({ ...form, departureDetails: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button type="submit" disabled={saving}>
              {saving ? "..." : tc("save")}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}

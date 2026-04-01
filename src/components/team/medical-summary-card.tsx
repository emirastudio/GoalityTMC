"use client";

import { useTranslations } from "next-intl";
import { Card, CardTitle, CardDescription } from "@/components/ui/card";
import { Heart } from "lucide-react";

type Person = {
  id: number;
  firstName: string;
  lastName: string;
  personType: "player" | "staff" | "accompanying";
  allergies: string | null;
  dietaryRequirements: string | null;
  medicalNotes: string | null;
};

interface MedicalSummaryCardProps {
  people: Person[];
}

export function MedicalSummaryCard({ people }: MedicalSummaryCardProps) {
  const t = useTranslations("booking");
  const tp = useTranslations("people");
  const tn = useTranslations("nav");

  const withMedical = people.filter(
    (p) => p.allergies || p.dietaryRequirements || p.medicalNotes
  );

  const typeLabel = (type: string) => {
    switch (type) {
      case "player": return tn("players");
      case "staff": return tn("staff");
      case "accompanying": return tn("accompanying");
      default: return type;
    }
  };

  return (
    <Card>
      <CardTitle>{t("medicalSummaryTitle")}</CardTitle>
      <CardDescription>{t("medicalSummaryDescription")}</CardDescription>

      {withMedical.length === 0 ? (
        <div className="mt-4 text-center py-6 text-text-secondary text-sm">
          <Heart className="w-6 h-6 mx-auto mb-2 opacity-30" />
          {t("noMedicalInfo")}
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border text-left">
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{t("personName")}</th>
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{t("personType")}</th>
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{tp("allergies")}</th>
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{tp("dietaryRequirements")}</th>
                <th className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-text-secondary">{tp("medicalNotes")}</th>
              </tr>
            </thead>
            <tbody>
              {withMedical.map((p) => (
                <tr key={p.id} className="border-b border-border last:border-0">
                  <td className="py-2.5 text-sm font-medium">{p.firstName} {p.lastName}</td>
                  <td className="py-2.5 text-sm text-text-secondary">{typeLabel(p.personType)}</td>
                  <td className="py-2.5 text-sm">{p.allergies || "—"}</td>
                  <td className="py-2.5 text-sm">{p.dietaryRequirements || "—"}</td>
                  <td className="py-2.5 text-sm">{p.medicalNotes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

"use client";

import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2, Plus } from "lucide-react";

type Person = {
  id: number;
  firstName: string;
  lastName: string;
  email?: string;
  dateOfBirth?: string;
  position?: string;
  role?: string;
};

interface PersonTableProps {
  persons: Person[];
  type: "player" | "staff" | "accompanying";
  columns: { key: string; label: string }[];
  emptyText: string;
  addLabel: string;
  onAdd: () => void;
  onDelete?: (id: number) => void;
}

// Упрощённый просмотр справочника. Поездочная информация — на странице
// /club/tournaments/[id]/roster для конкретного турнира.
export function PersonTable({ persons, columns, emptyText, addLabel, onAdd, onDelete }: PersonTableProps) {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const _t = useTranslations("common");

  if (persons.length === 0) {
    return (
      <Card className="text-center py-10">
        <p className="th-text-2 text-sm">{emptyText}</p>
        <Button className="mt-4" onClick={onAdd}>
          <Plus className="w-4 h-4" />
          {addLabel}
        </Button>
      </Card>
    );
  }

  return (
    <Card padding={false}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b th-border text-left">
              {columns.map((col) => (
                <th key={col.key} className="px-4 py-3 text-xs font-medium th-text-2 uppercase">
                  {col.label}
                </th>
              ))}
              <th className="px-4 py-3 w-10"></th>
            </tr>
          </thead>
          <tbody>
            {persons.map((p) => (
              <tr key={p.id} className="border-b th-border last:border-0 hover:bg-surface/50">
                {columns.map((col) => {
                  let value = "";
                  if (col.key === "name") {
                    value = `${p.firstName} ${p.lastName}`;
                  } else if (col.key === "dateOfBirth" && p.dateOfBirth) {
                    value = new Date(p.dateOfBirth).toLocaleDateString("en-GB");
                  } else {
                    value = (p as Record<string, unknown>)[col.key]?.toString() || "—";
                  }
                  return (
                    <td key={col.key} className="px-4 py-3 text-sm">{value}</td>
                  );
                })}
                <td className="px-4 py-3">
                  {onDelete && (
                    <button
                      onClick={() => onDelete(p.id)}
                      className="th-text-2 hover:text-error cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

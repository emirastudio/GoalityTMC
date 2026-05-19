"use client";

import { useState } from "react";
import { Eye, EyeOff, Check, X } from "lucide-react";
// Single source of truth for the policy (also enforced server-side).
import {
  PASSWORD_TESTS,
  isPasswordValid as coreIsPasswordValid,
  getPasswordStrength as coreGetPasswordStrength,
  type PasswordStrength,
} from "@/lib/password";

export type { PasswordStrength };

interface Rule {
  label: string;
  test: (v: string) => boolean;
}

// Labels live here (UI concern); the predicates come from the shared
// policy so client and server can never drift.
const RULE_LABELS_EN = [
  "Min. 8 characters",
  "Uppercase letter (A–Z)",
  "Lowercase letter (a–z)",
  "Number (0–9)",
];
const RULES: Rule[] = PASSWORD_TESTS.map((test, i) => ({
  label: RULE_LABELS_EN[i],
  test,
}));

const RULE_LABELS_BY_LOCALE: Record<string, string[]> = {
  ru: [
    "Мин. 8 символов",
    "Заглавная буква (A–Z)",
    "Строчная буква (a–z)",
    "Цифра (0–9)",
  ],
  et: [
    "Min. 8 tähemärki",
    "Suur täht (A–Z)",
    "Väike täht (a–z)",
    "Number (0–9)",
  ],
};

const STRENGTH_LABELS: Record<string, [string, string, string]> = {
  en: ["Weak", "Medium", "Strong"],
  ru: ["Слабый", "Средний", "Сильный"],
  et: ["Nõrk", "Keskmine", "Tugev"],
};

// Re-exported from the shared policy so existing importers keep working.
export const getPasswordStrength = coreGetPasswordStrength;
export const isPasswordValid = coreIsPasswordValid;

interface Props {
  name?: string;
  placeholder?: string;
  locale?: string;
  required?: boolean;
  onChange?: (value: string, valid: boolean) => void;
}

export function PasswordStrengthInput({
  name = "password",
  placeholder = "••••••••",
  locale = "en",
  required,
  onChange,
}: Props) {
  const [value, setValue] = useState("");
  const [show, setShow] = useState(false);

  const labels = RULE_LABELS_BY_LOCALE[locale] ?? RULES.map((r) => r.label);
  const [weakLabel, medLabel, strongLabel] = STRENGTH_LABELS[locale] ?? STRENGTH_LABELS.en;

  const strength = getPasswordStrength(value);
  const passed = RULES.filter((r) => r.test(value)).length;
  const showIndicator = value.length > 0;

  const barColor =
    strength === "strong" ? "#22c55e" :
    strength === "medium" ? "#f59e0b" :
    "#ef4444";

  const strengthLabel =
    strength === "strong" ? strongLabel :
    strength === "medium" ? medLabel :
    weakLabel;

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const v = e.target.value;
    setValue(v);
    onChange?.(v, isPasswordValid(v));
  }

  return (
    <div className="space-y-2">
      {/* Input */}
      <div className="relative">
        <input
          name={name}
          type={show ? "text" : "password"}
          value={value}
          onChange={handleChange}
          placeholder={placeholder}
          required={required}
          autoComplete="new-password"
          className="w-full px-4 py-3 pr-11 rounded-xl text-[14px] outline-none transition-all"
          style={{
            background: "var(--cat-input-bg)",
            border: `1px solid ${showIndicator ? barColor + "60" : "var(--cat-input-border)"}`,
            color: "var(--cat-text)",
          }}
          onFocus={(e) => (e.currentTarget.style.borderColor = showIndicator ? barColor + "90" : "var(--cat-accent)")}
          onBlur={(e) => (e.currentTarget.style.borderColor = showIndicator ? barColor + "60" : "var(--cat-input-border)")}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          className="absolute right-3 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-70 transition-opacity"
          style={{ color: "var(--cat-text)" }}
          tabIndex={-1}
        >
          {show ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
      </div>

      {/* Strength bar + label */}
      {showIndicator && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <div className="flex gap-1 flex-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={i}
                  className="h-1 flex-1 rounded-full transition-all duration-300"
                  style={{
                    background: i <= passed ? barColor : "var(--cat-card-border)",
                  }}
                />
              ))}
            </div>
            <span className="text-[11px] font-semibold shrink-0" style={{ color: barColor }}>
              {strengthLabel}
            </span>
          </div>

          {/* Requirements checklist */}
          <div className="grid grid-cols-2 gap-x-3 gap-y-1">
            {RULES.map((rule, i) => {
              const ok = rule.test(value);
              return (
                <div key={i} className="flex items-center gap-1.5">
                  {ok
                    ? <Check className="w-3 h-3 shrink-0" style={{ color: "#22c55e" }} />
                    : <X className="w-3 h-3 shrink-0" style={{ color: "var(--cat-text-muted)" }} />
                  }
                  <span className="text-[11px]" style={{ color: ok ? "var(--cat-text-secondary)" : "var(--cat-text-muted)" }}>
                    {labels[i]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

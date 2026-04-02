import { cn } from "@/lib/utils";

export type BadgeVariant = "default" | "success" | "warning" | "error" | "gold" | "info";

/* Цвета берутся из CSS-переменных темы — автоматически переключаются dark/light */
const variantVars: Record<BadgeVariant, { bg: string; border: string; color: string; shadow: string }> = {
  default: {
    bg:     "var(--badge-default-bg)",
    border: "var(--badge-default-border)",
    color:  "var(--badge-default-color)",
    shadow: "var(--badge-default-shadow)",
  },
  success: {
    bg:     "var(--badge-success-bg)",
    border: "var(--badge-success-border)",
    color:  "var(--badge-success-color)",
    shadow: "var(--badge-success-shadow)",
  },
  warning: {
    bg:     "var(--badge-warning-bg)",
    border: "var(--badge-warning-border)",
    color:  "var(--badge-warning-color)",
    shadow: "var(--badge-warning-shadow)",
  },
  error: {
    bg:     "var(--badge-error-bg)",
    border: "var(--badge-error-border)",
    color:  "var(--badge-error-color)",
    shadow: "var(--badge-error-shadow)",
  },
  gold: {
    bg:     "var(--badge-gold-bg)",
    border: "var(--badge-gold-border)",
    color:  "var(--badge-gold-color)",
    shadow: "var(--badge-gold-shadow)",
  },
  info: {
    bg:     "var(--badge-info-bg)",
    border: "var(--badge-info-border)",
    color:  "var(--badge-info-color)",
    shadow: "var(--badge-info-shadow)",
  },
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  const v = variantVars[variant];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest",
        className
      )}
      style={{
        background: v.bg,
        border: `1px solid ${v.border}`,
        color: v.color,
        boxShadow: v.shadow,
      }}
    >
      {children}
    </span>
  );
}

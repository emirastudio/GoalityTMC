import { cn } from "@/lib/utils";

type BadgeVariant = "default" | "success" | "warning" | "error" | "gold" | "info";

const variants: Record<BadgeVariant, string> = {
  default: "bg-surface text-text-secondary",
  success: "bg-success-light text-success",
  warning: "bg-warning-light text-warning",
  error: "bg-error-light text-error",
  gold: "bg-gold-light text-gold-dark",
  info: "bg-navy/10 text-navy",
};

interface BadgeProps {
  variant?: BadgeVariant;
  children: React.ReactNode;
  className?: string;
}

export function Badge({ variant = "default", children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium",
        variants[variant],
        className
      )}
    >
      {children}
    </span>
  );
}

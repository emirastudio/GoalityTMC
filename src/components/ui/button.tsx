"use client";

import { cn } from "@/lib/utils";
import { ButtonHTMLAttributes, forwardRef } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "gold";
type Size = "sm" | "md" | "lg";

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

const variants: Record<Variant, string> = {
  primary:   "bg-[var(--cat-accent)] text-[var(--cat-accent-text)] hover:opacity-90 shadow-[0_0_14px_var(--cat-accent-glow)] font-semibold",
  secondary: "th-card border th-text hover:opacity-90",
  ghost:     "bg-transparent th-text-2 hover:th-tag",
  danger:    "bg-error text-white hover:bg-red-700",
  gold:      "bg-[var(--cat-accent)] text-[var(--cat-accent-text)] font-semibold hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "px-3 py-1.5 text-[12px]",
  md: "px-4 py-2 text-[13px]",
  lg: "px-6 py-3 text-sm",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", disabled, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-navy/20 disabled:opacity-50 disabled:pointer-events-none cursor-pointer",
        variants[variant],
        sizes[size],
        className
      )}
      disabled={disabled}
      {...props}
    />
  )
);
Button.displayName = "Button";

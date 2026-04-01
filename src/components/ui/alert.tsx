import { cn } from "@/lib/utils";
import { AlertCircle, CheckCircle, Info, AlertTriangle } from "lucide-react";

type AlertVariant = "info" | "success" | "warning" | "error";

const styles: Record<AlertVariant, { bg: string; border: string; icon: React.ReactNode }> = {
  info: {
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <Info className="w-5 h-5 text-blue-500" />,
  },
  success: {
    bg: "bg-success-light",
    border: "border-green-200",
    icon: <CheckCircle className="w-5 h-5 text-success" />,
  },
  warning: {
    bg: "bg-warning-light",
    border: "border-yellow-300",
    icon: <AlertTriangle className="w-5 h-5 text-warning" />,
  },
  error: {
    bg: "bg-error-light",
    border: "border-red-200",
    icon: <AlertCircle className="w-5 h-5 text-error" />,
  },
};

interface AlertProps {
  variant?: AlertVariant;
  children: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function Alert({ variant = "info", children, action, className }: AlertProps) {
  const s = styles[variant];
  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-xl border p-4",
        s.bg,
        s.border,
        className
      )}
    >
      {s.icon}
      <div className="flex-1 text-sm">{children}</div>
      {action}
    </div>
  );
}

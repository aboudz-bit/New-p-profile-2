import { cn } from "@/lib/utils";
import { ShieldCheck, ShieldAlert, ShieldX, Clock } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export type StatusType = "active" | "expiring" | "expired" | "unprotected" | "eligible";

interface StatusBadgeProps {
  status: StatusType;
  className?: string;
  showIcon?: boolean;
}

export function StatusBadge({ status, className, showIcon = true }: StatusBadgeProps) {
  const { t, language } = useI18n();

  const styles = {
    active: "bg-emerald-100 text-emerald-700 border-emerald-200",
    expiring: "bg-amber-100 text-amber-700 border-amber-200",
    expired: "bg-slate-100 text-slate-600 border-slate-200",
    unprotected: "bg-slate-100 text-slate-600 border-slate-200",
    eligible: "bg-blue-100 text-blue-700 border-blue-200",
  };

  const labels = {
    active: t("status.active"),
    expiring: t("status.expiring"),
    expired: t("status.expired"),
    unprotected: t("status.unprotected"),
    eligible: t("status.eligible"),
  };

  const Icons = {
    active: ShieldCheck,
    expiring: Clock,
    expired: ShieldX,
    unprotected: ShieldX,
    eligible: ShieldAlert,
  };

  const Icon = Icons[status];

  return (
    <div
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border",
        styles[status],
        className
      )}
    >
      {showIcon && <Icon className={cn("w-3 h-3", language === 'ar' ? "ml-1" : "mr-1")} />}
      {labels[status]}
    </div>
  );
}

import { Badge } from "./ui/index";
import { useI18n } from "@/lib/i18n";
import type { TranslationKey } from "@/lib/translations";

type AnyStatus =
  | "active" | "in_service" | "retired" | "disposed"
  | "expired" | "expiring_soon" | "unknown"
  | "open" | "in_progress" | "completed";

const toneMap: Record<AnyStatus, "ok" | "warn" | "danger" | "neutral" | "brand"> = {
  active: "ok",
  completed: "ok",
  in_progress: "brand",
  open: "warn",
  in_service: "warn",
  expiring_soon: "warn",
  expired: "danger",
  retired: "neutral",
  disposed: "neutral",
  unknown: "neutral",
};

export function StatusBadge({ status }: { status: AnyStatus | null | undefined }) {
  const { t } = useI18n();
  if (!status) return <span className="text-muted">—</span>;
  return <Badge tone={toneMap[status] ?? "neutral"}>{t(`status.${status}` as TranslationKey)}</Badge>;
}

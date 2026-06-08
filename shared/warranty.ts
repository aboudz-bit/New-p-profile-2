/**
 * Warranty status is DERIVED, never stored — so it can never go stale.
 * "Expiring Soon" = expires within the next `EXPIRING_WINDOW_DAYS` days.
 */
import type { WarrantyType } from "./schema";

export const EXPIRING_WINDOW_DAYS = 30;

export type WarrantyStatus = "active" | "expiring_soon" | "expired" | "unknown";

const MS_PER_DAY = 1000 * 60 * 60 * 24;

/** Display/timeline order: base coverage → extension → protection plan. */
export const WARRANTY_TYPE_ORDER: Record<WarrantyType, number> = {
  manufacturer: 0,
  extended: 1,
  protection_plan: 2,
};

/** Whole days from `now` until `endDate` (negative once expired). */
export function remainingDays(
  endDate: string | Date | null | undefined,
  now: Date = new Date(),
): number | null {
  if (!endDate) return null;
  const end = typeof endDate === "string" ? new Date(endDate + "T00:00:00") : endDate;
  if (Number.isNaN(end.getTime())) return null;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.ceil((end.getTime() - startOfToday.getTime()) / MS_PER_DAY);
}

export function warrantyStatus(
  endDate: string | Date | null | undefined,
  now: Date = new Date(),
): WarrantyStatus {
  const days = remainingDays(endDate, now);
  if (days === null) return "unknown";
  if (days < 0) return "expired";
  if (days <= EXPIRING_WINDOW_DAYS) return "expiring_soon";
  return "active";
}

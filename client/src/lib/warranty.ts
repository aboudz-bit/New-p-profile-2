import { addMonths, differenceInCalendarDays } from "date-fns";
import type { Asset, WarrantyStatus } from "./b2bTypes";

export function computeWarrantyEndDate(asset: Pick<Asset, "purchaseDate" | "warrantyMonths" | "warrantyEndDate">) {
  if (asset.warrantyEndDate) return asset.warrantyEndDate;
  return addMonths(new Date(asset.purchaseDate), asset.warrantyMonths).toISOString();
}

export function computeWarrantyStatus(endDateISO: string): WarrantyStatus {
  const days = differenceInCalendarDays(new Date(endDateISO), new Date());
  if (days < 0) return "EXPIRED";
  if (days <= 30) return "EXPIRING_SOON";
  return "ACTIVE";
}

export function warrantyDaysRemaining(endDateISO: string) {
  return differenceInCalendarDays(new Date(endDateISO), new Date());
}

export function enrichAssetWarranty(asset: Asset) {
  const end = computeWarrantyEndDate(asset);
  const status = computeWarrantyStatus(end);
  const daysRemaining = warrantyDaysRemaining(end);
  return { endDateISO: end, warrantyStatus: status, daysRemaining };
}

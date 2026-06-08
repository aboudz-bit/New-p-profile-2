/** Records a product-profile status change. Best-effort: must never break a request. */
import { db } from "../db";
import { statusHistory, type ProfileStatus } from "@shared/schema";

interface StatusChangeInput {
  partyId: string;
  profileId: string;
  oldStatus: ProfileStatus | null;
  newStatus: ProfileStatus;
  changedByUserId?: string | null;
  reason?: string | null;
}

export async function recordStatusChange(input: StatusChangeInput): Promise<void> {
  if (input.oldStatus === input.newStatus) return; // nothing changed
  try {
    await db.insert(statusHistory).values({
      partyId: input.partyId,
      profileId: input.profileId,
      oldStatus: input.oldStatus ?? null,
      newStatus: input.newStatus,
      changedByUserId: input.changedByUserId ?? null,
      reason: input.reason ?? null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[statusHistory] failed to record", err);
  }
}

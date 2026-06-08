/** Records an audit entry. Best-effort: logging must never break a request. */
import { db } from "../db";
import { activityLogs } from "@shared/schema";

interface LogInput {
  partyId: string;
  actorUserId?: string | null;
  entityType: string;
  entityId?: string | null;
  action: string;
  summary?: string;
  metadata?: Record<string, unknown>;
}

export async function logActivity(input: LogInput): Promise<void> {
  try {
    await db.insert(activityLogs).values({
      partyId: input.partyId,
      actorUserId: input.actorUserId ?? null,
      entityType: input.entityType,
      entityId: input.entityId ?? null,
      action: input.action,
      summary: input.summary,
      metadata: input.metadata ?? null,
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[activity] failed to record", err);
  }
}

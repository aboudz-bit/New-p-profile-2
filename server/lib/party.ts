/** Small helpers around the acting party (actor). */
import { eq } from "drizzle-orm";
import { db } from "../db";
import { parties, type PartyType } from "@shared/schema";

export async function getPartyType(partyId: string): Promise<PartyType> {
  const [p] = await db
    .select({ type: parties.type })
    .from(parties)
    .where(eq(parties.id, partyId))
    .limit(1);
  return (p?.type ?? "consumer") as PartyType;
}

export function isBusiness(type: PartyType): boolean {
  return type === "business";
}

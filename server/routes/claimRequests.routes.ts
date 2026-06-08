/**
 * Claim Requests management. Creation lives at POST /api/profiles/claim
 * (unowned → direct claim; owned → pending request with proof). Here owners see
 * incoming pending requests and reject them; requesters see/cancel their own.
 *
 * Approving a request (which would transfer ownership) is **Phase 2** — Phase 1
 * captures intent + proof only. No marketplace, no payments.
 */
import { Router } from "express";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db";
import { claimRequests, productProfiles, profileAssociations, users } from "@shared/schema";
import { requireAuth } from "../lib/auth";
import { asyncHandler, parseBody, ApiError, pathParam } from "../lib/http";
import { logActivity } from "../lib/activity";

export const claimRequestsRouter = Router();
claimRequestsRouter.use(requireAuth());

async function ownsProfile(partyId: string, profileId: string): Promise<boolean> {
  const [a] = await db
    .select({ id: profileAssociations.id })
    .from(profileAssociations)
    .where(
      and(
        eq(profileAssociations.profileId, profileId),
        eq(profileAssociations.partyId, partyId),
        eq(profileAssociations.relationship, "owner"),
        eq(profileAssociations.status, "active"),
      ),
    );
  return !!a;
}

// List incoming (on profiles I own) or outgoing (I requested) claim requests.
claimRequestsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const direction = z.enum(["incoming", "outgoing"]).default("outgoing").parse(req.query.direction);
    const partyId = req.partyId!;

    if (direction === "outgoing") {
      const rows = await db
        .select({
          request: claimRequests,
          profileName: productProfiles.displayName,
          pProfileId: productProfiles.pProfileId,
        })
        .from(claimRequests)
        .innerJoin(productProfiles, eq(productProfiles.id, claimRequests.profileId))
        .where(eq(claimRequests.requesterPartyId, partyId))
        .orderBy(desc(claimRequests.createdAt));
      res.json(rows.map((r) => ({ ...r.request, profileName: r.profileName, pProfileId: r.pProfileId })));
      return;
    }

    // incoming: pending requests on profiles this party actively owns
    const rows = await db
      .select({
        request: claimRequests,
        profileName: productProfiles.displayName,
        pProfileId: productProfiles.pProfileId,
        requesterName: users.name,
      })
      .from(claimRequests)
      .innerJoin(productProfiles, eq(productProfiles.id, claimRequests.profileId))
      .innerJoin(
        profileAssociations,
        and(
          eq(profileAssociations.profileId, claimRequests.profileId),
          eq(profileAssociations.partyId, partyId),
          eq(profileAssociations.relationship, "owner"),
          eq(profileAssociations.status, "active"),
        ),
      )
      .leftJoin(users, eq(users.id, claimRequests.requesterUserId))
      .where(eq(claimRequests.status, "pending"))
      .orderBy(desc(claimRequests.createdAt));
    res.json(
      rows.map((r) => ({
        ...r.request,
        profileName: r.profileName,
        pProfileId: r.pProfileId,
        requesterName: r.requesterName,
      })),
    );
  }),
);

const resolveSchema = z.object({ action: z.enum(["reject", "cancel"]) });

claimRequestsRouter.patch(
  "/:id",
  asyncHandler(async (req, res) => {
    const partyId = req.partyId!;
    const { action } = parseBody(resolveSchema, req);

    const [cr] = await db
      .select()
      .from(claimRequests)
      .where(eq(claimRequests.id, pathParam(req, "id")))
      .limit(1);
    if (!cr) throw new ApiError(404, "Claim request not found");
    if (cr.status !== "pending") throw new ApiError(409, "Claim request already resolved");

    if (action === "cancel") {
      if (cr.requesterPartyId !== partyId) throw new ApiError(403, "Not your claim request");
    } else {
      // reject — only the current owner of the target profile may reject
      if (!(await ownsProfile(partyId, cr.profileId))) {
        throw new ApiError(403, "Only the current owner can reject this request");
      }
    }

    const [row] = await db
      .update(claimRequests)
      .set({
        status: action === "cancel" ? "cancelled" : "rejected",
        resolvedByUserId: req.user!.id,
        resolvedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(claimRequests.id, cr.id))
      .returning();

    await logActivity({
      partyId,
      actorUserId: req.user!.id,
      entityType: "claim_request",
      entityId: row.id,
      action: action === "cancel" ? "cancelled" : "rejected",
      summary: `Claim request ${action === "cancel" ? "cancelled" : "rejected"}`,
    });
    res.json(row);
  }),
);

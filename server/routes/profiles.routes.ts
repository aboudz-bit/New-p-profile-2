/**
 * Product Profiles — the central object's API.
 *
 * Scoping (Phase 1): a party accesses the profiles it OWNS, resolved through an
 * active `owner` association. The B2B lens (branch, responsible user, internal
 * reference) is read/written via `business_profile_context` on that association.
 * Purchase price lives in `purchase_records` (owner-private) — never on the
 * global profile.
 */
import { Router } from "express";
import { z } from "zod";
import { and, eq, desc, ilike, inArray, or } from "drizzle-orm";
import { db } from "../db";
import {
  productProfiles,
  productModels,
  profileAssociations,
  businessProfileContext,
  branches,
  users,
  warranties,
  purchaseRecords,
  directoryEntries,
  profileServiceCenters,
  statusHistory,
  claimRequests,
  profileStatusEnum,
} from "@shared/schema";
import {
  warrantyStatus,
  remainingDays,
  WARRANTY_TYPE_ORDER,
  type WarrantyStatus,
} from "@shared/warranty";
import { requireAuth, requirePermission } from "../lib/auth";
import { asyncHandler, parseBody, ApiError, pathParam } from "../lib/http";
import { logActivity } from "../lib/activity";
import { recordStatusChange } from "../lib/statusHistory";
import { storage } from "../lib/storage";
import { getPartyType, isBusiness } from "../lib/party";
import { generatePProfileId } from "../lib/identity";

export const profilesRouter = Router();
profilesRouter.use(requireAuth());

/** Worst-case warranty status across a profile (expired > expiring > active). */
function rollupWarranty(statuses: WarrantyStatus[]): WarrantyStatus | null {
  if (statuses.includes("expired")) return "expired";
  if (statuses.includes("expiring_soon")) return "expiring_soon";
  if (statuses.includes("active")) return "active";
  return null;
}

/** Resolve the caller's active owner association for a profile, or 404. */
async function requireOwnerAssociation(partyId: string, profileId: string) {
  const [assoc] = await db
    .select()
    .from(profileAssociations)
    .where(
      and(
        eq(profileAssociations.profileId, profileId),
        eq(profileAssociations.partyId, partyId),
        eq(profileAssociations.relationship, "owner"),
        eq(profileAssociations.status, "active"),
      ),
    )
    .limit(1);
  if (!assoc) throw new ApiError(404, "Product profile not found");
  return assoc;
}

// ---- LIST --------------------------------------------------------------------
const listQuery = z.object({
  status: z.enum(profileStatusEnum.enumValues).optional(),
  branchId: z.string().uuid().optional(),
  q: z.string().max(200).optional(),
});

profilesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const filters = listQuery.parse(req.query);
    const partyId = req.partyId!;

    const conds = [
      eq(profileAssociations.partyId, partyId),
      eq(profileAssociations.relationship, "owner"),
      eq(profileAssociations.status, "active"),
    ];
    if (filters.status) conds.push(eq(productProfiles.status, filters.status));
    if (filters.branchId) conds.push(eq(businessProfileContext.branchId, filters.branchId));
    if (filters.q) {
      conds.push(
        or(
          ilike(productProfiles.displayName, `%${filters.q}%`),
          ilike(productProfiles.serialNumber, `%${filters.q}%`),
          ilike(productProfiles.brand, `%${filters.q}%`),
          ilike(productProfiles.model, `%${filters.q}%`),
          ilike(productProfiles.pProfileId, `%${filters.q}%`),
        )!,
      );
    }

    const rows = await db
      .select({
        profile: productProfiles,
        branchName: branches.name,
        internalReference: businessProfileContext.internalReference,
        modelName: productModels.name,
      })
      .from(profileAssociations)
      .innerJoin(productProfiles, eq(productProfiles.id, profileAssociations.profileId))
      .leftJoin(
        businessProfileContext,
        eq(businessProfileContext.associationId, profileAssociations.id),
      )
      .leftJoin(branches, eq(branches.id, businessProfileContext.branchId))
      .leftJoin(productModels, eq(productModels.id, productProfiles.productModelId))
      .where(and(...conds))
      .orderBy(desc(productProfiles.createdAt));

    const ids = rows.map((r) => r.profile.id);

    // Warranty rollup + owner-private purchase price, batched (no N+1).
    const wRows = ids.length
      ? await db
          .select({ profileId: warranties.profileId, endDate: warranties.endDate })
          .from(warranties)
          .where(
            and(eq(warranties.partyId, partyId), inArray(warranties.profileId, ids)),
          )
      : [];
    const byProfile = new Map<string, WarrantyStatus[]>();
    for (const w of wRows) {
      const list = byProfile.get(w.profileId) ?? [];
      list.push(warrantyStatus(w.endDate));
      byProfile.set(w.profileId, list);
    }

    const pRows = ids.length
      ? await db
          .select({
            profileId: purchaseRecords.profileId,
            total: purchaseRecords.total,
            currency: purchaseRecords.currency,
          })
          .from(purchaseRecords)
          .where(
            and(eq(purchaseRecords.partyId, partyId), inArray(purchaseRecords.profileId, ids)),
          )
      : [];
    const priceByProfile = new Map<string, { total: string | null; currency: string }>();
    for (const p of pRows) priceByProfile.set(p.profileId, { total: p.total, currency: p.currency });

    res.json(
      rows.map((r) => ({
        ...r.profile,
        branchName: r.branchName,
        internalReference: r.internalReference,
        modelName: r.modelName,
        purchasePrice: priceByProfile.get(r.profile.id)?.total ?? null,
        currency: priceByProfile.get(r.profile.id)?.currency ?? "SAR",
        warrantyStatus: rollupWarranty(byProfile.get(r.profile.id) ?? []),
      })),
    );
  }),
);

// ---- DETAIL ------------------------------------------------------------------
profilesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const partyId = req.partyId!;
    const assoc = await requireOwnerAssociation(partyId, pathParam(req, "id"));

    const profile = await db.query.productProfiles.findFirst({
      where: eq(productProfiles.id, pathParam(req, "id")),
      with: {
        productModel: true,
        warranties: true,
        maintenanceRecords: { with: { serviceCenter: true } },
        documents: true,
        purchaseRecords: true,
        serviceCenterLinks: true,
      },
    });
    if (!profile) throw new ApiError(404, "Product profile not found");

    // B2B lens context for this owner association.
    const [ctx] = await db
      .select({
        branchId: businessProfileContext.branchId,
        branchName: branches.name,
        responsibleUserId: businessProfileContext.responsibleUserId,
        responsibleUserName: users.name,
        internalReference: businessProfileContext.internalReference,
        internalNotes: businessProfileContext.internalNotes,
      })
      .from(businessProfileContext)
      .leftJoin(branches, eq(branches.id, businessProfileContext.branchId))
      .leftJoin(users, eq(users.id, businessProfileContext.responsibleUserId))
      .where(eq(businessProfileContext.associationId, assoc.id))
      .limit(1);

    // Status history (newest first) with the actor's name.
    const history = await db
      .select({
        id: statusHistory.id,
        oldStatus: statusHistory.oldStatus,
        newStatus: statusHistory.newStatus,
        reason: statusHistory.reason,
        createdAt: statusHistory.createdAt,
        changedByName: users.name,
      })
      .from(statusHistory)
      .leftJoin(users, eq(users.id, statusHistory.changedByUserId))
      .where(eq(statusHistory.profileId, profile.id))
      .orderBy(desc(statusHistory.createdAt));

    // Pending claim requests on this profile (the caller is its owner).
    const pendingClaims = await db
      .select({
        id: claimRequests.id,
        requesterName: users.name,
        proofNote: claimRequests.proofNote,
        proofUrl: claimRequests.proofUrl,
        createdAt: claimRequests.createdAt,
      })
      .from(claimRequests)
      .leftJoin(users, eq(users.id, claimRequests.requesterUserId))
      .where(and(eq(claimRequests.profileId, profile.id), eq(claimRequests.status, "pending")))
      .orderBy(desc(claimRequests.createdAt));

    res.json({
      ...profile,
      statusHistory: history,
      claimRequests: pendingClaims,
      warranties: profile.warranties
        .map((w) => ({
          ...w,
          status: warrantyStatus(w.endDate),
          remainingDays: remainingDays(w.endDate),
        }))
        // Coverage timeline: manufacturer → extended → protection plan, then by start date.
        .sort(
          (a, b) =>
            WARRANTY_TYPE_ORDER[a.type] - WARRANTY_TYPE_ORDER[b.type] ||
            (a.startDate ?? "").localeCompare(b.startDate ?? ""),
        ),
      purchase: profile.purchaseRecords[0] ?? null,
      context: ctx ?? null,
      serviceCenterIds: (profile.serviceCenterLinks ?? []).map((l) => l.directoryEntryId),
    });
  }),
);

// ---- CREATE ------------------------------------------------------------------
const createSchema = z.object({
  displayName: z.string().min(1).max(200),
  productModelId: z.string().uuid().nullish(),
  category: z.string().max(120).nullish(),
  brand: z.string().nullish(),
  model: z.string().nullish(),
  serialNumber: z.string().max(191).nullish(),
  manufacturerKey: z.string().max(191).nullish(),
  status: z.enum(profileStatusEnum.enumValues).optional(),
  notes: z.string().nullish(),
  // B2B lens (optional)
  branchId: z.string().uuid().nullish(),
  responsibleUserId: z.string().uuid().nullish(),
  internalReference: z.string().max(120).nullish(),
  // Purchase (owner-private, optional)
  purchaseDate: z.string().nullish(),
  purchasePrice: z.string().nullish(),
  currency: z.string().length(3).optional(),
});

profilesRouter.post(
  "/",
  requirePermission("profile:write"),
  asyncHandler(async (req, res) => {
    const body = parseBody(createSchema, req);
    const partyId = req.partyId!;
    const partyType = await getPartyType(partyId);

    const created = await db.transaction(async (tx) => {
      const [profile] = await tx
        .insert(productProfiles)
        .values({
          pProfileId: generatePProfileId(),
          productModelId: body.productModelId ?? null,
          displayName: body.displayName,
          category: body.category ?? null,
          brand: body.brand ?? null,
          model: body.model ?? null,
          serialNumber: body.serialNumber ?? null,
          manufacturerKey: body.manufacturerKey ?? null,
          status: body.status ?? "active",
          notes: body.notes ?? null,
          createdByPartyId: partyId,
          createdByUserId: req.user!.id,
        })
        .returning();

      const [assoc] = await tx
        .insert(profileAssociations)
        .values({ profileId: profile.id, partyId, relationship: "owner", status: "active" })
        .returning();

      if (isBusiness(partyType)) {
        await tx.insert(businessProfileContext).values({
          associationId: assoc.id,
          partyId,
          profileId: profile.id,
          branchId: body.branchId ?? null,
          responsibleUserId: body.responsibleUserId ?? null,
          internalReference: body.internalReference ?? null,
        });
      }

      if (body.purchaseDate || body.purchasePrice) {
        await tx.insert(purchaseRecords).values({
          partyId,
          profileId: profile.id,
          purchaseDate: body.purchaseDate ?? null,
          total: body.purchasePrice ?? null,
          currency: body.currency ?? "SAR",
        });
      }

      return profile;
    });

    await recordStatusChange({
      partyId,
      profileId: created.id,
      oldStatus: null,
      newStatus: created.status,
      changedByUserId: req.user!.id,
      reason: "created",
    });
    await logActivity({
      partyId,
      actorUserId: req.user!.id,
      entityType: "profile",
      entityId: created.id,
      action: "created",
      summary: `Product profile "${created.displayName}" created (${created.pProfileId})`,
    });
    res.status(201).json(created);
  }),
);

// ---- UPDATE ------------------------------------------------------------------
const patchSchema = createSchema.partial().extend({
  statusReason: z.string().max(300).optional(),
});

profilesRouter.patch(
  "/:id",
  requirePermission("profile:write"),
  asyncHandler(async (req, res) => {
    const partyId = req.partyId!;
    const assoc = await requireOwnerAssociation(partyId, pathParam(req, "id"));
    const body = parseBody(patchSchema, req);

    // Capture the current status so we can record any status change.
    const [current] = await db
      .select({ status: productProfiles.status })
      .from(productProfiles)
      .where(eq(productProfiles.id, pathParam(req, "id")))
      .limit(1);

    const [profile] = await db
      .update(productProfiles)
      .set({
        displayName: body.displayName,
        productModelId: body.productModelId,
        category: body.category,
        brand: body.brand,
        model: body.model,
        serialNumber: body.serialNumber,
        manufacturerKey: body.manufacturerKey,
        status: body.status,
        notes: body.notes,
        updatedAt: new Date(),
      })
      .where(eq(productProfiles.id, pathParam(req, "id")))
      .returning();

    if (body.status && current && body.status !== current.status) {
      await recordStatusChange({
        partyId,
        profileId: profile.id,
        oldStatus: current.status,
        newStatus: profile.status,
        changedByUserId: req.user!.id,
        reason: body.statusReason ?? null,
      });
    }

    // B2B lens updates (only fields provided).
    if (
      body.branchId !== undefined ||
      body.responsibleUserId !== undefined ||
      body.internalReference !== undefined
    ) {
      await db
        .update(businessProfileContext)
        .set({
          branchId: body.branchId,
          responsibleUserId: body.responsibleUserId,
          internalReference: body.internalReference,
          updatedAt: new Date(),
        })
        .where(eq(businessProfileContext.associationId, assoc.id));
    }

    await logActivity({
      partyId,
      actorUserId: req.user!.id,
      entityType: "profile",
      entityId: profile.id,
      action: "updated",
      summary: `Product profile "${profile.displayName}" updated`,
    });
    res.json(profile);
  }),
);

// ---- DELETE ------------------------------------------------------------------
profilesRouter.delete(
  "/:id",
  requirePermission("profile:write"),
  asyncHandler(async (req, res) => {
    const partyId = req.partyId!;
    await requireOwnerAssociation(partyId, pathParam(req, "id"));
    const [row] = await db
      .delete(productProfiles)
      .where(eq(productProfiles.id, pathParam(req, "id")))
      .returning();
    await logActivity({
      partyId,
      actorUserId: req.user!.id,
      entityType: "profile",
      entityId: row.id,
      action: "deleted",
      summary: `Product profile "${row.displayName}" deleted`,
    });
    res.json({ ok: true });
  }),
);

// ---- CLAIM (by P Profile ID) -------------------------------------------------
// Unowned → direct claim (owner association). Owned → pending claim request with
// optional proof (note + file). Resolving a request to transfer ownership is
// Phase 2; owners can reject and requesters can cancel (see /api/claim-requests).
const claimSchema = z.object({
  pProfileId: z.string().min(3).max(32),
  proofNote: z.string().max(1000).optional(),
  proofName: z.string().max(255).optional(),
  proofBase64: z.string().optional(),
});

profilesRouter.post(
  "/claim",
  requirePermission("profile:write"),
  asyncHandler(async (req, res) => {
    const partyId = req.partyId!;
    const body = parseBody(claimSchema, req);

    const [profile] = await db
      .select()
      .from(productProfiles)
      .where(eq(productProfiles.pProfileId, body.pProfileId.toUpperCase()))
      .limit(1);
    if (!profile) throw new ApiError(404, "No product profile with that P Profile ID");

    const existingOwners = await db
      .select({ id: profileAssociations.id })
      .from(profileAssociations)
      .where(
        and(
          eq(profileAssociations.profileId, profile.id),
          eq(profileAssociations.relationship, "owner"),
          eq(profileAssociations.status, "active"),
        ),
      );

    // --- Unowned: direct claim ---
    if (existingOwners.length === 0) {
      await db
        .insert(profileAssociations)
        .values({ profileId: profile.id, partyId, relationship: "owner", status: "active" });
      await logActivity({
        partyId,
        actorUserId: req.user!.id,
        entityType: "profile",
        entityId: profile.id,
        action: "claimed",
        summary: `Claimed product profile ${profile.pProfileId}`,
      });
      res.status(201).json({ claimed: true, profile });
      return;
    }

    // --- Owned: you can't claim your own; otherwise create a pending request ---
    if (existingOwners.length && (await requireOwnerAssociationSafe(partyId, profile.id))) {
      throw new ApiError(409, "You already own this profile");
    }

    const existingPending = await db
      .select({ id: claimRequests.id })
      .from(claimRequests)
      .where(
        and(
          eq(claimRequests.profileId, profile.id),
          eq(claimRequests.requesterPartyId, partyId),
          eq(claimRequests.status, "pending"),
        ),
      );
    if (existingPending.length) {
      throw new ApiError(409, "You already have a pending claim request for this profile");
    }

    // Optional proof file (placeholder upload via the storage adapter).
    let proofStorageKey: string | null = null;
    let proofUrl: string | null = null;
    if (body.proofBase64 && body.proofName) {
      const base64 = body.proofBase64.replace(/^data:[^;]+;base64,/, "");
      const buffer = Buffer.from(base64, "base64");
      if (buffer.length > 25 * 1024 * 1024) throw new ApiError(413, "Proof file exceeds 25MB limit");
      if (buffer.length > 0) {
        const stored = await storage.save(partyId, body.proofName, buffer);
        proofStorageKey = stored.storageKey;
        proofUrl = stored.url;
      }
    }

    const [request] = await db
      .insert(claimRequests)
      .values({
        profileId: profile.id,
        requesterPartyId: partyId,
        requesterUserId: req.user!.id,
        status: "pending",
        proofNote: body.proofNote ?? null,
        proofStorageKey,
        proofUrl,
      })
      .returning();

    await logActivity({
      partyId,
      actorUserId: req.user!.id,
      entityType: "claim_request",
      entityId: request.id,
      action: "created",
      summary: `Claim request submitted for ${profile.pProfileId}`,
    });
    res.status(202).json({ claimed: false, request });
  }),
);

/** Like requireOwnerAssociation but returns boolean instead of throwing. */
async function requireOwnerAssociationSafe(partyId: string, profileId: string): Promise<boolean> {
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

// ---- SERVICE-CENTER LINKS (set the full list) --------------------------------
const linkSchema = z.object({ directoryEntryIds: z.array(z.string().uuid()) });

profilesRouter.put(
  "/:id/service-centers",
  requirePermission("profile:write"),
  asyncHandler(async (req, res) => {
    const partyId = req.partyId!;
    await requireOwnerAssociation(partyId, pathParam(req, "id"));
    const { directoryEntryIds } = parseBody(linkSchema, req);

    await db
      .delete(profileServiceCenters)
      .where(
        and(
          eq(profileServiceCenters.partyId, partyId),
          eq(profileServiceCenters.profileId, pathParam(req, "id")),
        ),
      );
    if (directoryEntryIds.length) {
      // Only link directory entries that belong to this party and are service centers.
      const valid = await db
        .select({ id: directoryEntries.id })
        .from(directoryEntries)
        .where(
          and(
            eq(directoryEntries.ownerPartyId, partyId),
            eq(directoryEntries.kind, "service_center"),
            inArray(directoryEntries.id, directoryEntryIds),
          ),
        );
      if (valid.length) {
        await db.insert(profileServiceCenters).values(
          valid.map((v) => ({
            partyId,
            profileId: pathParam(req, "id"),
            directoryEntryId: v.id,
          })),
        );
      }
    }
    res.json({ ok: true, directoryEntryIds });
  }),
);

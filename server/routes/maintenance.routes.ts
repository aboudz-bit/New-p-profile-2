import { Router } from "express";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db";
import {
  maintenanceRecords,
  productProfiles,
  profileAssociations,
  insertMaintenanceSchema,
} from "@shared/schema";
import { requireAuth, requirePermission } from "../lib/auth";
import { asyncHandler, parseBody, ApiError, pathParam } from "../lib/http";
import { logActivity } from "../lib/activity";
import { recordStatusChange } from "../lib/statusHistory";

export const maintenanceRouter = Router();
maintenanceRouter.use(requireAuth());

async function assertProfileOwned(partyId: string, profileId: string) {
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
  if (!a) throw new ApiError(404, "Product profile not found");
}

/** Service history across the whole party (e.g. for an ops overview). */
maintenanceRouter.get(
  "/",
  requirePermission("maintenance:read"),
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(maintenanceRecords)
      .where(eq(maintenanceRecords.partyId, req.partyId!))
      .orderBy(desc(maintenanceRecords.date));
    res.json(rows);
  }),
);

maintenanceRouter.post(
  "/",
  requirePermission("maintenance:write"),
  asyncHandler(async (req, res) => {
    const data = parseBody(insertMaintenanceSchema, req);
    await assertProfileOwned(req.partyId!, data.profileId);
    const [row] = await db
      .insert(maintenanceRecords)
      .values({ ...data, partyId: req.partyId! })
      .returning();
    // Reflect an open/in-progress record on the product status — but never
    // resurrect a retired/disposed product; only an active product enters service.
    if (row.status !== "completed") {
      const [cur] = await db
        .select({ status: productProfiles.status })
        .from(productProfiles)
        .where(eq(productProfiles.id, row.profileId))
        .limit(1);
      if (cur?.status === "active") {
        await db
          .update(productProfiles)
          .set({ status: "in_service", updatedAt: new Date() })
          .where(eq(productProfiles.id, row.profileId));
        await recordStatusChange({
          partyId: req.partyId!,
          profileId: row.profileId,
          oldStatus: "active",
          newStatus: "in_service",
          changedByUserId: req.user!.id,
          reason: "service opened",
        });
      }
    }
    await logActivity({
      partyId: req.partyId!,
      actorUserId: req.user!.id,
      entityType: "maintenance",
      entityId: row.id,
      action: "created",
      summary: `Service record (${row.type}) logged`,
    });
    res.status(201).json(row);
  }),
);

maintenanceRouter.patch(
  "/:id",
  requirePermission("maintenance:write"),
  asyncHandler(async (req, res) => {
    const data = parseBody(insertMaintenanceSchema.partial().omit({ profileId: true }), req);
    const [row] = await db
      .update(maintenanceRecords)
      .set({ ...data, updatedAt: new Date() })
      .where(
        and(eq(maintenanceRecords.id, pathParam(req, "id")), eq(maintenanceRecords.partyId, req.partyId!)),
      )
      .returning();
    if (!row) throw new ApiError(404, "Service record not found");
    // When completed, return the product to active (only if it was in service).
    if (row.status === "completed") {
      const [cur] = await db
        .select({ status: productProfiles.status })
        .from(productProfiles)
        .where(eq(productProfiles.id, row.profileId))
        .limit(1);
      if (cur?.status === "in_service") {
        await db
          .update(productProfiles)
          .set({ status: "active", updatedAt: new Date() })
          .where(eq(productProfiles.id, row.profileId));
        await recordStatusChange({
          partyId: req.partyId!,
          profileId: row.profileId,
          oldStatus: "in_service",
          newStatus: "active",
          changedByUserId: req.user!.id,
          reason: "service completed",
        });
      }
    }
    await logActivity({
      partyId: req.partyId!,
      actorUserId: req.user!.id,
      entityType: "maintenance",
      entityId: row.id,
      action: "updated",
      summary: `Service status: ${row.status}`,
    });
    res.json(row);
  }),
);

maintenanceRouter.delete(
  "/:id",
  requirePermission("maintenance:write"),
  asyncHandler(async (req, res) => {
    const [row] = await db
      .delete(maintenanceRecords)
      .where(
        and(eq(maintenanceRecords.id, pathParam(req, "id")), eq(maintenanceRecords.partyId, req.partyId!)),
      )
      .returning();
    if (!row) throw new ApiError(404, "Service record not found");
    res.json({ ok: true });
  }),
);

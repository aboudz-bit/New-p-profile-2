import { Router } from "express";
import { and, eq } from "drizzle-orm";
import { db } from "../db";
import { warranties, profileAssociations, insertWarrantySchema } from "@shared/schema";
import { warrantyStatus, remainingDays } from "@shared/warranty";
import { requireAuth, requirePermission } from "../lib/auth";
import { asyncHandler, parseBody, ApiError, pathParam } from "../lib/http";
import { logActivity } from "../lib/activity";

export const warrantiesRouter = Router();
warrantiesRouter.use(requireAuth());

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

function withStatus(w: typeof warranties.$inferSelect) {
  return { ...w, status: warrantyStatus(w.endDate), remainingDays: remainingDays(w.endDate) };
}

warrantiesRouter.post(
  "/",
  requirePermission("warranty:write"),
  asyncHandler(async (req, res) => {
    const data = parseBody(insertWarrantySchema, req);
    await assertProfileOwned(req.partyId!, data.profileId);
    const [row] = await db
      .insert(warranties)
      .values({ ...data, partyId: req.partyId! })
      .returning();
    await logActivity({
      partyId: req.partyId!,
      actorUserId: req.user!.id,
      entityType: "warranty",
      entityId: row.id,
      action: "created",
      summary: `${row.type} warranty added`,
    });
    res.status(201).json(withStatus(row));
  }),
);

warrantiesRouter.patch(
  "/:id",
  requirePermission("warranty:write"),
  asyncHandler(async (req, res) => {
    const data = parseBody(insertWarrantySchema.partial().omit({ profileId: true }), req);
    const [row] = await db
      .update(warranties)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(warranties.id, pathParam(req, "id")), eq(warranties.partyId, req.partyId!)))
      .returning();
    if (!row) throw new ApiError(404, "Warranty not found");
    res.json(withStatus(row));
  }),
);

warrantiesRouter.delete(
  "/:id",
  requirePermission("warranty:write"),
  asyncHandler(async (req, res) => {
    const [row] = await db
      .delete(warranties)
      .where(and(eq(warranties.id, pathParam(req, "id")), eq(warranties.partyId, req.partyId!)))
      .returning();
    if (!row) throw new ApiError(404, "Warranty not found");
    res.json({ ok: true });
  }),
);

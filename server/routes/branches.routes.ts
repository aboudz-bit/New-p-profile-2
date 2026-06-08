import { Router } from "express";
import { and, eq, asc } from "drizzle-orm";
import { db } from "../db";
import { branches, insertBranchSchema } from "@shared/schema";
import { requireAuth, requirePermission } from "../lib/auth";
import { asyncHandler, parseBody, ApiError, pathParam } from "../lib/http";
import { logActivity } from "../lib/activity";

export const branchesRouter = Router();
branchesRouter.use(requireAuth());

branchesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(branches)
      .where(eq(branches.partyId, req.partyId!))
      .orderBy(asc(branches.createdAt));
    res.json(rows);
  }),
);

branchesRouter.post(
  "/",
  requirePermission("branch:manage"),
  asyncHandler(async (req, res) => {
    const data = parseBody(insertBranchSchema, req);
    const [row] = await db
      .insert(branches)
      .values({ ...data, partyId: req.partyId! })
      .returning();
    await logActivity({
      partyId: req.partyId!,
      actorUserId: req.user!.id,
      entityType: "branch",
      entityId: row.id,
      action: "created",
      summary: `Branch "${row.name}" added`,
    });
    res.status(201).json(row);
  }),
);

branchesRouter.patch(
  "/:id",
  requirePermission("branch:manage"),
  asyncHandler(async (req, res) => {
    const data = parseBody(insertBranchSchema.partial(), req);
    const [row] = await db
      .update(branches)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(branches.id, pathParam(req, "id")), eq(branches.partyId, req.partyId!)))
      .returning();
    if (!row) throw new ApiError(404, "Branch not found");
    res.json(row);
  }),
);

branchesRouter.delete(
  "/:id",
  requirePermission("branch:manage"),
  asyncHandler(async (req, res) => {
    const [row] = await db
      .delete(branches)
      .where(and(eq(branches.id, pathParam(req, "id")), eq(branches.partyId, req.partyId!)))
      .returning();
    if (!row) throw new ApiError(404, "Branch not found");
    res.json({ ok: true });
  }),
);

/**
 * Product Models — the catalog layer. Phase 1: manual entry, scoped per party
 * (privacy-safe). A profile may link to a model via `productModelId`; free-text
 * brand/model on the profile remains a fallback. Manufacturer-owned/verified
 * catalogs are Phase 2.
 */
import { Router } from "express";
import { z } from "zod";
import { and, eq, asc, ilike } from "drizzle-orm";
import { db } from "../db";
import { productModels } from "@shared/schema";
import { requireAuth, requirePermission } from "../lib/auth";
import { asyncHandler, parseBody } from "../lib/http";
import { logActivity } from "../lib/activity";

export const modelsRouter = Router();
modelsRouter.use(requireAuth());

modelsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const q = z.string().max(200).optional().parse(req.query.q);
    const conds = [eq(productModels.createdByPartyId, req.partyId!)];
    if (q) conds.push(ilike(productModels.name, `%${q}%`));
    const rows = await db
      .select()
      .from(productModels)
      .where(and(...conds))
      .orderBy(asc(productModels.name));
    res.json(rows);
  }),
);

const createSchema = z.object({
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  category: z.string().max(120).optional(),
  brand: z.string().optional(),
  manufacturerKey: z.string().max(191).optional(),
});

modelsRouter.post(
  "/",
  requirePermission("profile:write"),
  asyncHandler(async (req, res) => {
    const body = parseBody(createSchema, req);
    const [row] = await db
      .insert(productModels)
      .values({
        name: body.name,
        nameAr: body.nameAr,
        category: body.category,
        brand: body.brand,
        manufacturerKey: body.manufacturerKey,
        source: "manual",
        createdByPartyId: req.partyId!,
      })
      .returning();
    await logActivity({
      partyId: req.partyId!,
      actorUserId: req.user!.id,
      entityType: "product_model",
      entityId: row.id,
      action: "created",
      summary: `Product model "${row.name}" added to catalog`,
    });
    res.status(201).json(row);
  }),
);

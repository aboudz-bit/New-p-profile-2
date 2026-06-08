/**
 * Public QR scan resolution (UNAUTHENTICATED).
 *
 * Resolves a P Profile ID to a SAFE public preview only — product identity and
 * registration/verification status. NEVER owner identity, purchase price,
 * invoices, documents, warranties, service history, or any private module.
 * (A permissioned full lens for authenticated viewers is a Phase 2 addition.)
 */
import { Router } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { productProfiles, productModels } from "@shared/schema";
import { asyncHandler, ApiError, pathParam } from "../lib/http";
import { isValidPProfileId } from "../lib/identity";

export const publicRouter = Router();

publicRouter.get(
  "/profiles/:pProfileId",
  asyncHandler(async (req, res) => {
    const pProfileId = pathParam(req, "pProfileId").toUpperCase();
    if (!isValidPProfileId(pProfileId)) throw new ApiError(404, "Not found");

    const [profile] = await db
      .select({
        pProfileId: productProfiles.pProfileId,
        displayName: productProfiles.displayName,
        category: productProfiles.category,
        brand: productProfiles.brand,
        model: productProfiles.model,
        status: productProfiles.status,
        hasSerial: productProfiles.serialNumber,
        modelName: productModels.name,
        registeredAt: productProfiles.createdAt,
      })
      .from(productProfiles)
      .leftJoin(productModels, eq(productModels.id, productProfiles.productModelId))
      .where(eq(productProfiles.pProfileId, pProfileId))
      .limit(1);

    if (!profile) throw new ApiError(404, "Not found");

    // Safe public projection only.
    res.json({
      pProfileId: profile.pProfileId,
      productName: profile.displayName,
      category: profile.category,
      brand: profile.brand,
      model: profile.model ?? profile.modelName ?? null,
      status: profile.status,
      registered: true,
      serialVerified: !!profile.hasSerial,
      registeredAt: profile.registeredAt,
    });
  }),
);

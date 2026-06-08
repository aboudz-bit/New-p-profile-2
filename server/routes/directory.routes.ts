/**
 * Directory entries — manufacturers, service centers, warranty providers.
 *
 * Phase 1: these are per-party reference data (no logins/portals). Service
 * centers carry an `authorizationSource` (platform_listed / business_designated /
 * self_declared — NEVER manufacturer_verified in Phase 1) and supported brands.
 */
import { Router } from "express";
import { z } from "zod";
import { and, eq, asc } from "drizzle-orm";
import { db } from "../db";
import { directoryEntries, directoryKindEnum } from "@shared/schema";
import { requireAuth, requirePermission } from "../lib/auth";
import { asyncHandler, parseBody, ApiError, pathParam } from "../lib/http";
import { logActivity } from "../lib/activity";

export const directoryRouter = Router();
directoryRouter.use(requireAuth());

// Phase 1 authorization sources only (manufacturer_verified is reserved for Phase 2).
const PHASE1_SOURCES = ["platform_listed", "business_designated", "self_declared"] as const;

directoryRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const kind = z.enum(directoryKindEnum.enumValues).optional().parse(req.query.kind);
    const conds = [eq(directoryEntries.ownerPartyId, req.partyId!)];
    if (kind) conds.push(eq(directoryEntries.kind, kind));
    const rows = await db
      .select()
      .from(directoryEntries)
      .where(and(...conds))
      .orderBy(asc(directoryEntries.name));
    res.json(rows);
  }),
);

const createSchema = z.object({
  kind: z.enum(directoryKindEnum.enumValues),
  name: z.string().min(1).max(200),
  nameAr: z.string().max(200).optional(),
  contactInfo: z.string().optional(),
  location: z.string().optional(),
  website: z.string().optional(),
  authorizationSource: z.enum(PHASE1_SOURCES).optional(),
  supportedBrands: z.array(z.string()).optional(),
});

directoryRouter.post(
  "/",
  requirePermission("directory:write"),
  asyncHandler(async (req, res) => {
    const body = parseBody(createSchema, req);
    // Guard: authorizationSource only meaningful for service centers.
    const authorizationSource =
      body.kind === "service_center" ? (body.authorizationSource ?? "self_declared") : null;
    const [row] = await db
      .insert(directoryEntries)
      .values({
        ownerPartyId: req.partyId!,
        kind: body.kind,
        name: body.name,
        nameAr: body.nameAr,
        contactInfo: body.contactInfo,
        location: body.location,
        website: body.website,
        authorizationSource,
        supportedBrands: body.supportedBrands ?? null,
      })
      .returning();
    await logActivity({
      partyId: req.partyId!,
      actorUserId: req.user!.id,
      entityType: "directory",
      entityId: row.id,
      action: "created",
      summary: `${row.kind} "${row.name}" added to directory`,
    });
    res.status(201).json(row);
  }),
);

const updateSchema = createSchema.partial().omit({ kind: true });

directoryRouter.patch(
  "/:id",
  requirePermission("directory:write"),
  asyncHandler(async (req, res) => {
    const body = parseBody(updateSchema, req);
    const [row] = await db
      .update(directoryEntries)
      .set({
        name: body.name,
        nameAr: body.nameAr,
        contactInfo: body.contactInfo,
        location: body.location,
        website: body.website,
        authorizationSource: body.authorizationSource,
        supportedBrands: body.supportedBrands,
        updatedAt: new Date(),
      })
      .where(
        and(eq(directoryEntries.id, pathParam(req, "id")), eq(directoryEntries.ownerPartyId, req.partyId!)),
      )
      .returning();
    if (!row) throw new ApiError(404, "Directory entry not found");
    res.json(row);
  }),
);

directoryRouter.delete(
  "/:id",
  requirePermission("directory:write"),
  asyncHandler(async (req, res) => {
    const [row] = await db
      .delete(directoryEntries)
      .where(
        and(eq(directoryEntries.id, pathParam(req, "id")), eq(directoryEntries.ownerPartyId, req.partyId!)),
      )
      .returning();
    if (!row) throw new ApiError(404, "Directory entry not found");
    res.json({ ok: true });
  }),
);

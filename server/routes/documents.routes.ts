import { Router } from "express";
import { z } from "zod";
import { and, eq, desc } from "drizzle-orm";
import { db } from "../db";
import { profileAssociations, documents, documentTypeEnum } from "@shared/schema";
import { requireAuth, requirePermission } from "../lib/auth";
import { asyncHandler, parseBody, ApiError, pathParam } from "../lib/http";
import { storage } from "../lib/storage";
import { logActivity } from "../lib/activity";

export const documentsRouter = Router();
documentsRouter.use(requireAuth());

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

documentsRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const profileId = z.string().uuid().optional().parse(req.query.profileId);
    const conds = [eq(documents.partyId, req.partyId!)];
    if (profileId) conds.push(eq(documents.profileId, profileId));
    const rows = await db
      .select()
      .from(documents)
      .where(and(...conds))
      .orderBy(desc(documents.createdAt));
    res.json(rows);
  }),
);

const uploadSchema = z.object({
  name: z.string().min(1).max(255),
  type: z.enum(documentTypeEnum.enumValues).default("other"),
  profileId: z.string().uuid().optional(),
  maintenanceRecordId: z.string().uuid().optional(),
  mimeType: z.string().max(128).optional(),
  // base64-encoded file contents (data URL prefix tolerated)
  contentBase64: z.string().min(1),
});

documentsRouter.post(
  "/",
  requirePermission("document:write"),
  asyncHandler(async (req, res) => {
    const body = parseBody(uploadSchema, req);
    if (body.profileId) await assertProfileOwned(req.partyId!, body.profileId);

    const base64 = body.contentBase64.replace(/^data:[^;]+;base64,/, "");
    const buffer = Buffer.from(base64, "base64");
    if (buffer.length === 0) throw new ApiError(422, "Empty file");
    if (buffer.length > 25 * 1024 * 1024) throw new ApiError(413, "File exceeds 25MB limit");

    const stored = await storage.save(req.partyId!, body.name, buffer);

    const [row] = await db
      .insert(documents)
      .values({
        partyId: req.partyId!,
        profileId: body.profileId ?? null,
        maintenanceRecordId: body.maintenanceRecordId ?? null,
        type: body.type,
        name: body.name,
        storageKey: stored.storageKey,
        url: stored.url,
        mimeType: body.mimeType,
        sizeBytes: stored.sizeBytes,
        uploadedByUserId: req.user!.id,
      })
      .returning();

    await logActivity({
      partyId: req.partyId!,
      actorUserId: req.user!.id,
      entityType: "document",
      entityId: row.id,
      action: "created",
      summary: `Document "${row.name}" uploaded`,
    });
    res.status(201).json(row);
  }),
);

documentsRouter.delete(
  "/:id",
  requirePermission("document:write"),
  asyncHandler(async (req, res) => {
    const [row] = await db
      .delete(documents)
      .where(and(eq(documents.id, pathParam(req, "id")), eq(documents.partyId, req.partyId!)))
      .returning();
    if (!row) throw new ApiError(404, "Document not found");
    res.json({ ok: true });
  }),
);

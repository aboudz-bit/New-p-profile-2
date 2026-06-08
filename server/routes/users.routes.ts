import { Router } from "express";
import { z } from "zod";
import { and, eq, asc } from "drizzle-orm";
import { db } from "../db";
import { users, userRoleEnum, userStatusEnum } from "@shared/schema";
import { hashPassword, requireAuth, requirePermission } from "../lib/auth";
import { asyncHandler, parseBody, ApiError, pathParam } from "../lib/http";
import { logActivity } from "../lib/activity";

export const usersRouter = Router();
usersRouter.use(requireAuth());

function publicUser(u: typeof users.$inferSelect) {
  const { passwordHash: _drop, ...rest } = u;
  return rest;
}

usersRouter.get(
  "/",
  requirePermission("user:manage"),
  asyncHandler(async (req, res) => {
    const rows = await db
      .select()
      .from(users)
      .where(eq(users.partyId, req.partyId!))
      .orderBy(asc(users.createdAt));
    res.json(rows.map(publicUser));
  }),
);

/** Minimal user list for assignment selectors (e.g. responsible user).
 *  Available to any authenticated party member — no user:manage required. */
usersRouter.get(
  "/assignable",
  asyncHandler(async (req, res) => {
    const rows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(and(eq(users.partyId, req.partyId!), eq(users.status, "active")))
      .orderBy(asc(users.name));
    res.json(rows);
  }),
);

const createSchema = z.object({
  name: z.string().min(2).max(160),
  email: z.string().email().max(255),
  password: z.string().min(8).max(200),
  role: z.enum(userRoleEnum.enumValues),
  branchId: z.string().uuid().optional(),
  locale: z.enum(["ar", "en"]).default("ar"),
});

usersRouter.post(
  "/",
  requirePermission("user:manage"),
  asyncHandler(async (req, res) => {
    const body = parseBody(createSchema, req);
    if (body.role === "owner" && req.user!.role !== "owner") {
      throw new ApiError(403, "Only an owner can create another owner");
    }
    const [row] = await db
      .insert(users)
      .values({
        partyId: req.partyId!,
        branchId: body.branchId ?? null,
        name: body.name,
        email: body.email.toLowerCase(),
        passwordHash: hashPassword(body.password),
        role: body.role,
        status: "active",
        locale: body.locale,
      })
      .returning()
      .catch(() => {
        throw new ApiError(409, "A user with this email already exists in this account");
      });
    await logActivity({
      partyId: req.partyId!,
      actorUserId: req.user!.id,
      entityType: "user",
      entityId: row.id,
      action: "created",
      summary: `User "${row.name}" added as ${row.role}`,
    });
    res.status(201).json(publicUser(row));
  }),
);

const updateSchema = z.object({
  name: z.string().min(2).max(160).optional(),
  role: z.enum(userRoleEnum.enumValues).optional(),
  status: z.enum(userStatusEnum.enumValues).optional(),
  branchId: z.string().uuid().nullable().optional(),
  password: z.string().min(8).max(200).optional(),
});

usersRouter.patch(
  "/:id",
  requirePermission("user:manage"),
  asyncHandler(async (req, res) => {
    const body = parseBody(updateSchema, req);
    if (body.role === "owner" && req.user!.role !== "owner") {
      throw new ApiError(403, "Only an owner can promote to owner");
    }
    const patch: Partial<typeof users.$inferInsert> = {
      name: body.name,
      role: body.role,
      status: body.status,
      branchId: body.branchId,
      updatedAt: new Date(),
    };
    if (body.password) patch.passwordHash = hashPassword(body.password);

    const [row] = await db
      .update(users)
      .set(patch)
      .where(and(eq(users.id, pathParam(req, "id")), eq(users.partyId, req.partyId!)))
      .returning();
    if (!row) throw new ApiError(404, "User not found");
    res.json(publicUser(row));
  }),
);

import { Router } from "express";
import { z } from "zod";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { parties, branches, users, type User, type PartyType } from "@shared/schema";
import { permissionsFor } from "@shared/permissions";
import {
  hashPassword,
  verifyPassword,
  setAuthCookie,
  clearAuthCookie,
  requireAuth,
} from "../lib/auth";
import { asyncHandler, parseBody, ApiError } from "../lib/http";
import { logActivity } from "../lib/activity";

export const authRouter = Router();

/**
 * Single registration entry point with an account-type toggle:
 *   - "business" → Party(business) + primary branch + owner user
 *   - "personal" → Party(consumer) + owner user (no branches)
 */
const registerSchema = z
  .object({
    accountType: z.enum(["business", "personal"]).default("personal"),
    companyName: z.string().min(2).max(160).optional(),
    name: z.string().min(2).max(160),
    email: z.string().email().max(255),
    password: z.string().min(8).max(200),
    locale: z.enum(["ar", "en"]).default("ar"),
  })
  .refine((d) => d.accountType !== "business" || !!d.companyName, {
    message: "companyName is required for a business account",
    path: ["companyName"],
  });

function publicUser(u: User, partyType: PartyType) {
  return {
    id: u.id,
    partyId: u.partyId,
    partyType,
    branchId: u.branchId,
    name: u.name,
    email: u.email,
    role: u.role,
    status: u.status,
    locale: u.locale,
    permissions: permissionsFor(u.role),
  };
}

authRouter.post(
  "/register",
  asyncHandler(async (req, res) => {
    const body = parseBody(registerSchema, req);
    const partyType: PartyType = body.accountType === "business" ? "business" : "consumer";

    const created = await db.transaction(async (tx) => {
      const [party] = await tx
        .insert(parties)
        .values({
          type: partyType,
          name: body.accountType === "business" ? body.companyName! : body.name,
        })
        .returning();

      let branchId: string | null = null;
      if (partyType === "business") {
        const [branch] = await tx
          .insert(branches)
          .values({
            partyId: party.id,
            name: "Main Branch",
            nameAr: "الفرع الرئيسي",
            isPrimary: true,
          })
          .returning();
        branchId = branch.id;
      }

      const [user] = await tx
        .insert(users)
        .values({
          partyId: party.id,
          branchId,
          name: body.name,
          email: body.email.toLowerCase(),
          passwordHash: hashPassword(body.password),
          role: "owner",
          status: "active",
          locale: body.locale,
        })
        .returning();

      return { party, user };
    });

    await logActivity({
      partyId: created.party.id,
      actorUserId: created.user.id,
      entityType: "party",
      entityId: created.party.id,
      action: "created",
      summary: `${partyType === "business" ? "Business" : "Personal"} account "${created.party.name}" registered`,
    });

    setAuthCookie(res, created.user.id);
    res.status(201).json({ user: publicUser(created.user, partyType) });
  }),
);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

async function partyTypeOf(partyId: string | null): Promise<PartyType> {
  if (!partyId) return "platform";
  const [p] = await db
    .select({ type: parties.type })
    .from(parties)
    .where(eq(parties.id, partyId))
    .limit(1);
  return (p?.type ?? "consumer") as PartyType;
}

authRouter.post(
  "/login",
  asyncHandler(async (req, res) => {
    const body = parseBody(loginSchema, req);
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, body.email.toLowerCase()))
      .limit(1);

    if (!user || !verifyPassword(body.password, user.passwordHash)) {
      throw new ApiError(401, "Invalid email or password");
    }
    if (user.status === "suspended") throw new ApiError(403, "Account suspended");

    setAuthCookie(res, user.id);
    res.json({ user: publicUser(user, await partyTypeOf(user.partyId)) });
  }),
);

authRouter.post("/logout", (_req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

authRouter.get(
  "/me",
  requireAuth(),
  asyncHandler(async (req, res) => {
    res.json({ user: publicUser(req.user!, await partyTypeOf(req.user!.partyId)) });
  }),
);

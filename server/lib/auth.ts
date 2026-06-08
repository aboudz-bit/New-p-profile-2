/**
 * Authentication & authorization.
 * - Passwords: scrypt with a per-user random salt, constant-time compare.
 * - Session: stateless HMAC-signed token in an httpOnly cookie (no SMS/OTP).
 * - RBAC: requirePermission() enforces the shared permission matrix.
 */
import {
  scryptSync,
  randomBytes,
  timingSafeEqual,
  createHmac,
} from "node:crypto";
import type { Request, Response, NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { users, type User } from "@shared/schema";
import { can, type Permission } from "@shared/permissions";
import { SESSION_SECRET, AUTH_COOKIE, SESSION_TTL_DAYS, IS_PROD } from "./env";
import { ApiError } from "./http";

/* ---------- password hashing ---------- */

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const derived = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, derivedHex] = stored.split(":");
  if (!salt || !derivedHex) return false;
  const derived = scryptSync(password, salt, 64);
  const expected = Buffer.from(derivedHex, "hex");
  return derived.length === expected.length && timingSafeEqual(derived, expected);
}

/* ---------- stateless signed token ---------- */

function sign(data: string): string {
  return createHmac("sha256", SESSION_SECRET).update(data).digest("base64url");
}

export function issueToken(userId: string): string {
  const payload = Buffer.from(
    JSON.stringify({ uid: userId, iat: Date.now() }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function verifyToken(token: string): string | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const { uid, iat } = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (typeof uid !== "string" || typeof iat !== "number") return null;
    if (Date.now() - iat > SESSION_TTL_DAYS * 86_400_000) return null;
    return uid;
  } catch {
    return null;
  }
}

export function setAuthCookie(res: Response, userId: string): void {
  res.cookie(AUTH_COOKIE, issueToken(userId), {
    httpOnly: true,
    sameSite: "lax",
    secure: IS_PROD,
    maxAge: SESSION_TTL_DAYS * 86_400_000,
    path: "/",
  });
}

export function clearAuthCookie(res: Response): void {
  res.clearCookie(AUTH_COOKIE, { path: "/" });
}

/* ---------- request augmentation ---------- */

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: User;
      /** Acting party (actor) key for every scoped query. Present after requireAuth. */
      partyId?: string;
    }
  }
}

async function loadUserFromRequest(req: Request): Promise<User | null> {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return null;
  const uid = verifyToken(token);
  if (!uid) return null;
  const [user] = await db.select().from(users).where(eq(users.id, uid)).limit(1);
  return user ?? null;
}

/** Gate: must be authenticated and active; populates req.user + req.partyId. */
export function requireAuth() {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const user = await loadUserFromRequest(req);
    if (!user) return next(new ApiError(401, "Authentication required"));
    if (user.status === "suspended") return next(new ApiError(403, "Account suspended"));
    if (!user.partyId) return next(new ApiError(403, "User has no party"));
    req.user = user;
    req.partyId = user.partyId;
    next();
  };
}

/** Gate: must hold the given permission (per shared RBAC matrix). */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new ApiError(401, "Authentication required"));
    if (!can(req.user.role, permission)) {
      return next(new ApiError(403, "Insufficient permissions"));
    }
    next();
  };
}

/**
 * RBAC permission matrix — single source of truth shared by client & server.
 * This is the **intra-actor** layer (roles inside a business party). The server
 * ENFORCES these (server/lib/auth.ts); the client uses them only to hide/disable
 * controls. Never trust the client.
 *
 * The cross-actor layer (per-profile association scope, share grants) is enforced
 * separately at the profile/module level — see docs/PRODUCT_PROFILE_DESIGN.md §7.
 */
import type { UserRole } from "./schema";

export type Permission =
  | "org:manage"
  | "branch:manage"
  | "user:manage"
  | "profile:read"
  | "profile:write"
  | "warranty:write"
  | "maintenance:read"
  | "maintenance:write"
  | "directory:write"
  | "document:write";

const ALL: Permission[] = [
  "org:manage",
  "branch:manage",
  "user:manage",
  "profile:read",
  "profile:write",
  "warranty:write",
  "maintenance:read",
  "maintenance:write",
  "directory:write",
  "document:write",
];

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  owner: ALL,
  admin: ALL.filter((p) => p !== "org:manage"),
  manager: [
    "profile:read",
    "profile:write",
    "warranty:write",
    "maintenance:read",
    "maintenance:write",
    "directory:write",
    "document:write",
  ],
  technician: ["profile:read", "maintenance:read", "maintenance:write", "document:write"],
  viewer: ["profile:read", "maintenance:read"],
};

export function can(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function permissionsFor(role: UserRole): Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

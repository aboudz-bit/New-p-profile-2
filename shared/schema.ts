/**
 * P Profile — database schema (single source of truth)
 * ------------------------------------------------------
 * P Profile is a **Product Identity Platform**. The central object is the
 * **Product Profile** (`product_profiles`) — the permanent digital identity of a
 * single physical unit, anchored by a permanent `pProfileId` (+ QR). It is NOT an
 * "asset": "Asset" survives only as an optional business-facing display label.
 *
 * Architecture (see docs/PRODUCT_PROFILE_DESIGN.md — the source of truth):
 *   - The profile is NOT tenant-owned. Actors (`parties`) attach to it through
 *     permissioned, time-bounded `profile_associations` (owner / servicer / ...).
 *   - Modules (warranties, maintenance/service history, purchase, documents) hang
 *     off `profileId` and carry the owning/authoring `partyId` (provenance + the
 *     fast Phase-1 scoping key) and a `visibility` (private by default).
 *   - The B2B lens (branch, responsible user, internal reference) lives on the
 *     business owner association via `business_profile_context`, NOT on the global
 *     profile.
 *
 * Phase 1 scope: consumer + business parties (with logins); manufacturers /
 * service centers / warranty providers exist as `directory_entries` (no portals).
 * Deferred to Phase 2: actor portals, marketplaces, reminders, share_grants,
 * claim approval workflow, ownership_events/status_history tables, billing.
 */
import { sql } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  uuid,
  text,
  varchar,
  date,
  timestamp,
  numeric,
  integer,
  jsonb,
  boolean,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";

/* ============================================================================
 * ENUMS
 * ==========================================================================*/

/** Every actor is a Party. Phase 1 logins: consumer, business, platform.
 *  manufacturer / service_center / warranty_provider get portals in Phase 2 —
 *  in Phase 1 they exist as `directory_entries`. */
export const partyTypeEnum = pgEnum("party_type", [
  "consumer",
  "business",
  "manufacturer",
  "service_center",
  "warranty_provider",
  "platform",
]);

/** Intra-actor RBAC roles (used inside a business party). */
export const userRoleEnum = pgEnum("user_role", [
  "owner", // party creator — full control incl. org/billing settings
  "admin", // manage everything within the party
  "manager", // manage profiles/maintenance within assigned branch(es)
  "technician", // create/update service history
  "viewer", // read-only
]);

export const userStatusEnum = pgEnum("user_status", ["active", "invited", "suspended"]);

/** Product status across its lifecycle. */
export const profileStatusEnum = pgEnum("profile_status", [
  "active",
  "in_service",
  "retired",
  "disposed",
]);

export const warrantyTypeEnum = pgEnum("warranty_type", [
  "manufacturer",
  "extended",
  "protection_plan",
]);

export const maintenanceStatusEnum = pgEnum("maintenance_status", [
  "open",
  "in_progress",
  "completed",
]);

export const maintenanceTypeEnum = pgEnum("maintenance_type", [
  "repair",
  "service",
  "inspection",
  "part_replacement",
  "other",
]);

export const documentTypeEnum = pgEnum("document_type", [
  "invoice",
  "warranty_certificate",
  "service_report",
  "other",
]);

/** How a Party relates to a Product Profile. */
export const associationRelationshipEnum = pgEnum("association_relationship", [
  "owner",
  "prior_owner",
  "manufacturer",
  "servicer",
  "warranty_provider",
  "viewer",
]);

export const associationStatusEnum = pgEnum("association_status", [
  "pending",
  "active",
  "revoked",
]);

/** Directory entry kinds (Phase 1 actors without logins). */
export const directoryKindEnum = pgEnum("directory_kind", [
  "manufacturer",
  "service_center",
  "warranty_provider",
]);

/** What "authorized" means for a service center. `manufacturer_verified` is
 *  reserved for Phase 2 (must never be claimed until a manufacturer is onboarded). */
export const authorizationSourceEnum = pgEnum("authorization_source", [
  "platform_listed",
  "business_designated",
  "self_declared",
  "manufacturer_verified", // Phase 2 only — reserved
]);

/** Module-level visibility. Private by default; sharing is explicit. */
export const visibilityEnum = pgEnum("visibility", ["private", "shared"]);

/** Claim request lifecycle (claiming an already-owned profile). Resolution that
 *  transfers ownership is Phase 2; Phase 1 captures intent + proof and allows
 *  reject/cancel. */
export const claimStatusEnum = pgEnum("claim_status", [
  "pending",
  "approved",
  "rejected",
  "cancelled",
]);

/* ============================================================================
 * SHARED COLUMN HELPERS
 * ==========================================================================*/

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const timestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

/* ============================================================================
 * PARTIES (actors) + BRANCHES + USERS
 * ==========================================================================*/

export const parties = pgTable("parties", {
  id: id(),
  type: partyTypeEnum("type").notNull().default("business"),
  name: text("name").notNull(),
  nameAr: text("name_ar"),
  taxNumber: varchar("tax_number", { length: 64 }),
  defaultCurrency: varchar("default_currency", { length: 3 }).notNull().default("SAR"),
  // Coarse plan marker so subscription/billing can attach later (Phase 2).
  plan: varchar("plan", { length: 32 }).notNull().default("free"),
  ...timestamps(),
});

export const branches = pgTable(
  "branches",
  {
    id: id(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    nameAr: text("name_ar"),
    location: text("location"),
    phone: varchar("phone", { length: 32 }),
    isPrimary: boolean("is_primary").notNull().default(false),
    ...timestamps(),
  },
  (t) => [index("branches_party_idx").on(t.partyId)],
);

export const users = pgTable(
  "users",
  {
    id: id(),
    // Nullable partyId reserved for a future platform super-admin (no actor).
    partyId: uuid("party_id").references(() => parties.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    email: varchar("email", { length: 255 }).notNull(),
    name: text("name").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: userRoleEnum("role").notNull().default("viewer"),
    status: userStatusEnum("status").notNull().default("active"),
    locale: varchar("locale", { length: 5 }).notNull().default("ar"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("users_party_email_idx").on(t.partyId, t.email),
    index("users_party_idx").on(t.partyId),
  ],
);

/* ============================================================================
 * PRODUCT MODEL (catalog) + PRODUCT PROFILE (the central object)
 * ==========================================================================*/

export const productModels = pgTable(
  "product_models",
  {
    id: id(),
    name: text("name").notNull(),
    nameAr: text("name_ar"),
    category: varchar("category", { length: 120 }),
    brand: text("brand"),
    // Normalized brand key (secondary verification anchor alongside serial).
    manufacturerKey: varchar("manufacturer_key", { length: 191 }),
    specs: jsonb("specs"),
    // platform | ocr | manual | manufacturer (Phase 1: platform/manual; OCR fast-follow)
    source: varchar("source", { length: 24 }).notNull().default("manual"),
    createdByPartyId: uuid("created_by_party_id").references(() => parties.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [index("product_models_category_idx").on(t.category)],
);

export const productProfiles = pgTable(
  "product_profiles",
  {
    id: id(),
    // PRIMARY permanent platform identity (always minted). Backs the QR.
    pProfileId: varchar("p_profile_id", { length: 32 }).notNull(),
    productModelId: uuid("product_model_id").references(() => productModels.id, {
      onDelete: "set null",
    }),
    displayName: text("display_name").notNull(),
    category: varchar("category", { length: 120 }),
    brand: text("brand"),
    model: text("model"),
    // SECONDARY verification / dedup attributes — never required.
    serialNumber: varchar("serial_number", { length: 191 }),
    manufacturerKey: varchar("manufacturer_key", { length: 191 }),
    status: profileStatusEnum("status").notNull().default("active"),
    notes: text("notes"),
    createdByPartyId: uuid("created_by_party_id").references(() => parties.id, {
      onDelete: "set null",
    }),
    createdByUserId: uuid("created_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("product_profiles_ppid_idx").on(t.pProfileId),
    index("product_profiles_serial_idx").on(t.serialNumber),
    // Secondary dedup hint (soft) — app-level logic, not a hard constraint.
    index("product_profiles_anchor_idx").on(t.manufacturerKey, t.serialNumber),
  ],
);

/* ============================================================================
 * PROFILE ASSOCIATIONS (the cross-actor link — "one record, many roles")
 * ==========================================================================*/

export const profileAssociations = pgTable(
  "profile_associations",
  {
    id: id(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => productProfiles.id, { onDelete: "cascade" }),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    relationship: associationRelationshipEnum("relationship").notNull(),
    status: associationStatusEnum("status").notNull().default("active"),
    validFrom: timestamp("valid_from", { withTimezone: true }).notNull().defaultNow(),
    validTo: timestamp("valid_to", { withTimezone: true }),
    // Module/field scope this party may read/write on this profile (Phase 2 grows this).
    scope: jsonb("scope"),
    ...timestamps(),
  },
  (t) => [
    index("assoc_profile_idx").on(t.profileId),
    index("assoc_party_idx").on(t.partyId, t.relationship, t.status),
  ],
);

/** B2B lens data — belongs to the business owner association, not the profile. */
export const businessProfileContext = pgTable(
  "business_profile_context",
  {
    id: id(),
    associationId: uuid("association_id")
      .notNull()
      .references(() => profileAssociations.id, { onDelete: "cascade" }),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => productProfiles.id, { onDelete: "cascade" }),
    branchId: uuid("branch_id").references(() => branches.id, { onDelete: "set null" }),
    responsibleUserId: uuid("responsible_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    // The business's own label for the unit (may be surfaced as "Asset No.").
    internalReference: varchar("internal_reference", { length: 120 }),
    internalNotes: text("internal_notes"),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("bpc_association_idx").on(t.associationId),
    index("bpc_party_idx").on(t.partyId),
    index("bpc_profile_idx").on(t.profileId),
  ],
);

/* ============================================================================
 * DIRECTORY (manufacturers / service centers / warranty providers — no logins)
 * ==========================================================================*/

export const directoryEntries = pgTable(
  "directory_entries",
  {
    id: id(),
    // Phase 1 directories are per-party reference data (like the old per-tenant rows).
    ownerPartyId: uuid("owner_party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    kind: directoryKindEnum("kind").notNull(),
    name: text("name").notNull(),
    nameAr: text("name_ar"),
    contactInfo: text("contact_info"),
    location: text("location"),
    website: text("website"),
    // Service-center only: what "authorized" means in Phase 1.
    authorizationSource: authorizationSourceEnum("authorization_source"),
    // Service-center only: supported brand names (Phase 1 keeps this denormalized).
    supportedBrands: jsonb("supported_brands"),
    // Set when a real Party claims this directory entry (Phase 2).
    claimedByPartyId: uuid("claimed_by_party_id").references(() => parties.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [index("directory_owner_kind_idx").on(t.ownerPartyId, t.kind)],
);

/** Profile ↔ service-center (directory) link (an item may use several centers). */
export const profileServiceCenters = pgTable(
  "profile_service_centers",
  {
    id: id(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => productProfiles.id, { onDelete: "cascade" }),
    directoryEntryId: uuid("directory_entry_id")
      .notNull()
      .references(() => directoryEntries.id, { onDelete: "cascade" }),
    ...timestamps(),
  },
  (t) => [
    uniqueIndex("psc_unique_idx").on(t.profileId, t.directoryEntryId),
    index("psc_party_idx").on(t.partyId),
  ],
);

/* ============================================================================
 * MODULES (attach to a profile; carry owning partyId + visibility)
 * ==========================================================================*/

export const warranties = pgTable(
  "warranties",
  {
    id: id(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => productProfiles.id, { onDelete: "cascade" }),
    type: warrantyTypeEnum("type").notNull(),
    // Provider captured as data in Phase 1 (no provider login/portal yet).
    providerName: text("provider_name"),
    providerType: varchar("provider_type", { length: 48 }),
    providerContact: text("provider_contact"),
    startDate: date("start_date"),
    endDate: date("end_date"),
    coverageSummary: text("coverage_summary"),
    // Coverage chaining: an extension/protection plan continues a prior coverage.
    supersedesId: uuid("supersedes_id"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    // Future-access readiness: marked shareable with the provider/manufacturer.
    shareableWithProvider: boolean("shareable_with_provider").notNull().default(false),
    // status & remainingDays are DERIVED at read time from endDate — never stored.
    ...timestamps(),
  },
  (t) => [
    index("warranties_party_idx").on(t.partyId),
    index("warranties_profile_idx").on(t.profileId),
    index("warranties_end_idx").on(t.partyId, t.endDate),
  ],
);

export const maintenanceRecords = pgTable(
  "maintenance_records",
  {
    id: id(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => productProfiles.id, { onDelete: "cascade" }),
    // Phase 1: service history recorded by the owner/business; center is a directory ref.
    serviceCenterId: uuid("service_center_id").references(() => directoryEntries.id, {
      onDelete: "set null",
    }),
    date: date("date"),
    type: maintenanceTypeEnum("type").notNull().default("service"),
    status: maintenanceStatusEnum("status").notNull().default("open"),
    description: text("description"),
    providerName: text("provider_name"),
    cost: numeric("cost", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("SAR"),
    notes: text("notes"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    ...timestamps(),
  },
  (t) => [
    index("maintenance_party_idx").on(t.partyId),
    index("maintenance_profile_idx").on(t.profileId),
    index("maintenance_status_idx").on(t.partyId, t.status),
  ],
);

/** Purchase / invoice record — owner-private, always (never on the global profile). */
export const purchaseRecords = pgTable(
  "purchase_records",
  {
    id: id(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => productProfiles.id, { onDelete: "cascade" }),
    merchant: text("merchant"),
    invoiceNumber: varchar("invoice_number", { length: 128 }),
    purchaseDate: date("purchase_date"),
    total: numeric("total", { precision: 14, scale: 2 }),
    currency: varchar("currency", { length: 3 }).notNull().default("SAR"),
    notes: text("notes"),
    ...timestamps(),
  },
  (t) => [
    index("purchase_party_idx").on(t.partyId),
    index("purchase_profile_idx").on(t.profileId),
  ],
);

export const documents = pgTable(
  "documents",
  {
    id: id(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").references(() => productProfiles.id, {
      onDelete: "cascade",
    }),
    maintenanceRecordId: uuid("maintenance_record_id").references(
      () => maintenanceRecords.id,
      { onDelete: "cascade" },
    ),
    type: documentTypeEnum("type").notNull().default("other"),
    name: text("name").notNull(),
    storageKey: text("storage_key").notNull(),
    url: text("url"),
    mimeType: varchar("mime_type", { length: 128 }),
    sizeBytes: integer("size_bytes"),
    visibility: visibilityEnum("visibility").notNull().default("private"),
    uploadedByUserId: uuid("uploaded_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    ...timestamps(),
  },
  (t) => [
    index("documents_party_idx").on(t.partyId),
    index("documents_profile_idx").on(t.profileId),
  ],
);

/* ============================================================================
 * ACTIVITY LOG (audit + dashboard "recent activity"), scoped by party.
 * ==========================================================================*/

export const activityLogs = pgTable(
  "activity_logs",
  {
    id: id(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    actorUserId: uuid("actor_user_id").references(() => users.id, { onDelete: "set null" }),
    entityType: varchar("entity_type", { length: 48 }).notNull(),
    entityId: uuid("entity_id"),
    action: varchar("action", { length: 48 }).notNull(),
    summary: text("summary"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("activity_party_created_idx").on(t.partyId, t.createdAt)],
);

/* ============================================================================
 * STATUS HISTORY (per-status-change timeline for a product profile)
 * ==========================================================================*/

export const statusHistory = pgTable(
  "status_history",
  {
    id: id(),
    partyId: uuid("party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => productProfiles.id, { onDelete: "cascade" }),
    oldStatus: profileStatusEnum("old_status"),
    newStatus: profileStatusEnum("new_status").notNull(),
    changedByUserId: uuid("changed_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    reason: text("reason"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("status_history_profile_idx").on(t.profileId, t.createdAt)],
);

/* ============================================================================
 * CLAIM REQUESTS (claim an existing profile by P Profile ID)
 * ==========================================================================*/

export const claimRequests = pgTable(
  "claim_requests",
  {
    id: id(),
    profileId: uuid("profile_id")
      .notNull()
      .references(() => productProfiles.id, { onDelete: "cascade" }),
    requesterPartyId: uuid("requester_party_id")
      .notNull()
      .references(() => parties.id, { onDelete: "cascade" }),
    requesterUserId: uuid("requester_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    status: claimStatusEnum("status").notNull().default("pending"),
    proofNote: text("proof_note"),
    proofStorageKey: text("proof_storage_key"),
    proofUrl: text("proof_url"),
    resolvedByUserId: uuid("resolved_by_user_id").references(() => users.id, {
      onDelete: "set null",
    }),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    ...timestamps(),
  },
  (t) => [
    index("claim_profile_idx").on(t.profileId),
    index("claim_requester_idx").on(t.requesterPartyId, t.status),
  ],
);

/* ============================================================================
 * RELATIONS
 * ==========================================================================*/

export const partiesRelations = relations(parties, ({ many }) => ({
  branches: many(branches),
  users: many(users),
  associations: many(profileAssociations),
}));

export const branchesRelations = relations(branches, ({ one }) => ({
  party: one(parties, { fields: [branches.partyId], references: [parties.id] }),
}));

export const usersRelations = relations(users, ({ one }) => ({
  party: one(parties, { fields: [users.partyId], references: [parties.id] }),
  branch: one(branches, { fields: [users.branchId], references: [branches.id] }),
}));

export const productModelsRelations = relations(productModels, ({ many }) => ({
  profiles: many(productProfiles),
}));

export const productProfilesRelations = relations(productProfiles, ({ one, many }) => ({
  // Named `productModel` (not `model`) to avoid colliding with the free-text
  // `model` column, which would otherwise be shadowed in relational queries.
  productModel: one(productModels, {
    fields: [productProfiles.productModelId],
    references: [productModels.id],
  }),
  associations: many(profileAssociations),
  warranties: many(warranties),
  maintenanceRecords: many(maintenanceRecords),
  purchaseRecords: many(purchaseRecords),
  documents: many(documents),
  serviceCenterLinks: many(profileServiceCenters),
}));

export const profileAssociationsRelations = relations(profileAssociations, ({ one }) => ({
  profile: one(productProfiles, {
    fields: [profileAssociations.profileId],
    references: [productProfiles.id],
  }),
  party: one(parties, { fields: [profileAssociations.partyId], references: [parties.id] }),
  businessContext: one(businessProfileContext, {
    fields: [profileAssociations.id],
    references: [businessProfileContext.associationId],
  }),
}));

export const businessProfileContextRelations = relations(
  businessProfileContext,
  ({ one }) => ({
    association: one(profileAssociations, {
      fields: [businessProfileContext.associationId],
      references: [profileAssociations.id],
    }),
    branch: one(branches, {
      fields: [businessProfileContext.branchId],
      references: [branches.id],
    }),
    responsibleUser: one(users, {
      fields: [businessProfileContext.responsibleUserId],
      references: [users.id],
    }),
  }),
);

export const warrantiesRelations = relations(warranties, ({ one }) => ({
  profile: one(productProfiles, {
    fields: [warranties.profileId],
    references: [productProfiles.id],
  }),
}));

export const maintenanceRelations = relations(maintenanceRecords, ({ one, many }) => ({
  profile: one(productProfiles, {
    fields: [maintenanceRecords.profileId],
    references: [productProfiles.id],
  }),
  serviceCenter: one(directoryEntries, {
    fields: [maintenanceRecords.serviceCenterId],
    references: [directoryEntries.id],
  }),
  documents: many(documents),
}));

export const purchaseRecordsRelations = relations(purchaseRecords, ({ one }) => ({
  profile: one(productProfiles, {
    fields: [purchaseRecords.profileId],
    references: [productProfiles.id],
  }),
}));

export const documentsRelations = relations(documents, ({ one }) => ({
  profile: one(productProfiles, {
    fields: [documents.profileId],
    references: [productProfiles.id],
  }),
  maintenanceRecord: one(maintenanceRecords, {
    fields: [documents.maintenanceRecordId],
    references: [maintenanceRecords.id],
  }),
}));

export const directoryEntriesRelations = relations(directoryEntries, ({ many }) => ({
  serviceCenterLinks: many(profileServiceCenters),
}));

export const profileServiceCentersRelations = relations(
  profileServiceCenters,
  ({ one }) => ({
    profile: one(productProfiles, {
      fields: [profileServiceCenters.profileId],
      references: [productProfiles.id],
    }),
    directoryEntry: one(directoryEntries, {
      fields: [profileServiceCenters.directoryEntryId],
      references: [directoryEntries.id],
    }),
  }),
);

/* ============================================================================
 * ZOD INSERT SCHEMAS (request validation; server-managed fields omitted)
 * ==========================================================================*/

// Only the insert schemas actually consumed by routes are exported. Other tables
// validate via purpose-built request schemas in their route files (which bundle
// cross-table fields like B2B context and purchase). Add more here as endpoints
// that insert those tables directly are introduced.
const omitBase = {
  id: true,
  partyId: true,
  createdAt: true,
  updatedAt: true,
} as const;

export const insertBranchSchema = createInsertSchema(branches).omit(omitBase);
export const insertWarrantySchema = createInsertSchema(warranties).omit(omitBase);
export const insertMaintenanceSchema = createInsertSchema(maintenanceRecords).omit(omitBase);

/* ============================================================================
 * INFERRED TYPES
 * ==========================================================================*/

export type Party = typeof parties.$inferSelect;
export type Branch = typeof branches.$inferSelect;
export type User = typeof users.$inferSelect;
export type ProductModel = typeof productModels.$inferSelect;
export type ProductProfile = typeof productProfiles.$inferSelect;
export type ProfileAssociation = typeof profileAssociations.$inferSelect;
export type BusinessProfileContext = typeof businessProfileContext.$inferSelect;
export type DirectoryEntry = typeof directoryEntries.$inferSelect;
export type Warranty = typeof warranties.$inferSelect;
export type MaintenanceRecord = typeof maintenanceRecords.$inferSelect;
export type PurchaseRecord = typeof purchaseRecords.$inferSelect;
export type DocumentRow = typeof documents.$inferSelect;
export type ActivityLog = typeof activityLogs.$inferSelect;
export type StatusHistoryRow = typeof statusHistory.$inferSelect;
export type ClaimRequest = typeof claimRequests.$inferSelect;

export type PartyType = (typeof partyTypeEnum.enumValues)[number];
export type UserRole = (typeof userRoleEnum.enumValues)[number];
export type ProfileStatus = (typeof profileStatusEnum.enumValues)[number];
export type WarrantyType = (typeof warrantyTypeEnum.enumValues)[number];
export type MaintenanceStatus = (typeof maintenanceStatusEnum.enumValues)[number];
export type MaintenanceType = (typeof maintenanceTypeEnum.enumValues)[number];
export type DocumentType = (typeof documentTypeEnum.enumValues)[number];
export type DirectoryKind = (typeof directoryKindEnum.enumValues)[number];
export type AuthorizationSource = (typeof authorizationSourceEnum.enumValues)[number];

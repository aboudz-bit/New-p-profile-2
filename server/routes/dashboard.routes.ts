import { Router } from "express";
import { and, eq, sql, count, desc, isNotNull } from "drizzle-orm";
import { db } from "../db";
import {
  productProfiles,
  profileAssociations,
  warranties,
  maintenanceRecords,
  activityLogs,
  users,
} from "@shared/schema";
import { requireAuth } from "../lib/auth";
import { asyncHandler } from "../lib/http";

export const dashboardRouter = Router();
dashboardRouter.use(requireAuth());

// NOTE: 30-day "expiring soon" window is hardcoded in SQL to match
// shared/warranty.ts EXPIRING_WINDOW_DAYS. Keep the two in sync.
dashboardRouter.get(
  "/stats",
  asyncHandler(async (req, res) => {
    const partyId = req.partyId!;

    const ownerFilter = and(
      eq(profileAssociations.partyId, partyId),
      eq(profileAssociations.relationship, "owner"),
      eq(profileAssociations.status, "active"),
    );

    const [totalProfiles] = await db
      .select({ value: count() })
      .from(profileAssociations)
      .where(ownerFilter);

    const [inService] = await db
      .select({ value: count() })
      .from(profileAssociations)
      .innerJoin(productProfiles, eq(productProfiles.id, profileAssociations.profileId))
      .where(and(ownerFilter, eq(productProfiles.status, "in_service")));

    const [openMaintenance] = await db
      .select({ value: count() })
      .from(maintenanceRecords)
      .where(
        and(
          eq(maintenanceRecords.partyId, partyId),
          sql`${maintenanceRecords.status} <> 'completed'`,
        ),
      );

    const [expiredWarranties] = await db
      .select({ value: count() })
      .from(warranties)
      .where(
        and(
          eq(warranties.partyId, partyId),
          isNotNull(warranties.endDate),
          sql`${warranties.endDate} < CURRENT_DATE`,
        ),
      );

    const [expiringWarranties] = await db
      .select({ value: count() })
      .from(warranties)
      .where(
        and(
          eq(warranties.partyId, partyId),
          isNotNull(warranties.endDate),
          sql`${warranties.endDate} >= CURRENT_DATE`,
          sql`${warranties.endDate} <= CURRENT_DATE + INTERVAL '30 days'`,
        ),
      );

    const recentActivity = await db
      .select({
        id: activityLogs.id,
        entityType: activityLogs.entityType,
        entityId: activityLogs.entityId,
        action: activityLogs.action,
        summary: activityLogs.summary,
        createdAt: activityLogs.createdAt,
        actorName: users.name,
      })
      .from(activityLogs)
      .leftJoin(users, eq(users.id, activityLogs.actorUserId))
      .where(eq(activityLogs.partyId, partyId))
      .orderBy(desc(activityLogs.createdAt))
      .limit(15);

    res.json({
      totalProfiles: totalProfiles.value,
      profilesInService: inService.value,
      openMaintenance: openMaintenance.value,
      expiredWarranties: expiredWarranties.value,
      expiringWarranties: expiringWarranties.value,
      recentActivity,
    });
  }),
);

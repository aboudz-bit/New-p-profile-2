/**
 * Bootstrap demo data so you can log in immediately after `db:push`.
 * Writes REAL rows (not UI mock data). Idempotent on the demo owner's email.
 *
 *   Business demo →  owner@demo.pprofile   / Owner12345
 *   Personal demo →  me@demo.pprofile      / Owner12345
 *
 * Run: npm run seed   (after db:push)
 */
import "dotenv/config";
import { eq } from "drizzle-orm";
import { db, pool } from "./db";
import {
  parties,
  branches,
  users,
  directoryEntries,
  productProfiles,
  profileAssociations,
  businessProfileContext,
  purchaseRecords,
  warranties,
  maintenanceRecords,
} from "@shared/schema";
import { hashPassword } from "./lib/auth";
import { generatePProfileId } from "./lib/identity";

const OWNER_EMAIL = "owner@demo.pprofile";
const CONSUMER_EMAIL = "me@demo.pprofile";

async function seed() {
  const existing = await db.select().from(users).where(eq(users.email, OWNER_EMAIL)).limit(1);
  if (existing.length) {
    // eslint-disable-next-line no-console
    console.log("Demo data already seeded. Skipping.");
    return;
  }

  await db.transaction(async (tx) => {
    /* ---------- Business party ---------- */
    const [business] = await tx
      .insert(parties)
      .values({ type: "business", name: "Demo Industrial Co.", nameAr: "شركة ديمو الصناعية" })
      .returning();

    const [branch] = await tx
      .insert(branches)
      .values({
        partyId: business.id,
        name: "Head Office",
        nameAr: "المكتب الرئيسي",
        isPrimary: true,
        location: "Riyadh",
      })
      .returning();

    const [owner] = await tx
      .insert(users)
      .values({
        partyId: business.id,
        branchId: branch.id,
        name: "Demo Owner",
        email: OWNER_EMAIL,
        passwordHash: hashPassword("Owner12345"),
        role: "owner",
        status: "active",
        locale: "ar",
      })
      .returning();

    const [center] = await tx
      .insert(directoryEntries)
      .values({
        ownerPartyId: business.id,
        kind: "service_center",
        name: "Authorized Tech Center",
        location: "Riyadh",
        contactInfo: "+966 11 000 0000",
        authorizationSource: "self_declared",
        supportedBrands: ["Apple"],
      })
      .returning();

    const [profile] = await tx
      .insert(productProfiles)
      .values({
        pProfileId: generatePProfileId(),
        displayName: "MacBook Pro 16",
        category: "Computers",
        brand: "Apple",
        model: "M3 Pro",
        serialNumber: "DEMO-SN-0001",
        manufacturerKey: "apple",
        status: "active",
        createdByPartyId: business.id,
        createdByUserId: owner.id,
      })
      .returning();

    const [assoc] = await tx
      .insert(profileAssociations)
      .values({ profileId: profile.id, partyId: business.id, relationship: "owner", status: "active" })
      .returning();

    await tx.insert(businessProfileContext).values({
      associationId: assoc.id,
      partyId: business.id,
      profileId: profile.id,
      branchId: branch.id,
      responsibleUserId: owner.id,
      internalReference: "IT-LAPTOP-001",
    });

    await tx.insert(purchaseRecords).values({
      partyId: business.id,
      profileId: profile.id,
      merchant: "Apple Store",
      purchaseDate: "2025-01-15",
      total: "12999.00",
      currency: "SAR",
    });

    const [mfrWarranty] = await tx
      .insert(warranties)
      .values({
        partyId: business.id,
        profileId: profile.id,
        type: "manufacturer",
        providerName: "Apple",
        startDate: "2025-01-15",
        endDate: "2026-01-15",
        coverageSummary: "Hardware limited warranty",
      })
      .returning();

    // Extended coverage that continues the manufacturer warranty (coverage chain).
    await tx.insert(warranties).values({
      partyId: business.id,
      profileId: profile.id,
      type: "extended",
      providerName: "AppleCare+",
      providerType: "manufacturer_program",
      startDate: "2026-01-15",
      endDate: "2028-01-15",
      coverageSummary: "Extended hardware + accidental damage",
      supersedesId: mfrWarranty.id,
      shareableWithProvider: true,
    });

    await tx.insert(maintenanceRecords).values({
      partyId: business.id,
      profileId: profile.id,
      serviceCenterId: center.id,
      date: "2025-06-01",
      type: "inspection",
      status: "completed",
      description: "Annual checkup",
      cost: "0.00",
      currency: "SAR",
    });

    /* ---------- Personal (consumer) party ---------- */
    const [consumer] = await tx
      .insert(parties)
      .values({ type: "consumer", name: "Demo Consumer" })
      .returning();

    const [me] = await tx
      .insert(users)
      .values({
        partyId: consumer.id,
        name: "Demo Consumer",
        email: CONSUMER_EMAIL,
        passwordHash: hashPassword("Owner12345"),
        role: "owner",
        status: "active",
        locale: "ar",
      })
      .returning();

    const [phone] = await tx
      .insert(productProfiles)
      .values({
        pProfileId: generatePProfileId(),
        displayName: "iPhone 15 Pro",
        category: "Phones",
        brand: "Apple",
        model: "A3102",
        serialNumber: "DEMO-SN-9001",
        manufacturerKey: "apple",
        status: "active",
        createdByPartyId: consumer.id,
        createdByUserId: me.id,
      })
      .returning();

    await tx
      .insert(profileAssociations)
      .values({ profileId: phone.id, partyId: consumer.id, relationship: "owner", status: "active" });

    await tx.insert(purchaseRecords).values({
      partyId: consumer.id,
      profileId: phone.id,
      merchant: "Jarir",
      purchaseDate: "2025-03-10",
      total: "4999.00",
      currency: "SAR",
    });

    await tx.insert(warranties).values({
      partyId: consumer.id,
      profileId: phone.id,
      type: "manufacturer",
      providerName: "Apple",
      startDate: "2025-03-10",
      endDate: "2026-03-10",
      coverageSummary: "Limited warranty",
    });
  });

  // eslint-disable-next-line no-console
  console.log(
    `Seeded demo data.\n  Business: ${OWNER_EMAIL} / Owner12345\n  Personal: ${CONSUMER_EMAIL} / Owner12345`,
  );
}

seed()
  .catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => pool.end());

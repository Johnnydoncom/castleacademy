import { config } from "dotenv";
import bcrypt from "bcryptjs";
import { db } from "./index";
import { admins, venueHours, pricingConfig } from "./schema";
import { eq } from "drizzle-orm";
import { DEFAULT_PRICING_CONFIG } from "../pricing-config";

config({ path: ".env.local" });
config({ path: ".env" });

async function seed() {
  console.log("🌱 Starting database seeding...");

  const username = process.env.ADMIN_USERNAME || "castacadmin";
  const password = process.env.ADMIN_PASSWORD || "Pa$$w0rd123!";

  console.log(`🔐 Seeding admin user: "${username}"`);
  const passwordHash = await bcrypt.hash(password, 10);

  const existingAdmins = await db
    .select({ id: admins.id })
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1);

  if (existingAdmins.length > 0) {
    await db
      .update(admins)
      .set({ passwordHash, role: "owner", updatedAt: new Date() })
      .where(eq(admins.id, existingAdmins[0].id));
    console.log(`✅ Updated existing admin "${username}" password and owner role.`);
  } else {
    await db.insert(admins).values({
      username,
      passwordHash,
      role: "owner",
    });
    console.log(`✅ Created default admin "${username}" successfully.`);
  }

  // Seed venue_hours default records if missing
  const existingHours = await db.select({ id: venueHours.id }).from(venueHours).limit(1);
  if (existingHours.length === 0) {
    console.log("⏰ Seeding default venue hours (Mon - Sun)...");
    const defaultHours = [
      { dayOfWeek: 0, isOpen: 1, openTime: "09:00:00", closeTime: "18:00:00" }, // Sunday
      { dayOfWeek: 1, isOpen: 1, openTime: "09:00:00", closeTime: "18:00:00" }, // Monday
      { dayOfWeek: 2, isOpen: 1, openTime: "09:00:00", closeTime: "18:00:00" }, // Tuesday
      { dayOfWeek: 3, isOpen: 1, openTime: "09:00:00", closeTime: "18:00:00" }, // Wednesday
      { dayOfWeek: 4, isOpen: 1, openTime: "09:00:00", closeTime: "18:00:00" }, // Thursday
      { dayOfWeek: 5, isOpen: 1, openTime: "09:00:00", closeTime: "18:00:00" }, // Friday
      { dayOfWeek: 6, isOpen: 1, openTime: "09:00:00", closeTime: "18:00:00" }, // Saturday
    ];
    await db.insert(venueHours).values(defaultHours);
    console.log("✅ Venue hours seeded.");
  }

  // Seed pricing_config default record if missing
  const existingPricing = await db.select({ id: pricingConfig.id }).from(pricingConfig).limit(1);
  if (existingPricing.length === 0) {
    console.log("🏷️ Seeding default pricing configuration...");
    await db.insert(pricingConfig).values({
      config: DEFAULT_PRICING_CONFIG as any,
      updatedBy: "system_seed",
    });
    console.log("✅ Default pricing configuration seeded.");
  }

  console.log("\n🎉 Database seed complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Database seeding failed:", err);
  process.exit(1);
});

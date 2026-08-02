/**
 * Drizzle ORM schema for Castle Academy — MySQL 8
 *
 * All tables configured with autoincrement integer primary keys:
 *   • Primary keys (id) are autoincrement integers
 *   • Foreign keys (customerId, bookingId) are integers
 *   • Unique string fields (reference, email, tokenHash, quoteId, platform, key) use varchar with length
 *   • TIMESTAMPTZ → datetime
 *   • BOOLEAN → tinyint
 *   • JSON → json
 *   • NUMERIC → decimal
 */

import {
  mysqlTable,
  varchar,
  tinyint,
  datetime,
  date,
  time,
  text,
  smallint,
  int,
  decimal,
  json,
  index,
  unique,
} from "drizzle-orm/mysql-core";
import { sql } from "drizzle-orm";

// ── venue_hours ──────────────────────────────────────────────────────────────
export const venueHours = mysqlTable("venue_hours", {
  id: int("id").autoincrement().primaryKey(),
  dayOfWeek: smallint("day_of_week").notNull().unique(),
  isOpen: tinyint("is_open").notNull().default(1),
  openTime: time("open_time").notNull().default("09:00:00"),
  closeTime: time("close_time").notNull().default("18:00:00"),
  updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── social_links ─────────────────────────────────────────────────────────────
export const socialLinks = mysqlTable("social_links", {
  id: int("id").autoincrement().primaryKey(),
  platform: varchar("platform", { length: 50 }).notNull().unique(),
  url: text("url").notNull().default(""),
  updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── admins ───────────────────────────────────────────────────────────────────
export const admins = mysqlTable("admins", {
  id: int("id").autoincrement().primaryKey(),
  username: varchar("username", { length: 100 }).notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: varchar("role", { length: 20 }).notNull().default("admin"),
  createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── customers ─────────────────────────────────────────────────────────────────
export const customers = mysqlTable(
  "customers",
  {
    id: int("id").autoincrement().primaryKey(),
    fullName: text("full_name").notNull(),
    email: varchar("email", { length: 320 }).notNull().unique(),
    phone: varchar("phone", { length: 30 }),
    passwordHash: text("password_hash").notNull(),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_customers_email").on(t.email)]
);

// ── bookings ──────────────────────────────────────────────────────────────────
export const bookings = mysqlTable(
  "bookings",
  {
    id: int("id").autoincrement().primaryKey(),
    reference: varchar("reference", { length: 20 }).notNull().unique(),
    fullName: text("full_name").notNull(),
    organisation: text("organisation"),
    phone: text("phone").notNull(),
    email: text("email").notNull(),
    eventType: text("event_type").notNull(),
    startDate: date("start_date").notNull(),
    endDate: date("end_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    participants: smallint("participants").notNull(),
    extras: json("extras"),
    agreedToPolicy: tinyint("agreed_to_policy").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("pending"),
    invoiceSubtotal: int("invoice_subtotal"),
    invoiceVat: int("invoice_vat"),
    invoiceTotal: int("invoice_total"),
    discountApplied: text("discount_applied"),
    invoiceBreakdown: text("invoice_breakdown"),
    notes: text("notes"),
    paymentStatus: varchar("payment_status", { length: 20 }).notNull().default("unpaid"),
    paymentMethod: varchar("payment_method", { length: 50 }),
    nombaOrderRef: text("nomba_order_ref"),
    nombaTransactionId: text("nomba_transaction_id"),
    checkoutLink: text("checkout_link"),
    paidAt: datetime("paid_at"),
    customerId: int("customer_id"),
    rescheduleStatus: varchar("reschedule_status", { length: 20 }).notNull().default("none"),
    rescheduleDate: date("reschedule_date"),
    rescheduleStartTime: time("reschedule_start_time"),
    rescheduleEndTime: time("reschedule_end_time"),
    rescheduleReason: text("reschedule_reason"),
    rescheduleRequestedAt: datetime("reschedule_requested_at"),
    invoiceNumber: text("invoice_number"),
    quoteId: text("quote_id"),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("idx_bookings_dates").on(t.startDate, t.endDate, t.status, t.createdAt),
    index("idx_bookings_customer_id").on(t.customerId),
    index("idx_bookings_email").on(t.email),
  ]
);

// ── booking_days ──────────────────────────────────────────────────────────────
export const bookingDays = mysqlTable(
  "booking_days",
  {
    id: int("id").autoincrement().primaryKey(),
    bookingId: int("booking_id").notNull(),
    dayDate: date("day_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("idx_booking_days_date").on(t.dayDate, t.startTime, t.endTime),
    index("idx_booking_days_booking").on(t.bookingId),
    unique("booking_days_unique_day").on(t.bookingId, t.dayDate),
  ]
);

// ── blocked_slots ─────────────────────────────────────────────────────────────
export const blockedSlots = mysqlTable(
  "blocked_slots",
  {
    id: int("id").autoincrement().primaryKey(),
    slotDate: date("slot_date").notNull(),
    startTime: time("start_time").notNull(),
    endTime: time("end_time").notNull(),
    reason: text("reason"),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [index("idx_blocked_date").on(t.slotDate)]
);

// ── password_reset_tokens ─────────────────────────────────────────────────────
export const passwordResetTokens = mysqlTable(
  "password_reset_tokens",
  {
    id: int("id").autoincrement().primaryKey(),
    tokenHash: varchar("token_hash", { length: 255 }).notNull().unique(),
    customerId: int("customer_id").notNull(),
    expiresAt: datetime("expires_at").notNull(),
    used: tinyint("used").notNull().default(0),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  },
  (t) => [
    index("idx_prt_customer").on(t.customerId),
    index("idx_prt_expires").on(t.expiresAt),
  ]
);

// ── quotes ────────────────────────────────────────────────────────────────────
export const quotes = mysqlTable(
  "quotes",
  {
    id: int("id").autoincrement().primaryKey(),
    quoteId: varchar("quote_id", { length: 255 }).notNull().unique(),
    input: json("input").notNull(),
    source: varchar("source", { length: 20 }).notNull(),
    hours: decimal("hours", { precision: 5, scale: 2 }).notNull(),
    days: int("days").notNull(),
    lines: json("lines").notNull(),
    baseSubtotal: int("base_subtotal").notNull(),
    discountAmount: int("discount_amount").notNull().default(0),
    discountApplied: text("discount_applied"),
    subtotal: int("subtotal").notNull(),
    breakdown: text("breakdown"),
    vatRate: decimal("vat_rate", { precision: 4, scale: 2 }).notNull(),
    vatAmount: int("vat_amount").notNull(),
    total: int("total").notNull(),
    extrasPriced: tinyint("extras_priced").notNull().default(0),
    createdAt: datetime("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    expiresAt: datetime("expires_at").notNull().default(
      sql`DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)`
    ),
  },
  (t) => [
    index("idx_quotes_quote_id").on(t.quoteId),
    index("idx_quotes_expires").on(t.expiresAt),
  ]
);

// ── venue_settings ────────────────────────────────────────────────────────────
export const venueSettings = mysqlTable("venue_settings", {
  id: int("id").autoincrement().primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: text("value").notNull(),
  updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

// ── pricing_config ────────────────────────────────────────────────────────────
export const pricingConfig = mysqlTable("pricing_config", {
  id: int("id").autoincrement().primaryKey(),
  config: json("config").notNull(),
  updatedAt: datetime("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedBy: text("updated_by"),
});

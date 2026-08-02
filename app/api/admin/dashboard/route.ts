import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { bookings } from "@/lib/db/schema";
import { sql, gte } from "drizzle-orm";
import { getAdminSession } from "@/lib/auth";

export async function GET() {
  const session = await getAdminSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  // Revenue figures are sensitive — owner-only.
  const canSeeRevenue = session.role === "owner";

  try {
    // 1. Core metrics
    const metricsResult = await db
      .select({
        total_bookings: sql<number>`COUNT(*)`,
        confirmed_bookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'confirmed' THEN 1 ELSE 0 END)`,
        pending_bookings: sql<number>`SUM(CASE WHEN ${bookings.status} = 'pending' THEN 1 ELSE 0 END)`,
        total_revenue: sql<number>`COALESCE(SUM(CASE WHEN ${bookings.paymentStatus} = 'paid' THEN ${bookings.invoiceTotal} ELSE 0 END), 0)`,
      })
      .from(bookings);
    const metrics = metricsResult[0];

    // 2. Revenue by day (last 30 days)
    // Group by created_at date for actual sales.
    const revenueData = await db
      .select({
        date: sql<string>`DATE(${bookings.createdAt})`,
        revenue: sql<number>`COALESCE(SUM(${bookings.invoiceTotal}), 0)`,
      })
      .from(bookings)
      .where(sql`${bookings.paymentStatus} = 'paid' AND ${bookings.createdAt} >= DATE_SUB(NOW(), INTERVAL 30 DAY)`)
      .groupBy(sql`DATE(${bookings.createdAt})`)
      .orderBy(sql`DATE(${bookings.createdAt}) ASC`);

    // 3. Upcoming events (next 5)
    const upcomingData = await db
      .select({
        reference: bookings.reference,
        full_name: bookings.fullName,
        event_type: bookings.eventType,
        start_date: bookings.startDate,
        start_time: bookings.startTime,
        end_time: bookings.endTime,
        status: bookings.status,
      })
      .from(bookings)
      .where(sql`${bookings.startDate} >= CURDATE() AND ${bookings.status} IN ('confirmed', 'pending')`)
      .orderBy(sql`${bookings.startDate} ASC, ${bookings.startTime} ASC`)
      .limit(5);

    return NextResponse.json({
      role: session.role,
      canSeeRevenue,
      metrics: {
        totalBookings: Number(metrics.total_bookings),
        confirmedBookings: Number(metrics.confirmed_bookings),
        pendingBookings: Number(metrics.pending_bookings),
        // Only expose revenue to owners; null for regular admins.
        totalRevenue: canSeeRevenue ? Number(metrics.total_revenue) : null,
      },
      revenueChart: canSeeRevenue
        ? revenueData.map((r: any) => ({
            date: new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
            revenue: Number(r.revenue)
          }))
        : null,
      upcoming: upcomingData,
    });
  } catch (err) {
    console.error("[API Dashboard] error:", err);
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 });
  }
}

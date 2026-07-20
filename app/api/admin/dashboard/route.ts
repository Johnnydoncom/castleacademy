import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
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
    const metricsResult = await sql`
      SELECT 
        COUNT(*) as total_bookings,
        COUNT(*) FILTER (WHERE status = 'confirmed') as confirmed_bookings,
        COUNT(*) FILTER (WHERE status = 'pending') as pending_bookings,
        COALESCE(SUM(invoice_total) FILTER (WHERE payment_status = 'paid'), 0) as total_revenue
      FROM bookings
    `;
    const metrics = metricsResult[0];

    // 2. Revenue by day (last 30 days)
    // Group by created_at date for actual sales.
    const revenueData = await sql`
      SELECT 
        DATE(created_at) as date,
        COALESCE(SUM(invoice_total), 0) as revenue
      FROM bookings
      WHERE payment_status = 'paid'
        AND created_at >= NOW() - INTERVAL '30 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `;

    // 3. Upcoming events (next 5)
    const upcomingData = await sql`
      SELECT 
        reference, full_name, event_type, 
        start_date::text, start_time::text, end_time::text, 
        status
      FROM bookings
      WHERE start_date >= CURRENT_DATE
        AND status IN ('confirmed', 'pending')
      ORDER BY start_date ASC, start_time ASC
      LIMIT 5
    `;

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
        ? revenueData.map(r => ({
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

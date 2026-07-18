"use client";

import { useEffect, useState } from "react";
import { AdminPageHeader } from "@/components/admin/admin-page-header";
import { DashboardMetrics } from "@/components/admin/dashboard-metrics";
import { DashboardChart } from "@/components/admin/dashboard-chart";
import { DashboardUpcoming } from "@/components/admin/dashboard-upcoming";

export function AdminDashboard() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((res) => res.json())
      .then((json) => {
        if (json.metrics) {
          setData(json);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8 flex items-center justify-center min-h-full bg-zinc-50 dark:bg-zinc-950/20">
        <div className="w-8 h-8 border-4 border-gold border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8 min-h-full bg-zinc-50 dark:bg-zinc-950/20">
        <AdminPageHeader title="Dashboard" description="Overview of your venue performance." />
        <div className="bg-red-50 border border-red-200 text-red-600 p-4 rounded-xl max-w-2xl">
          Failed to load dashboard data. Please try again later.
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 lg:p-8 pt-20 lg:pt-8 bg-zinc-50 dark:bg-zinc-950/30 min-h-full">
      <AdminPageHeader 
        title="Dashboard Overview" 
        description="Welcome back. Here's what's happening with your venue today."
      />
      
      <DashboardMetrics metrics={data.metrics} />
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-auto lg:h-[400px]">
        <div className="lg:col-span-2 h-full">
          <DashboardChart data={data.revenueChart} />
        </div>
        <div className="lg:col-span-1 h-full">
          <DashboardUpcoming events={data.upcoming} />
        </div>
      </div>
    </div>
  );
}

"use client";

import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

interface ChartData {
  date: string;
  revenue: number;
}

export function DashboardChart({ data }: { data: ChartData[] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full flex flex-col">
        <h3 className="text-lg font-semibold text-foreground mb-6">Revenue Trend (Last 30 Days)</h3>
        <div className="flex-1 flex items-center justify-center rounded-xl border border-dashed border-border bg-muted/20">
          <p className="text-sm text-muted-foreground">No revenue data available yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 shadow-sm h-full flex flex-col">
      <h3 className="text-lg font-semibold text-foreground mb-6">Revenue Trend (Last 30 Days)</h3>
      <div className="flex-1 min-h-[300px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#c9a84c" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#c9a84c" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" className="dark:stroke-zinc-800" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#888' }} 
              dy={10} 
            />
            <YAxis 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 12, fill: '#888' }} 
              tickFormatter={(value) => `₦${(value / 1000).toFixed(0)}k`}
            />
            <Tooltip
              contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}
              itemStyle={{ color: '#222', fontWeight: 600 }}
              formatter={(value: number) => [
                new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(value),
                'Revenue'
              ]}
            />
            <Area
              type="monotone"
              dataKey="revenue"
              stroke="#c9a84c"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#colorRevenue)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

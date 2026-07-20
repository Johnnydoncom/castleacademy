import { Banknote, Users, CheckCircle2, Clock } from "lucide-react";

interface Metrics {
  totalBookings: number;
  confirmedBookings: number;
  pendingBookings: number;
  totalRevenue: number | null;
}

export function DashboardMetrics({ metrics }: { metrics: Metrics }) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount);
  };

  // Revenue is owner-only; the API sends null for regular admins.
  const showRevenue = metrics.totalRevenue !== null && metrics.totalRevenue !== undefined;

  const cards = [
    ...(showRevenue
      ? [{
          title: "Total Revenue",
          value: formatCurrency(metrics.totalRevenue as number),
          icon: Banknote,
          color: "text-emerald-600 dark:text-emerald-400",
          bg: "bg-emerald-100 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50",
        }]
      : []),
    {
      title: "Total Bookings",
      value: metrics.totalBookings,
      icon: Users,
      color: "text-blue-600 dark:text-blue-400",
      bg: "bg-blue-100 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900/50",
    },
    {
      title: "Confirmed",
      value: metrics.confirmedBookings,
      icon: CheckCircle2,
      color: "text-amber-600 dark:text-gold",
      bg: "bg-amber-100 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/50",
    },
    {
      title: "Pending",
      value: metrics.pendingBookings,
      icon: Clock,
      color: "text-zinc-600 dark:text-zinc-400",
      bg: "bg-zinc-100 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800",
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
      {cards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="bg-card border border-border rounded-2xl p-5 shadow-sm flex items-center gap-4 transition-all hover:shadow-md">
            <div className={`p-3 rounded-xl ${card.bg} ${card.color}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{card.title}</p>
              <h3 className="text-2xl font-bold tracking-tight text-foreground">{card.value}</h3>
            </div>
          </div>
        );
      })}
    </div>
  );
}

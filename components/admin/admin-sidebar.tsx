"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  CalendarCheck,
  BanIcon,
  Settings,
  Users,
  LayoutDashboard,
  LogOut,
  Menu,
  X,
  ChevronRight,
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck },
  { href: "/admin/blocked-slots", label: "Blocked Slots", icon: BanIcon },
  { href: "/admin/settings", label: "Venue Settings", icon: Settings },
  { href: "/admin/admins", label: "Admin Accounts", icon: Users },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.refresh();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-border/60">
        <img src="/logo.png" alt="Castle Academy" className="h-8 w-auto invert dark:invert-0" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
          Management
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gold/10 text-royal-deep shadow-sm border border-gold/20"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-gold" : "text-muted-foreground")} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 text-gold" />}
            </Link>
          );
        })}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-border/60">
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-all"
        >
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex w-64 flex-col bg-cream border-r border-border shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-cream border-b border-border px-4 h-14 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Castle Academy" className="h-6 w-auto invert dark:invert-0" />
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-slate-100 text-slate-600"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-royal/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-cream h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-border">
              <span className="text-sm font-bold text-foreground">Navigation</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-muted">
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

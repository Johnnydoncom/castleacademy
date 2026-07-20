"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
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
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, ownerOnly: false },
  { href: "/admin/bookings", label: "Bookings", icon: CalendarCheck, ownerOnly: false },
  { href: "/admin/blocked-slots", label: "Blocked Slots", icon: BanIcon, ownerOnly: false },
  { href: "/admin/settings", label: "Venue Settings", icon: Settings, ownerOnly: true },
  { href: "/admin/admins", label: "Admin Accounts", icon: Users, ownerOnly: true },
];

export function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [me, setMe] = useState<{ username: string; role: string } | null>(null);

  useEffect(() => {
    fetch("/api/admin/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => data && setMe({ username: data.username, role: data.role }))
      .catch(() => {});
  }, []);

  const isOwner = me?.role === "owner";
  const visibleItems = navItems.filter((i) => !i.ownerOnly || isOwner);

  const handleLogout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.refresh();
  };

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex items-center gap-3 px-6 py-5 border-b border-zinc-900">
        <img src="/logo.png" alt="Castle Academy" className="h-8 w-auto" />
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        <p className="px-3 mb-2 text-[10px] font-semibold uppercase tracking-widest text-zinc-500">
          Management
        </p>
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const active = item.href === "/admin" 
            ? pathname === "/admin" 
            : (pathname === item.href || pathname.startsWith(item.href + "/"));
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all",
                active
                  ? "bg-gold/15 text-gold shadow-sm border border-gold/30"
                  : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
              )}
            >
              <Icon className={cn("h-4 w-4 shrink-0", active ? "text-gold" : "text-zinc-400")} />
              <span className="flex-1">{item.label}</span>
              {active && <ChevronRight className="h-3 w-3 text-gold" />}
            </Link>
          );
        })}
      </nav>

      {/* Account + Logout */}
      <div className="p-3 border-t border-zinc-900 space-y-1">
        {me && (
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="h-7 w-7 shrink-0 rounded-full bg-gold/20 text-gold flex items-center justify-center text-xs font-bold">
              {me.username.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-xs font-medium text-zinc-200">{me.username}</p>
              <p className="text-[10px] uppercase tracking-widest text-gold">{me.role}</p>
            </div>
          </div>
        )}
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
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
      <aside className="hidden lg:flex w-64 flex-col bg-zinc-950 border-r border-zinc-900 shrink-0">
        {sidebarContent}
      </aside>

      {/* Mobile header bar */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 flex items-center justify-between bg-zinc-950 border-b border-zinc-900 px-4 h-14 shadow-sm">
        <div className="flex items-center gap-2">
          <img src="/logo.png" alt="Castle Academy" className="h-6 w-auto" />
        </div>
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-zinc-900 text-zinc-400 transition-colors"
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </button>
      </div>

      {/* Mobile drawer overlay */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-72 bg-zinc-950 h-full flex flex-col shadow-2xl">
            <div className="flex items-center justify-between px-4 py-4 border-b border-zinc-900">
              <span className="text-sm font-bold text-zinc-100">Navigation</span>
              <button onClick={() => setMobileOpen(false)} className="p-1.5 rounded-lg hover:bg-zinc-900 transition-colors">
                <X className="h-4 w-4 text-zinc-400" />
              </button>
            </div>
            {sidebarContent}
          </aside>
        </div>
      )}
    </>
  );
}

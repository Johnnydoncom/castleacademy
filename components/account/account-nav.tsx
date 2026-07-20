"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { CalendarDays, UserCircle, LogOut, Menu, X } from "lucide-react";

const links = [
  { href: "/account", label: "My Bookings", icon: CalendarDays },
  { href: "/account/profile", label: "Profile", icon: UserCircle },
];

export function AccountNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  const logout = async () => {
    await fetch("/api/customer/login", { method: "DELETE" });
    toast.success("Signed out");
    router.refresh();
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {links.map((l) => {
        const Icon = l.icon;
        const active = l.href === "/account" ? pathname === "/account" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active ? "bg-gold/15 text-royal border border-gold/30" : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Icon className="h-4 w-4" />
            {l.label}
          </Link>
        );
      })}
    </>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-cream/95 backdrop-blur">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="Castle Academy" className="h-7 w-auto" />
        </Link>

        <nav className="hidden items-center gap-2 sm:flex">
          <NavLinks />
        </nav>

        <div className="hidden items-center gap-3 sm:flex">
          <span className="text-sm text-muted-foreground">Hi, {name.split(" ")[0]}</span>
          <button onClick={logout} className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted">
            <LogOut className="h-3.5 w-3.5" /> Sign out
          </button>
        </div>

        {/* Mobile toggle */}
        <button onClick={() => setOpen((o) => !o)} className="rounded-lg p-2 text-muted-foreground hover:bg-muted sm:hidden" aria-label="Menu">
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="border-t border-border bg-cream px-4 py-3 sm:hidden">
          <div className="flex flex-col gap-2">
            <NavLinks onClick={() => setOpen(false)} />
            <button onClick={logout} className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-destructive hover:bg-destructive/10">
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

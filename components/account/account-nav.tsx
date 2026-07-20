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

function Initials({ name }: { name: string }) {
  const parts = name.trim().split(" ");
  const ini = parts.length >= 2
    ? parts[0][0] + parts[parts.length - 1][0]
    : parts[0]?.slice(0, 2) ?? "?";
  return (
    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/20 text-xs font-bold uppercase text-gold border border-gold/30">
      {ini.toUpperCase()}
    </div>
  );
}

export function AccountNav({ name }: { name: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const logout = async () => {
    setSigningOut(true);
    await fetch("/api/customer/login", { method: "DELETE" });
    toast.success("Signed out successfully");
    router.refresh();
  };

  const NavLinks = ({ onClick }: { onClick?: () => void }) => (
    <>
      {links.map((l) => {
        const Icon = l.icon;
        const active =
          l.href === "/account" ? pathname === "/account" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            onClick={onClick}
            className={cn(
              "flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-all",
              active
                ? "bg-gold/15 text-foreground border border-gold/30"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
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
    <header className="sticky top-0 z-40 border-b border-border bg-cream/95 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <img src="/logo.png" alt="Castle Academy" className="h-7 w-auto" />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-1 sm:flex">
          <NavLinks />
        </nav>

        {/* Desktop user area */}
        <div className="hidden items-center gap-3 sm:flex">
          <Initials name={name} />
          <div className="text-right">
            <p className="text-xs font-semibold text-foreground leading-none">{name.split(" ")[0]}</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Customer</p>
          </div>
          <div className="mx-1 h-5 w-px bg-border" />
          <button
            onClick={logout}
            disabled={signingOut}
            className="flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-50"
          >
            <LogOut className="h-3.5 w-3.5" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>

        {/* Mobile toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="rounded-lg p-2 text-muted-foreground hover:bg-muted sm:hidden"
          aria-label="Menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="border-t border-border bg-cream px-4 pb-4 pt-3 sm:hidden">
          <div className="mb-3 flex items-center gap-2.5 rounded-xl bg-muted/30 px-3 py-2.5">
            <Initials name={name} />
            <div>
              <p className="text-sm font-semibold text-foreground">{name}</p>
              <p className="text-xs text-muted-foreground">Customer account</p>
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <NavLinks onClick={() => setOpen(false)} />
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-4 w-4" /> Sign out
            </button>
          </div>
        </div>
      )}
    </header>
  );
}

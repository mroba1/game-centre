"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { USER_NAV, ADMIN_NAV } from "@/lib/nav";
import { SignOutButton } from "@/components/shared/SignOutButton";

export function Sidebar({
  brandTitle,
  brandSubtitle,
  variant = "user",
  footer,
}: {
  brandTitle: string;
  brandSubtitle: string;
  variant?: "user" | "admin";
  footer?: React.ReactNode;
}) {
  const pathname = usePathname();
  // Icon components can't cross the server->client boundary as props (they're
  // not serializable), so the nav config is imported directly here rather
  // than passed down from the server-component layouts that render <Sidebar>.
  const items = variant === "admin" ? ADMIN_NAV : USER_NAV;

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar px-4 py-6 md:flex">
      <div className="mb-8 flex items-center gap-2 px-2">
        <span
          className={cn(
            "flex size-9 items-center justify-center rounded-xl text-white",
            variant === "admin" ? "bg-zinc-700" : "bg-gradient-to-br from-violet-500 to-fuchsia-500"
          )}
        >
          {variant === "admin" ? <Shield className="size-5" /> : <Sparkles className="size-5" />}
        </span>
        <span>
          <span className="block text-sm font-semibold leading-tight text-sidebar-foreground">{brandTitle}</span>
          <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">{brandSubtitle}</span>
        </span>
      </div>

      <nav className="flex-1 space-y-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground ring-1 ring-primary/30"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {footer ?? <SignOutButton />}
    </aside>
  );
}

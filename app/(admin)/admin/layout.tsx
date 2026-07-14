import Link from "next/link";
import { LogOut } from "lucide-react";
import { requireAdmin } from "@/lib/currentUser";
import { Sidebar } from "@/components/shared/Sidebar";
import { MobileNav } from "@/components/shared/MobileNav";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { SignOutButton } from "@/components/shared/SignOutButton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const admin = await requireAdmin();
  const initials = (admin.name ?? "AD").slice(0, 2).toUpperCase();

  const footer = (
    <div className="space-y-1">
      <Link
        href="/dashboard"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground/70 hover:bg-sidebar-accent/50"
      >
        <LogOut className="size-4 rotate-180" /> Exit to Player View
      </Link>
      <SignOutButton />
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <Sidebar brandTitle="Admin Console" brandSubtitle="Wav Workshop" variant="admin" footer={footer} />
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border px-4 md:px-8">
          <div className="flex items-center gap-2">
            <MobileNav brandTitle="Admin Console" brandSubtitle="Wav Workshop" variant="admin" footer={footer} />
            <h1 className="font-semibold">Operations Overview</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Online
            </span>
            <Avatar className="size-9">
              <AvatarFallback className="bg-zinc-700 text-xs font-semibold">{initials}</AvatarFallback>
            </Avatar>
          </div>
        </header>
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

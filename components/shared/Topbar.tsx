"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Search, Download, Upload, Bell, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatKobo } from "@/lib/money";
import { MobileNav } from "@/components/shared/MobileNav";

export function Topbar({
  balanceKobo,
  initials,
  username,
  unreadCount,
  isAdmin,
}: {
  balanceKobo: bigint | number | string;
  initials: string;
  username: string;
  unreadCount: number;
  isAdmin: boolean;
}) {
  return (
    <header className="flex h-16 items-center justify-between gap-4 border-b border-border px-4 md:px-8">
      <div className="flex items-center gap-2">
        <MobileNav brandTitle="Wav Workshop" brandSubtitle="Game Center" />
        <div className="hidden max-w-sm flex-1 items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm text-muted-foreground md:flex">
          <Search className="size-4" />
          <span>Search matches, players, categories...</span>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/50 px-3 py-2 text-sm font-medium">
          <span className="text-muted-foreground">₦</span>
          {formatKobo(BigInt(balanceKobo)).replace("₦", "")}
        </div>
        <Button variant="secondary" size="sm" className="gap-1.5" render={<Link href="/wallet?action=deposit" />}>
          <Download className="size-3.5" /> Deposit
        </Button>
        <Button variant="outline" size="sm" className="hidden gap-1.5 sm:flex" render={<Link href="/wallet?action=withdraw" />}>
          <Upload className="size-3.5" /> Withdraw
        </Button>
        <Link href="/notifications" className="relative flex size-9 items-center justify-center rounded-lg hover:bg-muted/60">
          <Bell className="size-4" />
          {unreadCount > 0 && (
            <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-fuchsia-500" />
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="size-9 cursor-pointer">
              <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">
                {initials}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5 text-sm font-medium">{username}</div>
            <DropdownMenuSeparator />
            <DropdownMenuItem render={<Link href="/profile" />}>Profile</DropdownMenuItem>
            <DropdownMenuItem render={<Link href="/settings" />}>Settings</DropdownMenuItem>
            {isAdmin && (
              <DropdownMenuItem render={<Link href="/admin/overview" />}>Admin Console</DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => signOut({ callbackUrl: "/login" })}>
              <LogOut className="size-4" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

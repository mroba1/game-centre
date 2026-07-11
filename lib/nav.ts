import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid,
  Swords,
  CirclePlus,
  Grid2x2,
  Wallet,
  History,
  Trophy,
  Bell,
  User,
  Settings,
  CreditCard,
  Users,
  TrendingUp,
  HelpCircle,
  ScrollText,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const USER_NAV: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutGrid },
  { label: "Active Games", href: "/active-games", icon: Swords },
  { label: "Create Match", href: "/create-match", icon: CirclePlus },
  { label: "Categories", href: "/categories", icon: Grid2x2 },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Match History", href: "/match-history", icon: History },
  { label: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { label: "Notifications", href: "/notifications", icon: Bell },
  { label: "Profile", href: "/profile", icon: User },
  { label: "Settings", href: "/settings", icon: Settings },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Overview", href: "/admin/overview", icon: LayoutGrid },
  { label: "Payments", href: "/admin/payments", icon: CreditCard },
  { label: "Matches", href: "/admin/matches", icon: Swords },
  { label: "Users", href: "/admin/users", icon: Users },
  { label: "Questions", href: "/admin/questions", icon: HelpCircle },
  { label: "Revenue", href: "/admin/revenue", icon: TrendingUp },
  { label: "Audit Log", href: "/admin/audit-log", icon: ScrollText },
];

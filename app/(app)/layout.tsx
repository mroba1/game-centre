import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/shared/Sidebar";
import { Topbar } from "@/components/shared/Topbar";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const userId = session!.user!.id as string;

  const [wallet, unread] = await Promise.all([
    prisma.wallet.findUniqueOrThrow({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
  ]);

  const username = session!.user!.name ?? "Player";
  const initials = username.slice(0, 2).toUpperCase();

  return (
    <div className="flex min-h-screen">
      <Sidebar brandTitle="Wav Workshop" brandSubtitle="Game Center" />
      <div className="glow-surface flex flex-1 flex-col">
        <Topbar
          balanceKobo={wallet.balanceKobo.toString()}
          initials={initials}
          username={username}
          unreadCount={unread}
          isAdmin={session!.user!.role === "ADMIN"}
        />
        <main className="flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

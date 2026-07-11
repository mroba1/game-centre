import { Medal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { getLeaderboard } from "@/lib/stats";
import { formatKobo } from "@/lib/money";
import { cn } from "@/lib/utils";
import { requireUser } from "@/lib/currentUser";

const PODIUM_STYLE = [
  "border-amber-400/40 bg-gradient-to-b from-amber-500/10 to-card",
  "border-zinc-400/40 bg-gradient-to-b from-zinc-400/10 to-card",
  "border-orange-700/40 bg-gradient-to-b from-orange-700/10 to-card",
];

export default async function LeaderboardPage() {
  await requireUser();
  const leaderboard = await getLeaderboard();
  const podium = leaderboard.slice(0, 3);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Leaderboard</h1>
        <p className="mt-1 text-muted-foreground">Season 4 · Ranked by wins this season</p>
      </div>

      {podium.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {podium.map((p, i) => (
            <div key={p.userId} className={cn("rounded-2xl border p-6 text-center", PODIUM_STYLE[i])}>
              <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-primary/20 text-lg font-bold text-primary">
                {p.username.slice(0, 2).toUpperCase()}
              </div>
              <Medal className={cn("mx-auto mt-2 size-5", i === 0 ? "text-amber-400" : i === 1 ? "text-zinc-300" : "text-orange-500")} />
              <p className="mt-2 font-semibold">{p.username}</p>
              <p className="text-xs text-muted-foreground">{p.country ?? "—"}</p>
              <div className="mt-3 flex justify-center gap-4 text-xs">
                <div>
                  <p className="text-muted-foreground">Wins</p>
                  <p className="font-semibold">{p.wins}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Win %</p>
                  <p className="font-semibold text-emerald-400">{p.winRate}%</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="overflow-x-auto rounded-2xl border border-border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-3">Rank</th>
              <th className="px-4 py-3">Player</th>
              <th className="px-4 py-3">Win Rate</th>
              <th className="px-4 py-3">Matches</th>
              <th className="px-4 py-3">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((p, i) => (
              <tr key={p.userId} className="border-b border-border/60 last:border-0">
                <td className="px-4 py-3 text-muted-foreground">#{i + 1}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <Avatar className="size-7">
                      <AvatarFallback className="bg-primary/20 text-[10px] font-semibold text-primary">
                        {p.username.slice(0, 2).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{p.username}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-emerald-400">{p.winRate}%</td>
                <td className="px-4 py-3 text-muted-foreground">{p.matches}</td>
                <td className="px-4 py-3">{formatKobo(p.earningsKobo)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

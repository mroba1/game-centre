import Link from "next/link";
import { Sparkles, Swords, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <div className="glow-surface flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white">
            <Sparkles className="size-5" />
          </span>
          <span>
            <span className="block text-sm font-semibold leading-tight">Wav Workshop</span>
            <span className="block text-[10px] uppercase tracking-wider text-muted-foreground">Game Center</span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" render={<Link href="/login" />}>Sign in</Button>
          <Button render={<Link href="/register" />}>Get started</Button>
        </div>
      </header>

      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm text-violet-300">
          <Swords className="size-4" /> Season 4 — Live Now
        </span>
        <h1 className="max-w-3xl text-5xl font-bold tracking-tight md:text-6xl">
          Compete. Win. <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Earn.</span>
        </h1>
        <p className="mt-6 max-w-xl text-lg text-muted-foreground">
          Challenge real opponents to head-to-head quiz matches, stake your knowledge, and climb the global rankings.
        </p>
        <div className="mt-8 flex gap-4">
          <Button size="lg" render={<Link href="/register" />}>Join a Match</Button>
          <Button size="lg" variant="secondary" render={<Link href="/register" />}>Create Match</Button>
        </div>
        <div className="mt-16 flex items-center gap-2 text-sm text-muted-foreground">
          <ShieldCheck className="size-4 text-emerald-400" />
          All deposits and withdrawals are manually verified by our team for your security.
        </div>
      </main>
    </div>
  );
}

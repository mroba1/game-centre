"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, Clock, Swords, Trophy, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface GamePlayer {
  userId: string;
  score: number;
  correctCount: number;
  user: { id: string; username: string };
}
interface GameDetail {
  id: string;
  status: string;
  stakeKobo: string;
  questionCount: number;
  winnerUserId: string | null;
  createdByUserId: string;
  category: { name: string };
  players: GamePlayer[];
}
interface QuestionOption {
  id: string;
  label: string;
}
interface RevealedQuestion {
  gameQuestionId: string;
  sequence: number;
  prompt: string;
  options: QuestionOption[];
  revealedAt: string;
  deadlineAt: string;
}
interface GameEvent {
  id: string;
  seq: number;
  type: string;
  payload: Record<string, unknown>;
}

export default function LiveMatchPage() {
  const params = useParams<{ id: string }>();
  const gameId = params.id;

  const [game, setGame] = useState<GameDetail | null>(null);
  const [question, setQuestion] = useState<RevealedQuestion | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);
  const [resolvedCorrectId, setResolvedCorrectId] = useState<string | null>(null);
  const [liveScores, setLiveScores] = useState<Record<string, number>>({});
  const [now, setNow] = useState(() => Date.now());
  const [meId, setMeId] = useState<string | null>(null);
  const [result, setResult] = useState<{ winnerUserId: string | null; draw: boolean } | null>(null);
  const [banner, setBanner] = useState<string | null>(null);
  const [isTiebreaker, setIsTiebreaker] = useState(false);

  const lastSeqRef = useRef<number>(0);

  const loadGame = useCallback(async () => {
    const res = await fetch(`/api/games/${gameId}`);
    if (res.ok) setGame(await res.json());
  }, [gameId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loadGame() only setStates inside its own async/await chain, not synchronously
    loadGame();
  }, [loadGame]);

  // Identify "me" via the session endpoint next-auth exposes.
  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => setMeId(s?.user?.id ?? null));
  }, []);

  const handleEvent = useCallback((event: GameEvent) => {
    switch (event.type) {
      case "game:opponent-joined":
      case "game:starting":
        loadGame();
        break;
      case "question:revealed":
        setQuestion(event.payload as unknown as RevealedQuestion);
        setSelectedOptionId(null);
        setAnswered(false);
        setResolvedCorrectId(null);
        break;
      case "answer:accepted":
        break;
      case "game:tiebreaker":
        setIsTiebreaker(true);
        toast.info("Tied! Sudden death — 3 extra questions to decide the winner.");
        break;
      case "question:resolved": {
        const payload = event.payload as { correctOptionId?: string; scores?: Array<{ userId: string; score: number }> };
        setResolvedCorrectId(payload.correctOptionId ?? null);
        if (payload.scores) {
          const map: Record<string, number> = {};
          for (const s of payload.scores) map[s.userId] = s.score;
          setLiveScores(map);
        }
        break;
      }
      case "game:completed": {
        const payload = event.payload as { winnerUserId: string | null; draw: boolean };
        setResult(payload);
        loadGame();
        break;
      }
      case "game:cancelled":
      case "game:expired":
        setBanner("This match was cancelled and stakes have been refunded.");
        loadGame();
        break;
      case "game:disputed":
        setBanner("A dispute has been raised for this match and is under admin review.");
        break;
      default:
        break;
    }
  }, [loadGame]);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch(`/api/games/${gameId}/events?since=${lastSeqRef.current}`);
        if (res.ok) {
          const events: GameEvent[] = await res.json();
          for (const e of events) {
            handleEvent(e);
            lastSeqRef.current = Math.max(lastSeqRef.current, e.seq);
          }
        }
      } finally {
        if (!cancelled) setTimeout(poll, 1200);
      }
    };
    poll();

    return () => {
      cancelled = true;
    };
  }, [gameId, handleEvent]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  const submitAnswer = async (optionId: string | null) => {
    if (!question || answered) return;
    setSelectedOptionId(optionId);
    setAnswered(true);
    await fetch(`/api/games/${gameId}/answer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        gameQuestionId: question.gameQuestionId,
        selectedOptionId: optionId,
        clientNonce: crypto.randomUUID(),
        clientElapsedMs: 0,
      }),
    }).catch(() => toast.error("Could not submit answer"));
  };

  const raiseDispute = async () => {
    const reason = prompt("Describe the issue with this match result:");
    if (!reason) return;
    const res = await fetch(`/api/games/${gameId}/dispute`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    if (res.ok) toast.success("Dispute submitted for admin review.");
    else toast.error((await res.json().catch(() => ({}))).error ?? "Could not raise dispute");
  };

  if (!game) return <div className="text-muted-foreground">Loading match...</div>;

  const opponent = game.players.find((p) => p.userId !== meId);
  const me = game.players.find((p) => p.userId === meId);

  if (banner) {
    return <StatusScreen icon={XCircle} iconClass="text-destructive" title="Match Ended" message={banner} />;
  }

  if (game.status === "WAITING_FOR_OPPONENT") {
    return (
      <StatusScreen
        icon={Clock}
        iconClass="text-amber-400"
        title="Waiting for an Opponent"
        message="Your match is live in the lobby. We'll notify you the moment someone joins."
      />
    );
  }

  if (game.status === "WAITING_FOR_ADMIN_APPROVAL") {
    return (
      <StatusScreen
        icon={Clock}
        iconClass="text-amber-400"
        title="Waiting for Admin Approval"
        message="An opponent has joined! An admin is verifying both stakes before the match begins."
      />
    );
  }

  if (game.status === "PAID" || game.status === "REFUNDED" || result) {
    const draw = result?.draw ?? (!game.winnerUserId && game.status === "REFUNDED");
    const won = result?.winnerUserId === meId || game.winnerUserId === meId;

    return (
      <div className="mx-auto max-w-lg space-y-6 text-center">
        <div className={cn("mx-auto flex size-16 items-center justify-center rounded-full", won ? "bg-emerald-500/15" : draw ? "bg-muted" : "bg-destructive/15")}>
          <Trophy className={cn("size-8", won ? "text-emerald-400" : draw ? "text-muted-foreground" : "text-destructive")} />
        </div>
        <h1 className="text-2xl font-bold">{draw ? "It's a Draw" : won ? "You Won!" : "You Lost"}</h1>
        <p className="text-muted-foreground">
          {draw ? "Both stakes have been fully refunded." : won ? "The prize has been credited to your wallet." : "A partial refund has been credited to your wallet."}
        </p>
        <div className="rounded-2xl border border-border bg-card p-6 text-left">
          <ScoreRow label={me?.user.username ?? "You"} score={liveScores[meId ?? ""] ?? me?.score ?? 0} highlight={won} />
          <ScoreRow label={opponent?.user.username ?? "Opponent"} score={liveScores[opponent?.userId ?? ""] ?? opponent?.score ?? 0} highlight={!won && !draw} />
        </div>
        <Button variant="outline" onClick={raiseDispute}>
          Raise a Dispute
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="flex items-center justify-between rounded-2xl border border-border bg-card p-4">
        <PlayerBadge username={me?.user.username ?? "You"} score={liveScores[meId ?? ""] ?? me?.score ?? 0} />
        <Swords className="size-5 text-muted-foreground" />
        <PlayerBadge username={opponent?.user.username ?? "Opponent"} score={liveScores[opponent?.userId ?? ""] ?? opponent?.score ?? 0} align="right" />
      </div>

      {!question && (
        <StatusScreen icon={Clock} iconClass="text-primary" title="Get Ready" message="The match is starting..." compact />
      )}

      {question && (
        <div className="rounded-2xl border border-border bg-card p-6">
          <div className="mb-4 flex items-center justify-between text-sm text-muted-foreground">
            <span className={cn(isTiebreaker && question.sequence > game.questionCount && "font-semibold text-amber-400")}>
              {isTiebreaker && question.sequence > game.questionCount
                ? `Sudden Death · Question ${question.sequence - game.questionCount}`
                : `Question ${question.sequence} / ${game.questionCount}`}
            </span>
            <CountdownBadge deadlineAt={question.deadlineAt} now={now} />
          </div>
          <h2 className="text-lg font-semibold">{question.prompt}</h2>
          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {question.options.map((opt) => {
              const isSelected = selectedOptionId === opt.id;
              const isCorrect = resolvedCorrectId === opt.id;
              const showResolution = resolvedCorrectId !== null;
              return (
                <button
                  key={opt.id}
                  disabled={answered}
                  onClick={() => submitAnswer(opt.id)}
                  className={cn(
                    "rounded-xl border px-4 py-3 text-left text-sm font-medium transition-colors",
                    showResolution && isCorrect && "border-emerald-500 bg-emerald-500/10 text-emerald-400",
                    showResolution && isSelected && !isCorrect && "border-destructive bg-destructive/10 text-destructive",
                    !showResolution && isSelected && "border-primary bg-primary/10 text-primary",
                    !showResolution && !isSelected && "border-border bg-muted/30 hover:bg-muted/50",
                    answered && !isSelected && !showResolution && "opacity-50"
                  )}
                >
                  <span className="flex items-center justify-between">
                    {opt.label}
                    {showResolution && isCorrect && <CheckCircle2 className="size-4" />}
                  </span>
                </button>
              );
            })}
          </div>
          {answered && !resolvedCorrectId && (
            <p className="mt-4 text-center text-sm text-muted-foreground">Waiting for your opponent...</p>
          )}
        </div>
      )}
    </div>
  );
}

function PlayerBadge({ username, score, align = "left" }: { username: string; score: number; align?: "left" | "right" }) {
  return (
    <div className={cn("flex items-center gap-2", align === "right" && "flex-row-reverse text-right")}>
      <Avatar className="size-9">
        <AvatarFallback className="bg-primary/20 text-xs font-semibold text-primary">{username.slice(0, 2).toUpperCase()}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-semibold">{username}</p>
        <p className="text-xs text-muted-foreground">{score} correct</p>
      </div>
    </div>
  );
}

function ScoreRow({ label, score, highlight }: { label: string; score: number; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between border-b border-border/60 py-2 last:border-0">
      <span className={cn("font-medium", highlight && "text-emerald-400")}>{label}</span>
      <span className="font-semibold">{score}</span>
    </div>
  );
}

function CountdownBadge({ deadlineAt, now }: { deadlineAt: string; now: number }) {
  const secondsLeft = Math.max(0, Math.ceil((new Date(deadlineAt).getTime() - now) / 1000));
  return (
    <span className={cn("flex items-center gap-1 font-semibold", secondsLeft <= 5 ? "text-destructive" : "text-foreground")}>
      <Clock className="size-4" /> {secondsLeft}s
    </span>
  );
}

function StatusScreen({
  icon: Icon,
  iconClass,
  title,
  message,
  compact,
}: {
  icon: React.ComponentType<{ className?: string }>;
  iconClass: string;
  title: string;
  message: string;
  compact?: boolean;
}) {
  return (
    <div className={cn("mx-auto max-w-md space-y-4 rounded-2xl border border-border bg-card text-center", compact ? "p-8" : "mt-16 p-10")}>
      <span className={cn("mx-auto flex size-14 items-center justify-center rounded-full bg-muted", iconClass)}>
        <Icon className="size-6" />
      </span>
      <h1 className="text-xl font-semibold">{title}</h1>
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

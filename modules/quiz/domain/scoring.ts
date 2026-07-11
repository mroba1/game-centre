export interface PlayerTally {
  userId: string;
  correctCount: number;
  totalResponseMs: number;
}

export type WinnerOutcome =
  | { kind: "WINNER"; winnerUserId: string; loserUserId: string }
  | { kind: "DRAW"; playerIds: [string, string] };

/**
 * Winner determination per docs/architecture.md §3.5 / §9 default:
 * higher correctCount wins; on a tie, lower totalResponseMs (faster) wins;
 * a true tie on both dimensions is a draw (pot split, no fee — see
 * computePayout in modules/matchmaking/domain/prizeDistribution.ts).
 */
export function determineWinner(a: PlayerTally, b: PlayerTally): WinnerOutcome {
  if (a.correctCount !== b.correctCount) {
    return a.correctCount > b.correctCount
      ? { kind: "WINNER", winnerUserId: a.userId, loserUserId: b.userId }
      : { kind: "WINNER", winnerUserId: b.userId, loserUserId: a.userId };
  }

  if (a.totalResponseMs !== b.totalResponseMs) {
    return a.totalResponseMs < b.totalResponseMs
      ? { kind: "WINNER", winnerUserId: a.userId, loserUserId: b.userId }
      : { kind: "WINNER", winnerUserId: b.userId, loserUserId: a.userId };
  }

  return { kind: "DRAW", playerIds: [a.userId, b.userId] };
}

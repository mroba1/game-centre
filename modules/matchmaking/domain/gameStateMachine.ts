import { GameStatus } from "@prisma/client";

/**
 * Legal state transitions for a Game (see docs/architecture.md §3.4).
 * Every application-layer mutation must go through assertTransition() before
 * issuing its `WHERE status = <from>` guarded update, so an illegal or
 * concurrent/out-of-order transition is structurally impossible rather than
 * merely checked.
 */
const LEGAL_TRANSITIONS: Record<GameStatus, GameStatus[]> = {
  WAITING_FOR_OPPONENT: ["OPPONENT_JOINED", "CANCELLED"],
  OPPONENT_JOINED: ["WAITING_FOR_ADMIN_APPROVAL"],
  WAITING_FOR_ADMIN_APPROVAL: ["STARTING", "CANCELLED"],
  STARTING: ["IN_PROGRESS"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["PAID"],
  DISPUTED: ["PAID", "REFUNDED"],
  PAID: ["DISPUTED"],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
};

export class InvalidStateTransitionError extends Error {
  constructor(from: GameStatus, to: GameStatus) {
    super(`Illegal game state transition: ${from} -> ${to}`);
    this.name = "InvalidStateTransitionError";
  }
}

export function assertTransition(from: GameStatus, to: GameStatus): void {
  if (!LEGAL_TRANSITIONS[from]?.includes(to)) {
    throw new InvalidStateTransitionError(from, to);
  }
}

export function isTerminal(status: GameStatus): boolean {
  return LEGAL_TRANSITIONS[status].length === 0;
}

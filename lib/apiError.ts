import { NextResponse } from "next/server";
import { UnauthorizedError, ForbiddenError } from "@/lib/apiAuth";
import { InsufficientFundsError } from "@/modules/wallet/application/walletService";
import { InvalidStateTransitionError } from "@/modules/matchmaking/domain/gameStateMachine";
import { ConcurrentMatchLimitError, CannotJoinOwnGameError } from "@/modules/matchmaking/application/matchService";
import { QuestionNotActiveError } from "@/modules/quiz/application/quizEngine";
import { DepositNotPendingError } from "@/modules/deposits/application/depositService";
import {
  EmailInUseError,
  UsernameInUseError,
  InvalidOrExpiredTokenError,
} from "@/modules/auth/application/authService";

const KNOWN_400: Array<new (...args: never[]) => Error> = [
  InsufficientFundsError,
  InvalidStateTransitionError,
  ConcurrentMatchLimitError,
  CannotJoinOwnGameError,
  QuestionNotActiveError,
  DepositNotPendingError,
  InvalidOrExpiredTokenError,
];
const KNOWN_409: Array<new (...args: never[]) => Error> = [EmailInUseError, UsernameInUseError];

export function errorResponse(err: unknown): NextResponse {
  if (err instanceof UnauthorizedError) return NextResponse.json({ error: err.message }, { status: 401 });
  if (err instanceof ForbiddenError) return NextResponse.json({ error: err.message }, { status: 403 });
  if (KNOWN_400.some((cls) => err instanceof cls)) {
    return NextResponse.json({ error: (err as Error).message }, { status: 400 });
  }
  if (KNOWN_409.some((cls) => err instanceof cls)) {
    return NextResponse.json({ error: (err as Error).message }, { status: 409 });
  }

  console.error(err);
  return NextResponse.json({ error: "Internal server error" }, { status: 500 });
}

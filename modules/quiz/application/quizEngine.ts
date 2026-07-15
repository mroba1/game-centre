import { GameStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/modules/matchmaking/domain/gameStateMachine";
import { determineWinner } from "@/modules/quiz/domain/scoring";
import { computeDrawRefund, computePrizeDistribution } from "@/modules/matchmaking/domain/prizeDistribution";
import { creditPrize, partialLoserRefund, recordPlatformFee, refundStake } from "@/modules/wallet/application/walletService";
import { emitGameEvent } from "@/lib/realtime";
import { notifyUser } from "@/modules/notifications/application/notificationService";
import {
  getPlatformFeePercent,
  getLoserRefundPercent,
  getQuestionTimeLimitSeconds,
  getTiebreakerQuestionCount,
  getTiebreakerTimeLimitSeconds,
} from "@/lib/settings";

/** Fisher-Yates shuffle — used for question order and option-independent selection. */
function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/**
 * Transitions STARTING -> IN_PROGRESS, freezes the question set for this
 * match (see docs/architecture.md §2.6), and reveals question 1. Question
 * selection prefers questions neither player has seen in their last 20
 * matches, falling back to the full active pool if the category doesn't
 * have enough unseen questions yet.
 */
export async function startMatch(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId }, include: { players: true } });
  assertTransition(game.status, GameStatus.IN_PROGRESS);

  const recentlySeenIds = await prisma.gameQuestion.findMany({
    where: {
      game: {
        status: { in: ["COMPLETED", "PAID", "IN_PROGRESS"] },
        players: { some: { userId: { in: game.players.map((p) => p.userId) } } },
      },
    },
    orderBy: { id: "desc" },
    take: 200,
    select: { questionId: true },
  });
  const seenIds = new Set(recentlySeenIds.map((q) => q.questionId));

  const pool = await prisma.question.findMany({
    where: { categoryId: game.categoryId, active: true },
    select: { id: true },
  });
  const unseen = pool.filter((q) => !seenIds.has(q.id));
  const candidates = unseen.length >= game.questionCount ? unseen : pool;
  const selected = shuffle(candidates).slice(0, game.questionCount);

  if (selected.length < game.questionCount) {
    throw new Error(`Category has only ${selected.length} active questions, needs ${game.questionCount}`);
  }

  await prisma.$transaction(
    selected.map((q, i) =>
      prisma.gameQuestion.create({ data: { gameId: game.id, questionId: q.id, sequence: i + 1 } })
    )
  );

  await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.IN_PROGRESS } });
  await emitGameEvent(game.id, "game:starting", { gameId: game.id, countdownSeconds: 5 });
  for (const player of game.players) {
    await notifyUser({
      userId: player.userId,
      type: "MATCH_STARTED",
      title: "Your match has started",
      body: "An admin approved your match — jump in now to answer the first question.",
    });
  }

  await revealQuestion(game.id, 1, await getQuestionTimeLimitSeconds());
}

/**
 * Appends a sudden-death round when both players are tied after the last
 * originally-planned question (see docs/architecture.md §9 default #1,
 * overridden per product decision: sudden-death round instead of an
 * immediate response-time tiebreak). Reuses the same "prefer unseen
 * questions, fall back to the full pool" selection as startMatch(), scoped
 * to also exclude questions already used earlier in *this* match.
 */
async function appendTiebreakerQuestions(gameId: string, categoryId: string, startSequence: number) {
  const tiebreakerCount = await getTiebreakerQuestionCount();

  const usedInThisGame = await prisma.gameQuestion.findMany({ where: { gameId }, select: { questionId: true } });
  const usedIds = new Set(usedInThisGame.map((q) => q.questionId));

  const pool = await prisma.question.findMany({ where: { categoryId, active: true }, select: { id: true } });
  const unseen = pool.filter((q) => !usedIds.has(q.id));
  const candidates = unseen.length >= tiebreakerCount ? unseen : pool;
  const selected = shuffle(candidates).slice(0, tiebreakerCount);

  await prisma.$transaction(
    selected.map((q, i) =>
      prisma.gameQuestion.create({ data: { gameId, questionId: q.id, sequence: startSequence + i + 1 } })
    )
  );

  return selected.length;
}

async function revealQuestion(gameId: string, sequence: number, timeLimitSeconds: number) {
  const now = new Date();
  const deadlineAt = new Date(now.getTime() + timeLimitSeconds * 1000);

  const gq = await prisma.gameQuestion.update({
    where: { gameId_sequence: { gameId, sequence } },
    data: { revealedAt: now, deadlineAt },
    include: { question: { include: { options: { select: { id: true, label: true, sortOrder: true } } } } },
  });

  await emitGameEvent(gameId, "question:revealed", {
    gameQuestionId: gq.id,
    sequence: gq.sequence,
    prompt: gq.question.prompt,
    options: gq.question.options.map((o) => ({ id: o.id, label: o.label })),
    revealedAt: now.toISOString(),
    deadlineAt: deadlineAt.toISOString(),
  });
}

export class QuestionNotActiveError extends Error {
  constructor() {
    super("This question is not currently active for answering");
    this.name = "QuestionNotActiveError";
  }
}

export async function submitAnswer(params: {
  gameId: string;
  userId: string;
  gameQuestionId: string;
  selectedOptionId: string | null;
  clientNonce: string;
  ipAddress?: string;
}) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: params.gameId }, include: { players: true } });
  if (game.status !== GameStatus.IN_PROGRESS) throw new QuestionNotActiveError();

  const gamePlayer = game.players.find((p) => p.userId === params.userId);
  if (!gamePlayer) throw new Error("Not a player in this match");

  const gq = await prisma.gameQuestion.findUniqueOrThrow({
    where: { id: params.gameQuestionId },
    include: { question: { include: { options: true } } },
  });
  if (gq.gameId !== game.id || !gq.revealedAt || !gq.deadlineAt) throw new QuestionNotActiveError();

  // Server-authoritative: correctness and timing are derived only from
  // server clocks, never trusted from the client (anti-cheat, §3.5).
  const now = new Date();
  const withinDeadline = now <= gq.deadlineAt;
  const selectedOption = params.selectedOptionId
    ? gq.question.options.find((o) => o.id === params.selectedOptionId)
    : undefined;
  const isCorrect = withinDeadline && !!selectedOption?.isCorrect;
  const responseMs = Math.min(now.getTime() - gq.revealedAt.getTime(), gq.deadlineAt.getTime() - gq.revealedAt.getTime());

  // Duplicate submission for the same question is rejected at the DB
  // constraint level (unique gamePlayerId+gameQuestionId), not just in
  // application logic — this is the anti-replay guard from §3.5. A retry
  // (network blip, double-click) is idempotent: it returns the original
  // answer and does not double-count the score.
  const existing = await prisma.gameAnswer.findUnique({
    where: { gamePlayerId_gameQuestionId: { gamePlayerId: gamePlayer.id, gameQuestionId: gq.id } },
  });
  if (existing) {
    await emitGameEvent(game.id, "answer:accepted", { userId: params.userId, gameQuestionId: gq.id });
    return existing;
  }

  let answer;
  try {
    answer = await prisma.gameAnswer.create({
      data: {
        gamePlayerId: gamePlayer.id,
        gameQuestionId: gq.id,
        selectedOptionId: withinDeadline ? params.selectedOptionId : null,
        isCorrect,
        responseMs,
        clientNonce: params.clientNonce,
        ipAddress: params.ipAddress,
      },
    });
  } catch {
    // Lost a create race against a concurrent duplicate submission — the
    // other request already recorded the answer, so just return it.
    return prisma.gameAnswer.findUniqueOrThrow({
      where: { gamePlayerId_gameQuestionId: { gamePlayerId: gamePlayer.id, gameQuestionId: gq.id } },
    });
  }

  await prisma.gamePlayer.update({
    where: { id: gamePlayer.id },
    data: {
      correctCount: { increment: isCorrect ? 1 : 0 },
      totalResponseMs: { increment: responseMs },
      score: { increment: isCorrect ? 1 : 0 },
    },
  });

  await emitGameEvent(game.id, "answer:accepted", { userId: params.userId, gameQuestionId: gq.id });

  const answersForQuestion = await prisma.gameAnswer.count({ where: { gameQuestionId: gq.id } });
  if (answersForQuestion >= game.players.length) {
    await resolveQuestion(game.id, gq.id, gq.sequence, game.questionCount, game.categoryId);
  }

  return answer;
}

async function resolveQuestion(
  gameId: string,
  gameQuestionId: string,
  sequence: number,
  originalQuestionCount: number,
  categoryId: string
) {
  const gq = await prisma.gameQuestion.findUniqueOrThrow({
    where: { id: gameQuestionId },
    include: { question: { include: { options: true } } },
  });
  const correctOption = gq.question.options.find((o) => o.isCorrect);
  const players = await prisma.gamePlayer.findMany({ where: { gameId }, select: { userId: true, score: true } });

  await emitGameEvent(gameId, "question:resolved", {
    gameQuestionId,
    correctOptionId: correctOption?.id,
    explanation: gq.question.explanation,
    scores: players,
  });

  const totalPlanned = await prisma.gameQuestion.count({ where: { gameId } });

  if (sequence < totalPlanned) {
    const nextIsTiebreaker = sequence + 1 > originalQuestionCount;
    const timeLimit = nextIsTiebreaker ? await getTiebreakerTimeLimitSeconds() : await getQuestionTimeLimitSeconds();
    await revealQuestion(gameId, sequence + 1, timeLimit);
    return;
  }

  // Last question in the current plan — check for a tie.
  const [a, b] = await prisma.gamePlayer.findMany({ where: { gameId } });
  const tied = a.correctCount === b.correctCount;
  const alreadyRanTiebreaker = totalPlanned > originalQuestionCount;

  if (tied && !alreadyRanTiebreaker) {
    const added = await appendTiebreakerQuestions(gameId, categoryId, totalPlanned);
    if (added > 0) {
      await emitGameEvent(gameId, "game:tiebreaker", { gameId, questionCount: added });
      await revealQuestion(gameId, totalPlanned + 1, await getTiebreakerTimeLimitSeconds());
      return;
    }
    // No fresh questions available for a tiebreaker round (tiny question bank) —
    // fall back to completing the match; determineWinner() decides via response time.
  }

  await completeMatch(gameId);
}

async function completeMatch(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId }, include: { players: true } });
  assertTransition(game.status, GameStatus.COMPLETED);

  const [a, b] = game.players;
  const outcome = determineWinner(
    { userId: a.userId, correctCount: a.correctCount, totalResponseMs: a.totalResponseMs },
    { userId: b.userId, correctCount: b.correctCount, totalResponseMs: b.totalResponseMs }
  );

  await prisma.game.update({
    where: { id: gameId },
    data: {
      status: GameStatus.COMPLETED,
      completedAt: new Date(),
      winnerUserId: outcome.kind === "WINNER" ? outcome.winnerUserId : null,
    },
  });

  if (outcome.kind === "DRAW") {
    for (const p of game.players) {
      await refundStake({ userId: p.userId, gameId, stakeKobo: game.stakeKobo, reasonSuffix: "draw" });
    }
  } else {
    const feePercent = await getPlatformFeePercent();
    const loserRefundPercent = await getLoserRefundPercent();
    const { platformFeeKobo, winnerPayoutKobo, loserRefundKobo } = computePrizeDistribution({
      stakeKobo: game.stakeKobo,
      feePercent,
      loserRefundPercent,
    });

    await creditPrize({ userId: outcome.winnerUserId, gameId, stakeKobo: game.stakeKobo, payoutKobo: winnerPayoutKobo });
    await partialLoserRefund({ userId: outcome.loserUserId, gameId, stakeKobo: game.stakeKobo, refundKobo: loserRefundKobo });
    await recordPlatformFee({ gameId, feeKobo: platformFeeKobo });
  }

  assertTransition(GameStatus.COMPLETED, GameStatus.PAID);
  await prisma.game.update({ where: { id: gameId }, data: { status: GameStatus.PAID } });

  const finalPlayers = await prisma.gamePlayer.findMany({ where: { gameId }, select: { userId: true, score: true, correctCount: true } });
  await emitGameEvent(gameId, "game:completed", {
    gameId,
    winnerUserId: outcome.kind === "WINNER" ? outcome.winnerUserId : null,
    draw: outcome.kind === "DRAW",
    players: finalPlayers,
  });
}

export { computeDrawRefund };

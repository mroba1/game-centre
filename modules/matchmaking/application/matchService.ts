import { GameStatus, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/modules/matchmaking/domain/gameStateMachine";
import { lockStake, refundStake } from "@/modules/wallet/application/walletService";
import { recordAuditLog } from "@/modules/audit/application/auditLog";
import { emitGameEvent } from "@/lib/realtime";
import { notifyUser } from "@/modules/notifications/application/notificationService";
import {
  getDefaultQuestionCount,
  getMatchApprovalSlaMinutes,
  getMaxConcurrentMatchesPerUser,
} from "@/lib/settings";

const ACTIVE_STATUSES: GameStatus[] = [
  "WAITING_FOR_OPPONENT",
  "OPPONENT_JOINED",
  "WAITING_FOR_ADMIN_APPROVAL",
  "STARTING",
  "IN_PROGRESS",
];

export class ConcurrentMatchLimitError extends Error {
  constructor() {
    super("You already have the maximum number of open/active matches");
    this.name = "ConcurrentMatchLimitError";
  }
}

export class CannotJoinOwnGameError extends Error {
  constructor() {
    super("You cannot join a match you created");
    this.name = "CannotJoinOwnGameError";
  }
}

export async function createGame(params: { userId: string; categoryId: string; stakeKobo: bigint }) {
  const activeCount = await prisma.game.count({
    where: { createdByUserId: params.userId, status: { in: ACTIVE_STATUSES } },
  });
  const players = await prisma.gamePlayer.count({
    where: { userId: params.userId, game: { status: { in: ACTIVE_STATUSES } } },
  });
  const limit = await getMaxConcurrentMatchesPerUser();
  if (activeCount + players >= limit) throw new ConcurrentMatchLimitError();

  const questionCount = await getDefaultQuestionCount();

  const game = await prisma.game.create({
    data: {
      categoryId: params.categoryId,
      createdByUserId: params.userId,
      stakeKobo: params.stakeKobo,
      questionCount,
      status: GameStatus.WAITING_FOR_OPPONENT,
      players: { create: { userId: params.userId } },
    },
  });

  try {
    await lockStake({ userId: params.userId, gameId: game.id, stakeKobo: params.stakeKobo });
  } catch (err) {
    // The nested `players: { create: ... } }` above already inserted a
    // GamePlayer row referencing this game — deleting the Game first (as
    // this used to do) violates that foreign key and throws an unhandled
    // Prisma error, masking the real error (e.g. insufficient funds) behind
    // a generic 500. Delete the child row first.
    await prisma.gamePlayer.deleteMany({ where: { gameId: game.id } });
    await prisma.game.delete({ where: { id: game.id } });
    throw err;
  }

  return game;
}

export async function cancelOwnOpenLobby(params: { userId: string; gameId: string }) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: params.gameId } });
  if (game.createdByUserId !== params.userId) throw new Error("Not your match");
  assertTransition(game.status, GameStatus.CANCELLED);

  await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.CANCELLED } });
  await refundStake({ userId: params.userId, gameId: game.id, stakeKobo: game.stakeKobo, reasonSuffix: "creator-cancelled" });
  await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.REFUNDED } });
  await emitGameEvent(game.id, "game:cancelled", { gameId: game.id });
}

export async function joinGame(params: { userId: string; gameId: string }) {
  const slaMinutes = await getMatchApprovalSlaMinutes();

  const game = await prisma.$transaction(async (tx) => {
    const [locked] = await tx.$queryRaw<{ id: string; status: GameStatus; createdByUserId: string; stakeKobo: bigint }[]>(
      Prisma.sql`SELECT id, status, "createdByUserId", "stakeKobo" FROM "Game" WHERE id = ${params.gameId} FOR UPDATE`
    );
    if (!locked) throw new Error("Match not found");
    if (locked.createdByUserId === params.userId) throw new CannotJoinOwnGameError();
    assertTransition(locked.status, GameStatus.OPPONENT_JOINED);

    await tx.gamePlayer.create({ data: { gameId: locked.id, userId: params.userId } });
    await tx.game.update({
      where: { id: locked.id },
      data: {
        status: GameStatus.WAITING_FOR_ADMIN_APPROVAL,
        approvalDeadline: new Date(Date.now() + slaMinutes * 60_000),
      },
    });

    return locked;
  });

  try {
    await lockStake({ userId: params.userId, gameId: game.id, stakeKobo: game.stakeKobo });
  } catch (err) {
    // The join transaction above already committed the GamePlayer row and
    // the WAITING_FOR_ADMIN_APPROVAL transition. If the stake lock fails
    // (e.g. insufficient funds), that must be undone — otherwise the match
    // proceeds as if both players staked when the joiner never actually did.
    await prisma.gamePlayer.deleteMany({ where: { gameId: game.id, userId: params.userId } });
    await prisma.game.update({
      where: { id: game.id },
      data: { status: GameStatus.WAITING_FOR_OPPONENT, approvalDeadline: null },
    });
    throw err;
  }

  await emitGameEvent(game.id, "game:opponent-joined", { gameId: game.id, opponentId: params.userId });
  await notifyUser({
    userId: game.createdByUserId,
    type: "OPPONENT_JOINED",
    title: "Opponent joined your match",
    body: "Someone joined your match — it's now waiting for admin approval.",
  });

  return prisma.game.findUniqueOrThrow({ where: { id: game.id } });
}

/**
 * Lazily expires a match whose admin-approval SLA has passed. Called on read
 * paths (GET /api/games/:id, the admin queue) in lieu of a standing cron
 * worker — acceptable at MVP volume, called out as a gap in
 * docs/architecture.md if match volume grows.
 */
export async function expireIfPastSla(gameId: string) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: gameId }, include: { players: true } });
  if (game.status !== GameStatus.WAITING_FOR_ADMIN_APPROVAL) return game;
  if (!game.approvalDeadline || game.approvalDeadline > new Date()) return game;

  await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.CANCELLED } });
  for (const player of game.players) {
    await refundStake({ userId: player.userId, gameId: game.id, stakeKobo: game.stakeKobo, reasonSuffix: "approval-sla-expired" });
  }
  const updated = await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.REFUNDED } });
  await emitGameEvent(game.id, "game:expired", { gameId: game.id });
  return updated;
}

export async function approveMatch(params: { gameId: string; adminId: string; ipAddress?: string }) {
  const game = await expireIfPastSla(params.gameId);
  if (game.status !== GameStatus.WAITING_FOR_ADMIN_APPROVAL) {
    throw new Error(`Cannot approve a match in status ${game.status}`);
  }

  assertTransition(game.status, GameStatus.STARTING);
  await prisma.game.update({
    where: { id: game.id },
    data: { status: GameStatus.STARTING, approvedByAdminId: params.adminId, startedAt: new Date() },
  });

  await recordAuditLog({
    actorUserId: params.adminId,
    action: "MATCH_APPROVED",
    targetType: "Game",
    targetId: game.id,
    ipAddress: params.ipAddress,
  });

  return game;
}

export async function cancelMatchByAdmin(params: { gameId: string; adminId: string; reason: string; ipAddress?: string }) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: params.gameId }, include: { players: true } });
  assertTransition(game.status, GameStatus.CANCELLED);

  await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.CANCELLED } });
  for (const player of game.players) {
    await refundStake({ userId: player.userId, gameId: game.id, stakeKobo: game.stakeKobo, reasonSuffix: "admin-cancelled" });
  }
  const updated = await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.REFUNDED } });

  await recordAuditLog({
    actorUserId: params.adminId,
    action: "MATCH_CANCELLED",
    targetType: "Game",
    targetId: game.id,
    reason: params.reason,
    ipAddress: params.ipAddress,
  });
  await emitGameEvent(game.id, "game:cancelled", { gameId: game.id, reason: params.reason });

  return updated;
}

/** Matches the user is currently part of that need their attention — not yet a bare "open lobby" listing, not yet finished. */
export async function listMyActiveMatches(userId: string) {
  return prisma.game.findMany({
    where: { status: { in: [...ACTIVE_STATUSES, GameStatus.DISPUTED] }, players: { some: { userId } } },
    include: { category: true, players: { include: { user: { select: { id: true, username: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listOpenLobbies(params: { categoryId?: string } = {}) {
  return prisma.game.findMany({
    where: { status: GameStatus.WAITING_FOR_OPPONENT, ...(params.categoryId ? { categoryId: params.categoryId } : {}) },
    include: { category: true, players: { include: { user: { select: { id: true, username: true } } } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPendingApprovals() {
  return prisma.game.findMany({
    where: { status: GameStatus.WAITING_FOR_ADMIN_APPROVAL },
    include: { category: true, players: { include: { user: { select: { id: true, username: true } } } } },
    orderBy: { approvalDeadline: "asc" },
  });
}

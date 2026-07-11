import { DisputeStatus, DisputeResolution, GameStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { assertTransition } from "@/modules/matchmaking/domain/gameStateMachine";
import { applyManualAdjustment } from "@/modules/wallet/application/walletService";
import { recordAuditLog } from "@/modules/audit/application/auditLog";
import { emitGameEvent } from "@/lib/realtime";
import { getDisputeWindowMinutes } from "@/lib/settings";
import { computePrizeDistribution } from "@/modules/matchmaking/domain/prizeDistribution";
import { getPlatformFeePercent, getLoserRefundPercent } from "@/lib/settings";

export class DisputeWindowClosedError extends Error {
  constructor() {
    super("The dispute window for this match has closed");
    this.name = "DisputeWindowClosedError";
  }
}
export class DisputeAlreadyExistsError extends Error {
  constructor() {
    super("A dispute has already been raised for this match");
    this.name = "DisputeAlreadyExistsError";
  }
}

export async function raiseDispute(params: { gameId: string; userId: string; reason: string }) {
  const game = await prisma.game.findUniqueOrThrow({ where: { id: params.gameId }, include: { dispute: true } });
  if (game.dispute) throw new DisputeAlreadyExistsError();

  const windowMinutes = await getDisputeWindowMinutes();
  if (!game.completedAt || Date.now() > game.completedAt.getTime() + windowMinutes * 60_000) {
    throw new DisputeWindowClosedError();
  }

  assertTransition(game.status, GameStatus.DISPUTED);

  const dispute = await prisma.$transaction(async (tx) => {
    const d = await tx.dispute.create({
      data: { gameId: game.id, raisedByUserId: params.userId, reason: params.reason },
    });
    await tx.game.update({ where: { id: game.id }, data: { status: GameStatus.DISPUTED } });
    return d;
  });

  await emitGameEvent(game.id, "game:disputed", { gameId: game.id });
  return dispute;
}

/**
 * Admin override path (see docs/architecture.md §3 winner determination —
 * admins never decide winners in the normal path, only here, and only with
 * a mandatory reason permanently logged).
 */
export async function resolveDispute(params: {
  disputeId: string;
  adminId: string;
  resolution: DisputeResolution;
  reason: string;
  ipAddress?: string;
}) {
  const dispute = await prisma.dispute.findUniqueOrThrow({
    where: { id: params.disputeId },
    include: { game: { include: { players: true } } },
  });
  if (dispute.status !== DisputeStatus.OPEN) throw new Error("Dispute already resolved");

  const game = dispute.game;
  const [a, b] = game.players;
  const feePercent = await getPlatformFeePercent();
  const loserRefundPercent = await getLoserRefundPercent();
  const { winnerPayoutKobo, loserRefundKobo } = computePrizeDistribution({
    stakeKobo: game.stakeKobo,
    feePercent,
    loserRefundPercent,
  });

  if (params.resolution === "VOIDED_REFUNDED") {
    // Claw back the original payout/refund and return both original stakes.
    if (game.winnerUserId) {
      const loser = [a, b].find((p) => p.userId !== game.winnerUserId)!;
      await applyManualAdjustment({
        userId: game.winnerUserId,
        amountKobo: -winnerPayoutKobo + game.stakeKobo,
        reason: `Dispute ${dispute.id} voided: claw back prize, restore original stake`,
        adminId: params.adminId,
        idempotencyKey: `dispute:${dispute.id}:clawback:${game.winnerUserId}`,
      });
      await applyManualAdjustment({
        userId: loser.userId,
        amountKobo: game.stakeKobo - loserRefundKobo,
        reason: `Dispute ${dispute.id} voided: restore full original stake`,
        adminId: params.adminId,
        idempotencyKey: `dispute:${dispute.id}:clawback:${loser.userId}`,
      });
    }
    assertTransition(GameStatus.DISPUTED, GameStatus.REFUNDED);
    await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.REFUNDED, winnerUserId: null } });
  } else if (params.resolution === "OVERTURNED") {
    // Net effect of the original (wrong) result on each balance was
    // +winnerPayoutKobo-stakeKobo for the winner and +loserRefundKobo-stakeKobo
    // for the loser (stake already deducted at lock time). Swapping the
    // outcome means applying exactly the delta between those two positions
    // to each player — a single adjustment per player, not a reverse-then-reapply.
    const currentWinner = game.winnerUserId;
    const newWinner = [a, b].find((p) => p.userId !== currentWinner)!.userId;
    if (currentWinner) {
      await applyManualAdjustment({
        userId: currentWinner,
        amountKobo: loserRefundKobo - winnerPayoutKobo,
        reason: `Dispute ${dispute.id} overturned: swap from winner to loser payout`,
        adminId: params.adminId,
        idempotencyKey: `dispute:${dispute.id}:swap:${currentWinner}`,
      });
    }
    await applyManualAdjustment({
      userId: newWinner,
      amountKobo: winnerPayoutKobo - loserRefundKobo,
      reason: `Dispute ${dispute.id} overturned: swap from loser to winner payout`,
      adminId: params.adminId,
      idempotencyKey: `dispute:${dispute.id}:swap:${newWinner}`,
    });
    assertTransition(GameStatus.DISPUTED, GameStatus.PAID);
    await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.PAID, winnerUserId: newWinner } });
  } else {
    assertTransition(GameStatus.DISPUTED, GameStatus.PAID);
    await prisma.game.update({ where: { id: game.id }, data: { status: GameStatus.PAID } });
  }

  const updated = await prisma.dispute.update({
    where: { id: dispute.id },
    data: {
      status: DisputeStatus.RESOLVED,
      resolution: params.resolution,
      resolutionReason: params.reason,
      resolvedByAdminId: params.adminId,
      resolvedAt: new Date(),
    },
  });

  await recordAuditLog({
    actorUserId: params.adminId,
    action: "DISPUTE_RESOLVED",
    targetType: "Dispute",
    targetId: dispute.id,
    afterState: { resolution: params.resolution },
    reason: params.reason,
    ipAddress: params.ipAddress,
  });

  await emitGameEvent(game.id, "game:dispute-resolved", { gameId: game.id, resolution: params.resolution });
  return updated;
}

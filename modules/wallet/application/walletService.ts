import { Prisma, WalletTransactionType } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export class InsufficientFundsError extends Error {
  constructor() {
    super("Insufficient available balance");
    this.name = "InsufficientFundsError";
  }
}

interface ApplyTransactionInput {
  tx: Prisma.TransactionClient;
  userId: string;
  type: WalletTransactionType;
  amountKobo: bigint; // signed
  idempotencyKey: string;
  relatedGameId?: string;
  relatedDepositId?: string;
  createdByAdminId?: string;
  reason?: string;
  /** Debit transactions on locked funds (stake consumption) also unlock the same amount. */
  unlockKobo?: bigint;
  /** Credit transactions that lock funds (stake creation) also increase lockedKobo. */
  lockKobo?: bigint;
}

/**
 * The single choke point every wallet mutation must go through (see
 * docs/architecture.md §3.3). Locks the wallet row, is idempotent via a
 * unique key, never lets balanceKobo go negative, and never allows a caller
 * to set balanceKobo to a literal value — only ever += amountKobo.
 */
async function applyWalletTransaction(input: ApplyTransactionInput) {
  const { tx, userId } = input;

  const existing = await tx.walletTransaction.findUnique({
    where: { idempotencyKey: input.idempotencyKey },
  });
  if (existing) return existing; // idempotent replay

  const [wallet] = await tx.$queryRaw<
    { id: string; balanceKobo: bigint; lockedKobo: bigint }[]
  >(Prisma.sql`SELECT id, "balanceKobo", "lockedKobo" FROM "Wallet" WHERE "userId" = ${userId} FOR UPDATE`);

  if (!wallet) throw new Error(`Wallet not found for user ${userId}`);

  const newBalance = wallet.balanceKobo + input.amountKobo;
  if (newBalance < 0n) throw new InsufficientFundsError();

  const newLocked = wallet.lockedKobo + (input.lockKobo ?? 0n) - (input.unlockKobo ?? 0n);
  if (newLocked < 0n) throw new Error("lockedKobo would go negative — accounting bug");

  const walletTransaction = await tx.walletTransaction.create({
    data: {
      walletId: wallet.id,
      type: input.type,
      amountKobo: input.amountKobo,
      balanceAfterKobo: newBalance,
      relatedGameId: input.relatedGameId,
      relatedDepositId: input.relatedDepositId,
      createdByAdminId: input.createdByAdminId,
      reason: input.reason,
      idempotencyKey: input.idempotencyKey,
    },
  });

  await tx.wallet.update({
    where: { id: wallet.id },
    data: { balanceKobo: newBalance, lockedKobo: newLocked },
  });

  return walletTransaction;
}

export async function creditDeposit(params: {
  userId: string;
  depositId: string;
  amountKobo: bigint;
  approvedByAdminId: string;
}) {
  return prisma.$transaction((tx) =>
    applyWalletTransaction({
      tx,
      userId: params.userId,
      type: WalletTransactionType.DEPOSIT,
      amountKobo: params.amountKobo,
      idempotencyKey: `deposit:${params.depositId}:credit`,
      relatedDepositId: params.depositId,
      createdByAdminId: params.approvedByAdminId,
    })
  );
}

/** Available balance = balanceKobo (locked funds are already subtracted from balanceKobo at lock time). */
export async function lockStake(params: { userId: string; gameId: string; stakeKobo: bigint }) {
  return prisma.$transaction((tx) =>
    applyWalletTransaction({
      tx,
      userId: params.userId,
      type: WalletTransactionType.STAKE_LOCKED,
      amountKobo: -params.stakeKobo,
      lockKobo: params.stakeKobo,
      idempotencyKey: `game:${params.gameId}:stake:${params.userId}`,
      relatedGameId: params.gameId,
    })
  );
}

export async function refundStake(params: {
  userId: string;
  gameId: string;
  stakeKobo: bigint;
  reasonSuffix: string; // e.g. "cancelled" | "draw" | "disputed-voided"
}) {
  return prisma.$transaction((tx) =>
    applyWalletTransaction({
      tx,
      userId: params.userId,
      type: WalletTransactionType.STAKE_REFUNDED,
      amountKobo: params.stakeKobo,
      unlockKobo: params.stakeKobo,
      idempotencyKey: `game:${params.gameId}:refund:${params.userId}:${params.reasonSuffix}`,
      relatedGameId: params.gameId,
    })
  );
}

export async function partialLoserRefund(params: { userId: string; gameId: string; refundKobo: bigint }) {
  return prisma.$transaction((tx) =>
    applyWalletTransaction({
      tx,
      userId: params.userId,
      type: WalletTransactionType.STAKE_REFUNDED,
      amountKobo: params.refundKobo,
      // the full original stake was locked; it's fully consumed here (unlocked)
      // even though only part of it is returned — the remainder became platform pool.
      unlockKobo: params.refundKobo,
      idempotencyKey: `game:${params.gameId}:loser-refund:${params.userId}`,
      relatedGameId: params.gameId,
    })
  );
}

export async function creditPrize(params: { userId: string; gameId: string; stakeKobo: bigint; payoutKobo: bigint }) {
  return prisma.$transaction((tx) =>
    applyWalletTransaction({
      tx,
      userId: params.userId,
      type: WalletTransactionType.PRIZE_WON,
      amountKobo: params.payoutKobo,
      // the winner's own locked stake is part of what's being unlocked/settled here
      unlockKobo: params.stakeKobo,
      idempotencyKey: `game:${params.gameId}:prize:${params.userId}`,
      relatedGameId: params.gameId,
    })
  );
}

export async function recordPlatformFee(params: { gameId: string; feeKobo: bigint }) {
  await prisma.platformRevenue.upsert({
    where: { id: `game-fee:${params.gameId}` },
    update: {},
    create: { id: `game-fee:${params.gameId}`, gameId: params.gameId, amountKobo: params.feeKobo },
  });
}

export async function applyManualAdjustment(params: {
  userId: string;
  amountKobo: bigint;
  reason: string;
  adminId: string;
  idempotencyKey: string;
}) {
  return prisma.$transaction((tx) =>
    applyWalletTransaction({
      tx,
      userId: params.userId,
      type: WalletTransactionType.MANUAL_ADJUSTMENT,
      amountKobo: params.amountKobo,
      idempotencyKey: params.idempotencyKey,
      createdByAdminId: params.adminId,
      reason: params.reason,
    })
  );
}

export async function getWalletSummary(userId: string) {
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  return {
    balanceKobo: wallet.balanceKobo,
    lockedKobo: wallet.lockedKobo,
    availableKobo: wallet.balanceKobo, // balanceKobo already nets out locked stakes
  };
}

export async function getTransactionHistory(userId: string, params: { take?: number; cursor?: string } = {}) {
  const wallet = await prisma.wallet.findUniqueOrThrow({ where: { userId } });
  return prisma.walletTransaction.findMany({
    where: { walletId: wallet.id },
    orderBy: { createdAt: "desc" },
    take: params.take ?? 20,
    ...(params.cursor ? { skip: 1, cursor: { id: params.cursor } } : {}),
  });
}

import { DepositStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { creditDeposit } from "@/modules/wallet/application/walletService";
import { recordAuditLog } from "@/modules/audit/application/auditLog";
import { notifyUser } from "@/modules/notifications/application/notificationService";
import { formatKobo } from "@/lib/money";

export async function createDeposit(params: { userId: string; amountKobo: bigint; paymentReference: string; receiptUrl?: string }) {
  return prisma.deposit.create({
    data: {
      userId: params.userId,
      amountKobo: params.amountKobo,
      paymentReference: params.paymentReference,
      receiptUrl: params.receiptUrl,
      status: DepositStatus.PENDING,
    },
  });
}

export async function listPendingDeposits() {
  return prisma.deposit.findMany({
    where: { status: DepositStatus.PENDING },
    include: { user: { select: { id: true, username: true, email: true } } },
    orderBy: { createdAt: "asc" },
  });
}

export class DepositNotPendingError extends Error {
  constructor() {
    super("Deposit is not pending review");
    this.name = "DepositNotPendingError";
  }
}

export async function approveDeposit(params: { depositId: string; adminId: string; ipAddress?: string }) {
  const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id: params.depositId } });
  if (deposit.status !== DepositStatus.PENDING) throw new DepositNotPendingError();

  // Approval and crediting happen together — no lingering "approved but
  // uncredited" state (see docs/architecture.md §3.2).
  await creditDeposit({
    userId: deposit.userId,
    depositId: deposit.id,
    amountKobo: deposit.amountKobo,
    approvedByAdminId: params.adminId,
  });

  const updated = await prisma.deposit.update({
    where: { id: deposit.id },
    data: { status: DepositStatus.COMPLETED, reviewedByAdminId: params.adminId, reviewedAt: new Date() },
  });

  await recordAuditLog({
    actorUserId: params.adminId,
    action: "DEPOSIT_APPROVED",
    targetType: "Deposit",
    targetId: deposit.id,
    beforeState: { status: deposit.status },
    afterState: { status: updated.status },
    ipAddress: params.ipAddress,
  });

  await notifyUser({
    userId: deposit.userId,
    type: "DEPOSIT_APPROVED",
    title: "Deposit approved",
    body: `${formatKobo(deposit.amountKobo)} has been credited to your wallet.`,
  });

  return updated;
}

export async function rejectDeposit(params: { depositId: string; adminId: string; reason: string; ipAddress?: string }) {
  const deposit = await prisma.deposit.findUniqueOrThrow({ where: { id: params.depositId } });
  if (deposit.status !== DepositStatus.PENDING) throw new DepositNotPendingError();

  const updated = await prisma.deposit.update({
    where: { id: deposit.id },
    data: {
      status: DepositStatus.REJECTED,
      rejectionReason: params.reason,
      reviewedByAdminId: params.adminId,
      reviewedAt: new Date(),
    },
  });

  await recordAuditLog({
    actorUserId: params.adminId,
    action: "DEPOSIT_REJECTED",
    targetType: "Deposit",
    targetId: deposit.id,
    beforeState: { status: deposit.status },
    afterState: { status: updated.status },
    reason: params.reason,
    ipAddress: params.ipAddress,
  });

  await notifyUser({
    userId: deposit.userId,
    type: "DEPOSIT_REJECTED",
    title: "Deposit rejected",
    body: params.reason,
  });

  return updated;
}

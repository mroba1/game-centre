import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export interface RecordAuditLogInput {
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  beforeState?: Prisma.InputJsonValue;
  afterState?: Prisma.InputJsonValue;
  reason?: string;
  ipAddress?: string | null;
}

/**
 * Append-only by convention: no service in this codebase updates or deletes
 * an AuditLog row. Every admin mutation (deposit decision, match
 * approve/cancel, balance adjustment, dispute resolution, suspend/ban) must
 * call this in the same application-service method that performs the action.
 */
export async function recordAuditLog(input: RecordAuditLogInput) {
  return prisma.auditLog.create({
    data: {
      actorUserId: input.actorUserId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      beforeState: input.beforeState,
      afterState: input.afterState,
      reason: input.reason,
      ipAddress: input.ipAddress ?? undefined,
    },
  });
}

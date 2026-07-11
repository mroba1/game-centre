"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/currentUser";
import { approveDeposit, rejectDeposit } from "@/modules/deposits/application/depositService";

export async function approveDepositAction(depositId: string) {
  const admin = await requireAdmin();
  await approveDeposit({ depositId, adminId: admin.id });
  revalidatePath("/admin/overview");
  revalidatePath("/admin/payments");
}

export async function rejectDepositAction(depositId: string) {
  const admin = await requireAdmin();
  // Quick-action default reason — the Payments queue supports a custom reason per deposit.
  await rejectDeposit({ depositId, adminId: admin.id, reason: "Rejected via operations overview queue" });
  revalidatePath("/admin/overview");
  revalidatePath("/admin/payments");
}

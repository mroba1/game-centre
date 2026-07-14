import { z } from "zod";

export const createDepositSchema = z.object({
  amountNaira: z.number().int().min(100).max(1_000_000),
  paymentReference: z.string().min(3).max(120),
  receiptUrl: z.string().url("Upload a receipt screenshot before submitting"),
});
export type CreateDepositInput = z.infer<typeof createDepositSchema>;

export const rejectDepositSchema = z.object({
  reason: z.string().min(5).max(500),
});

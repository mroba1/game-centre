import { z } from "zod";

export const createGameSchema = z.object({
  categoryId: z.string().min(1),
  stakeKobo: z.coerce.bigint().positive(),
});
export type CreateGameInput = z.infer<typeof createGameSchema>;

export const submitAnswerSchema = z.object({
  gameQuestionId: z.string().min(1),
  selectedOptionId: z.string().min(1).nullable(),
  clientNonce: z.string().uuid(),
  clientElapsedMs: z.number().int().min(0),
});
export type SubmitAnswerInput = z.infer<typeof submitAnswerSchema>;

export const raiseDisputeSchema = z.object({
  reason: z.string().min(10).max(1000),
});

export const resolveDisputeSchema = z.object({
  resolution: z.enum(["UPHELD_ORIGINAL", "OVERTURNED", "VOIDED_REFUNDED"]),
  reason: z.string().min(10).max(1000),
});

export const adjustBalanceSchema = z.object({
  amountKobo: z.coerce.bigint(),
  reason: z.string().min(10).max(500),
});

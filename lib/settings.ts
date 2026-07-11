import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  PLATFORM_FEE_PERCENT: "5",
  STAKE_TIERS_KOBO: "50000,100000,250000,500000",
  DEFAULT_QUESTION_COUNT: "10",
  MATCH_APPROVAL_SLA_MINUTES: "10",
  FORFEIT_GRACE_SECONDS: "60",
  DISPUTE_WINDOW_MINUTES: "15",
  LOSER_REFUND_PERCENT: "10",
  MAX_CONCURRENT_MATCHES_PER_USER: "3",
  QUESTION_TIME_LIMIT_SECONDS: "15",
} as const;

type SettingKey = keyof typeof DEFAULTS;

async function getRaw(key: SettingKey): Promise<string> {
  const row = await prisma.setting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key];
}

export async function getPlatformFeePercent(): Promise<number> {
  return Number(await getRaw("PLATFORM_FEE_PERCENT"));
}

export async function getLoserRefundPercent(): Promise<number> {
  return Number(await getRaw("LOSER_REFUND_PERCENT"));
}

export async function getStakeTiersKobo(): Promise<bigint[]> {
  const raw = await getRaw("STAKE_TIERS_KOBO");
  return raw.split(",").map((v) => BigInt(v.trim()));
}

export async function getDefaultQuestionCount(): Promise<number> {
  return Number(await getRaw("DEFAULT_QUESTION_COUNT"));
}

export async function getMatchApprovalSlaMinutes(): Promise<number> {
  return Number(await getRaw("MATCH_APPROVAL_SLA_MINUTES"));
}

export async function getForfeitGraceSeconds(): Promise<number> {
  return Number(await getRaw("FORFEIT_GRACE_SECONDS"));
}

export async function getDisputeWindowMinutes(): Promise<number> {
  return Number(await getRaw("DISPUTE_WINDOW_MINUTES"));
}

export async function getMaxConcurrentMatchesPerUser(): Promise<number> {
  return Number(await getRaw("MAX_CONCURRENT_MATCHES_PER_USER"));
}

export async function getQuestionTimeLimitSeconds(): Promise<number> {
  return Number(await getRaw("QUESTION_TIME_LIMIT_SECONDS"));
}

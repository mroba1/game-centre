export interface PrizeDistributionInput {
  stakeKobo: bigint; // each player stakes the same amount
  feePercent: number; // e.g. 5
  loserRefundPercent: number; // e.g. 10
}

export interface PrizeDistribution {
  poolKobo: bigint;
  platformFeeKobo: bigint;
  winnerPayoutKobo: bigint;
  loserRefundKobo: bigint;
}

/**
 * Pool = both stakes combined. Fee is a percentage of the pool, taken from
 * the winner's share. Loser gets a partial refund of their own stake.
 * See docs/architecture.md §9 item 12 — the worked example in the source
 * screenshots (₦200 fee on a ₦2,000 pool) doesn't reconcile against the
 * "5%" label shown alongside it; this implementation follows the labeled
 * 5%/10% rule rather than the inconsistent absolute figures. Flag to
 * product if the absolute figures were the intended source of truth.
 */
export function computePrizeDistribution({
  stakeKobo,
  feePercent,
  loserRefundPercent,
}: PrizeDistributionInput): PrizeDistribution {
  const poolKobo = stakeKobo * 2n;
  const platformFeeKobo = (poolKobo * BigInt(Math.round(feePercent * 100))) / 10000n;
  const winnerPayoutKobo = poolKobo - platformFeeKobo;
  const loserRefundKobo = (stakeKobo * BigInt(Math.round(loserRefundPercent * 100))) / 10000n;

  return { poolKobo, platformFeeKobo, winnerPayoutKobo, loserRefundKobo };
}

/** True draw: both stakes returned in full, no fee charged (see §9 default #1). */
export function computeDrawRefund(stakeKobo: bigint): bigint {
  return stakeKobo;
}

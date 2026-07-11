const NAIRA_FORMATTER = new Intl.NumberFormat("en-NG", {
  maximumFractionDigits: 0,
});

export function koboToNaira(kobo: bigint | number | string): number {
  return Number(kobo) / 100;
}

export function nairaToKobo(naira: number): bigint {
  return BigInt(Math.round(naira * 100));
}

export function formatKobo(kobo: bigint | number | string): string {
  return `₦${NAIRA_FORMATTER.format(koboToNaira(kobo))}`;
}

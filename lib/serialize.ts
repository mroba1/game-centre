/** JSON.stringify can't handle BigInt — this walks the object tree and stringifies them. */
export function serializeBigInt<T>(value: T): T {
  return JSON.parse(JSON.stringify(value, (_key, v) => (typeof v === "bigint" ? v.toString() : v)));
}

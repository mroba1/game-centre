import { randomBytes, createHash } from "crypto";

export function generateToken(): string {
  return randomBytes(32).toString("hex");
}

/** Verification tokens are stored hashed (like a password) — a DB read alone can't be used to impersonate a pending verification/reset. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

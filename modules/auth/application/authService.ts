import { hash } from "argon2";
import { prisma } from "@/lib/prisma";
import { generateToken, hashToken } from "@/lib/tokens";
import { emailSender } from "@/lib/email/sender";
import type { RegisterInput } from "@/lib/validation/auth";

const VERIFY_TTL_MS = 15 * 60_000;
const RESET_TTL_MS = 15 * 60_000;

export class EmailInUseError extends Error {
  constructor() {
    super("An account with this email already exists");
    this.name = "EmailInUseError";
  }
}
export class UsernameInUseError extends Error {
  constructor() {
    super("This username is taken");
    this.name = "UsernameInUseError";
  }
}

export async function registerUser(input: RegisterInput) {
  const email = input.email.toLowerCase();

  if (await prisma.user.findUnique({ where: { email } })) throw new EmailInUseError();
  if (await prisma.user.findUnique({ where: { username: input.username } })) throw new UsernameInUseError();

  const passwordHash = await hash(input.password);

  const user = await prisma.user.create({
    data: {
      email,
      username: input.username,
      passwordHash,
      wallet: { create: {} },
    },
  });

  await sendVerificationEmail(email);
  return user;
}

export async function sendVerificationEmail(email: string) {
  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      identifier: email,
      token: hashToken(token),
      purpose: "email-verify",
      expires: new Date(Date.now() + VERIFY_TTL_MS),
    },
  });

  const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/verify-email?token=${token}&email=${encodeURIComponent(email)}`;
  await emailSender.send(email, "Verify your Wav Workshop account", `<p>Click to verify: <a href="${url}">${url}</a></p>`);
}

export class InvalidOrExpiredTokenError extends Error {
  constructor() {
    super("This link is invalid or has expired");
    this.name = "InvalidOrExpiredTokenError";
  }
}

export async function verifyEmail(email: string, token: string) {
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, token: hashToken(token), purpose: "email-verify" },
  });
  if (!record || record.expires < new Date()) throw new InvalidOrExpiredTokenError();

  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { emailVerified: new Date() } }),
    prisma.verificationToken.delete({ where: { identifier_token: { identifier: email, token: record.token } } }),
  ]);
}

export async function requestPasswordReset(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return; // don't leak account existence

  // Invalidate any previously outstanding reset tokens for this identifier.
  await prisma.verificationToken.deleteMany({ where: { identifier: user.email, purpose: "password-reset" } });

  const token = generateToken();
  await prisma.verificationToken.create({
    data: {
      identifier: user.email,
      token: hashToken(token),
      purpose: "password-reset",
      expires: new Date(Date.now() + RESET_TTL_MS),
    },
  });

  const url = `${process.env.NEXTAUTH_URL ?? "http://localhost:3000"}/reset-password?token=${token}&email=${encodeURIComponent(user.email)}`;
  await emailSender.send(user.email, "Reset your Wav Workshop password", `<p>Click to reset: <a href="${url}">${url}</a></p>`);
}

export async function resetPassword(email: string, token: string, newPassword: string) {
  const record = await prisma.verificationToken.findFirst({
    where: { identifier: email, token: hashToken(token), purpose: "password-reset" },
  });
  if (!record || record.expires < new Date()) throw new InvalidOrExpiredTokenError();

  const passwordHash = await hash(newPassword);
  await prisma.$transaction([
    prisma.user.update({ where: { email }, data: { passwordHash } }),
    prisma.verificationToken.deleteMany({ where: { identifier: email, purpose: "password-reset" } }),
    // Force re-login everywhere: a stolen session shouldn't survive a reset.
    prisma.session.deleteMany({ where: { user: { email } } }),
  ]);
}

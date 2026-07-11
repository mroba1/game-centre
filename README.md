# Wav Workshop Game Center

Head-to-head, skill-based quiz betting platform. Users stake money against one opponent in a timed quiz match; the system determines the winner automatically and the platform takes a commission. See [`docs/architecture.md`](docs/architecture.md) for the full architecture, ERD, state machines, security review, and the list of business-rule assumptions this build made (tie-break rule, stake tiers, fee %, dispute window, etc.) — read that section before relying on this in production.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind v4 · shadcn/ui (Base UI) · Prisma 6 + PostgreSQL · Auth.js v5 (Credentials + JWT sessions) · Zod · React Hook Form · Ably-ready realtime with a poll-based fallback that needs no external service.

## Prerequisites

- Node.js 20+
- A PostgreSQL database (local via Docker/Postgres.app, or a managed instance — Neon, Supabase, Railway, etc.)

## Setup

```bash
npm install
cp .env.example .env
```

Edit `.env`:

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Yes | Postgres connection string. In production, put PgBouncer/Prisma Accelerate in front of it (see architecture doc §6) — a plain connection string is fine for local dev. |
| `NEXTAUTH_SECRET` | Yes | Random 32-byte secret. Generate with `npx auth secret` or `openssl rand -base64 32`. A dev value is already filled in by `.env.example` — replace it before deploying. |
| `NEXTAUTH_URL` | Yes | `http://localhost:3000` in dev. |
| `ABLY_API_KEY` | No | Leave empty to run on the poll-based realtime fallback (~1.2s latency, no external account needed). Set an [Ably](https://ably.com) key to enable low-latency push (see `lib/realtime`). |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | No | Credentials for the admin account created by the seed script. |

Then create the schema and seed data:

```bash
npx prisma migrate deploy   # applies prisma/migrations/0001_init
npx prisma db seed          # categories, sample questions, settings, admin user
npm run dev
```

Sign in to the admin console at `/admin/overview` with `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` (defaults: `admin@wavworkshop.local` / `ChangeMe123!` — change these before any real deployment). Regular users register at `/register`; in this dev build, verification/reset emails are logged to the server console instead of actually sent (see `lib/email/sender.ts` — swap in a real provider there when ready).

## What's implemented

- **Auth**: register, email verification, login, password reset, role-based route guards, immediate session revocation on suspend/ban.
- **Wallet**: ledger-based (`WalletTransaction` is the source of truth), idempotent, atomic row-locked updates — see `modules/wallet/application/walletService.ts`.
- **Deposits**: user request → admin approve/reject queue, credits the wallet atomically on approval.
- **Matchmaking**: create/browse/join lobbies, admin-approval gate with SLA auto-expiry, full state machine (`modules/matchmaking/domain/gameStateMachine.ts`) that makes illegal transitions structurally impossible.
- **Quiz engine**: server-authoritative question timing/scoring, anti-replay (unique constraint per player+question), automatic winner determination and payout on completion (`modules/quiz/application/quizEngine.ts`).
- **Disputes**: raise within a configurable window, admin resolution (uphold/overturn/void) with wallet reversal and a mandatory logged reason.
- **Admin console**: operations overview, payments queue, match approval queue, user moderation (suspend/ban/balance adjustment), question bank CRUD, revenue, full audit log.
- **Audit log**: every admin financial/override action is permanently recorded with before/after state and a reason.

## What's simplified vs. the architecture doc

- **Realtime**: ships with a durable `GameEvent` log + ~1.2s client polling by default, which needs zero external services to run. `lib/realtime` is written as a swappable port — set `ABLY_API_KEY` to also push over Ably, but the client currently reads via polling either way; wiring the client to subscribe directly to Ably (for true low-latency push) is a follow-up if you need it.
- **Disconnect/forfeit**: handled implicitly — a disconnected player simply doesn't answer remaining questions (each question has a server-enforced deadline), rather than a dedicated presence-based forfeit flow.
- **Withdrawals, 2FA, KYC**: out of scope per the original spec's "future features" list — the schema and admin-moderation pieces they'd hang off of are already in place.
- **Ranking**: `lib/stats.ts` uses a simple win-count-derived tier (Bronze → Diamond III) as a placeholder, not a real rating/Elo system.

## Project structure

```
app/(auth)/        Public auth pages (login, register, verify, reset)
app/(app)/          Authenticated user shell + pages
app/(admin)/admin/   Admin console
app/api/             Route handlers — thin, delegate to modules/*/application
modules/*/domain          Framework-agnostic business rules (state machines, scoring, prize math)
modules/*/application     Use-case services (what route handlers call)
modules/*/infrastructure  Reserved for swappable adapters (payment providers, etc.)
lib/                 Cross-cutting: prisma client, auth config, wallet money helpers, realtime, settings
prisma/schema.prisma  Full data model — see docs/architecture.md §2.4 for the ERD and rationale
```

## Commands

```bash
npm run dev      # start dev server
npm run build    # production build (also runs typecheck)
npm run lint     # eslint
npx prisma studio   # browse the database
```

## Testing

Not yet implemented — the architecture doc (§5) specifies Vitest for unit/integration and Playwright for E2E, with the wallet ledger and match state machine called out as the highest-priority coverage given they're the modules where a bug directly costs money.

import { prisma } from "@/lib/prisma";
import { AblyPublisher } from "./ably-publisher";
import { NoopPublisher } from "./noop-publisher";
import type { RealtimePublisher } from "./publisher";

const transport: RealtimePublisher = process.env.ABLY_API_KEY
  ? new AblyPublisher()
  : new NoopPublisher();

/**
 * Persists the event (durable rewind log) and best-effort pushes it over the
 * realtime transport. Callers should never call the transport directly.
 */
export async function emitGameEvent(gameId: string, type: string, payload: unknown) {
  await prisma.gameEvent.create({ data: { gameId, type, payload: payload as object } });
  await transport.publish(`game:${gameId}`, type, payload);
}

export async function emitUserEvent(userId: string, type: string, payload: unknown) {
  await transport.publish(`user:${userId}`, type, payload);
}

export { transport as realtimePublisher };

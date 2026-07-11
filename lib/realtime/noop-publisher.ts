import type { RealtimePublisher } from "./publisher";

/**
 * Used when ABLY_API_KEY isn't configured (local dev without an Ably account).
 * Events are still durably written to GameEvent by the caller before publish()
 * is invoked, so the app degrades to poll-based sync instead of push, rather
 * than failing outright.
 */
export class NoopPublisher implements RealtimePublisher {
  async publish(): Promise<void> {
    // Intentionally a no-op — GameEvent persistence is the source of truth.
  }
}

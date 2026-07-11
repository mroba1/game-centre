/**
 * Dependency-inversion seam for realtime transport (see docs/architecture.md §2.7).
 * Every event is always persisted to GameEvent (the durable source of truth /
 * rewind mechanism); publish() is a best-effort low-latency push on top.
 */
export interface RealtimePublisher {
  publish(channel: string, event: string, data: unknown): Promise<void>;
}

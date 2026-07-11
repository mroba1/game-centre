import Ably from "ably";
import type { RealtimePublisher } from "./publisher";

let restClient: Ably.Rest | null = null;

function getClient(): Ably.Rest {
  if (!restClient) {
    restClient = new Ably.Rest({ key: process.env.ABLY_API_KEY });
  }
  return restClient;
}

export class AblyPublisher implements RealtimePublisher {
  async publish(channel: string, event: string, data: unknown): Promise<void> {
    await getClient().channels.get(channel).publish(event, data);
  }
}

import { after } from "next/server";

import "server-only";
import { showChannelName, WORLD_CHANGED_EVENT } from "@/lib/pusher/channels";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import type { WorldChangedEvent } from "@/types/world";

let lastSeq = 0;

/** Монотонний у межах інстансу; клієнт лише відкидає повтор того ж seq. */
const nextSeq = () => (lastSeq = Math.max(Date.now(), lastSeq + 1));

export function publishWorldChanged(campaignId: string, mapId: string | null): void {
  const event: WorldChangedEvent = { campaignId, mapId, seq: nextSeq() };

  after(() => safePusherTrigger(pusherServer, showChannelName(campaignId), WORLD_CHANGED_EVENT, event, { action: "world changed" }));
}

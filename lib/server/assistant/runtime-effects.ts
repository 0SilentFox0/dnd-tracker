import { z } from "zod";

import { CONTENT_EFFECT_HANDLERS } from "./actions/content-effects";
import type { EffectHandlers } from "./effects";
import type { JsonValue } from "./types";

import { pusherServer } from "@/lib/pusher/server";
import { runShowMediaCleanup } from "@/lib/server/show/media-effects";
import { clearShowBattle,publishShow } from "@/lib/server/show/show-store";
import type { ShowState } from "@/types/show";

const battlePublication = z.object({ battleMessages: z.array(z.object({ channel: z.string(), event: z.string(), payload: z.unknown() })) });

const left = z.object({ campaignId: z.string(), battleId: z.string(), battleLeftActive: z.literal(true) });

async function contentEffect(kind: "invalidate" | "media-cleanup", payload: JsonValue, key: string) {
  const handler = CONTENT_EFFECT_HANDLERS[kind];

  if (!handler) throw new Error("Missing content effect handler");

  await handler(payload, key);
}

/** Route by durable payload shape; do not overwrite a domain's handler by spreading. */
export const ASSISTANT_EFFECT_HANDLERS: EffectHandlers = {
  invalidate: async (payload, key) => {
    const battle = left.safeParse(payload);

    if (battle.success) { await clearShowBattle(battle.data.campaignId, battle.data.battleId, { strict: true });

 return; }

    await contentEffect("invalidate", payload, key);
  },
  publish: async payload => {
    const battle = battlePublication.safeParse(payload);

    if (battle.success) {
      for (const m of battle.data.battleMessages) {
        await pusherServer.trigger(m.channel, m.event, m.payload);
      }

      return;
    }

    const show = z.object({ campaignId: z.string(), show: z.object({}).passthrough() }).parse(payload);

    await publishShow(show.campaignId, show.show as unknown as ShowState, { strict: true });
  },
  "media-cleanup": async (payload, key) => {
    if (payload && typeof payload === "object" && !Array.isArray(payload) && "urls" in payload) { await runShowMediaCleanup(payload);

 return; }

    await contentEffect("media-cleanup", payload, key);
  },
};

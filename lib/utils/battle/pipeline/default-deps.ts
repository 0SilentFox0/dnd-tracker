import { after } from "next/server";

import type { PipelineDeps } from "./run-battle-mutation";

import { prisma } from "@/lib/db";
import { pusherServer } from "@/lib/pusher";
import { createClient } from "@/lib/supabase/server";
import { BATTLE_RATE_LIMITS, checkRateLimit } from "@/lib/utils/api/rate-limit";
import { loadBattle, loadKnowledgeEvents, loadRecentEvents, saveBattle } from "@/lib/utils/battle/store";
import { summarizeKnowledge } from "@/lib/utils/battle/view/knowledge";
import { safePusherTrigger } from "@/lib/utils/pusher/safe-trigger";

export const defaultPipelineDeps: PipelineDeps = {
  async getUserId() {
    const supabase = await createClient();

    const { data } = await supabase.auth.getClaims();

    return data?.claims?.sub ?? null;
  },
  rateLimit: ({ userId, scope, battleId }) =>
    checkRateLimit({ userId, scope, battleId, ...BATTLE_RATE_LIMITS[scope] }),
  loadBattle: (args) => loadBattle(prisma, args),
  saveBattle: (before, outcome) => saveBattle(prisma, before, outcome),
  loadRecentEvents: (battleId, limit) => loadRecentEvents(prisma, battleId, limit),
  loadKnowledge: async (battleId) => summarizeKnowledge(await loadKnowledgeEvents(prisma, battleId)),
  publish(messages) {
    after(() =>
      Promise.all(
        messages.map((m) =>
          safePusherTrigger(pusherServer, m.channel, m.event, m.payload, { action: "battle mutation" }),
        ),
      ),
    );
  },
};

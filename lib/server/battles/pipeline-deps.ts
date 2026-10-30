import { after } from "next/server";
import type { Prisma } from "@prisma/client";

import type { BattleReadDeps } from "./read-battle";

import { getSessionUserId } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { safePusherTrigger } from "@/lib/pusher/safe-trigger";
import { pusherServer } from "@/lib/pusher/server";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import { afterContentCommit, createScopedDatabase } from "@/lib/server/content/write-context";
import { clearShowBattle } from "@/lib/server/show/show-store";
import { BATTLE_RATE_LIMITS, checkRateLimit } from "@/lib/utils/api/rate-limit";
import type { PipelineDeps } from "@/lib/utils/battle/pipeline/run-battle-mutation";
import {
  loadAllEvents,
  loadBattle,
  loadBattleAccess,
  loadEventsBefore,
  loadKnowledgeEvents,
  loadRecentEvents,
  saveBattle,
} from "@/lib/utils/battle/store";
import { summarizeKnowledge } from "@/lib/utils/battle/view/knowledge";

function recheckAccessWith(db: Parameters<typeof loadBattleAccess>[0]): PipelineDeps["recheckAccess"] {
  return async args => {
    const access = await loadBattleAccess(db, args);

    return access && { isMember: access.isMember, isDM: access.isDM };
  };
}

export const defaultPipelineDeps: PipelineDeps = {
  withWrite: (campaignId, callback) => withCampaignContentWrite(campaignId, callback),
  recheckAccess: recheckAccessWith(prisma),
  getUserId: getSessionUserId,
  rateLimit: ({ userId, scope, battleId }) =>
    checkRateLimit({ userId, scope, battleId, ...BATTLE_RATE_LIMITS[scope] }),
  loadBattle: (args) => loadBattle(prisma, args),
  saveBattle: (before, outcome, write) => saveBattle(prisma, before, outcome, write),
  loadRecentEvents: (battleId, limit) => loadRecentEvents(prisma, battleId, limit),
  loadKnowledge: async (battleId) => summarizeKnowledge(await loadKnowledgeEvents(prisma, battleId)),
  onLeftActive(campaignId, battleId) {
    afterContentCommit(() => after(() => clearShowBattle(campaignId, battleId)));
  },
  publish(messages) {
    afterContentCommit(() => after(() =>
      Promise.all(
        messages.map((m) =>
          safePusherTrigger(pusherServer, m.channel, m.event, m.payload, { action: "battle mutation" }),
        ),
      ),
    ));
  },
};

export const defaultReadDeps: BattleReadDeps = {
  getUserId: getSessionUserId,
  loadAccess: (args) => loadBattleAccess(prisma, args),
  loadEventsBefore: (battleId, page) => loadEventsBefore(prisma, battleId, page),
  loadAllEvents: (battleId) => loadAllEvents(prisma, battleId),
  loadParticipants: async (args) => (await loadBattle(prisma, args))?.participants ?? [],
};

/** All store helpers, including saveBattle's transaction, reuse the intent connection. */
export function scopedPipelineDeps(tx: Prisma.TransactionClient): PipelineDeps {
  const db = createScopedDatabase(tx) as unknown as Parameters<typeof loadBattle>[0];

  return {
    ...defaultPipelineDeps,
    loadBattle: args => loadBattle(db, args),
    recheckAccess: recheckAccessWith(db),
    saveBattle: (before, outcome, write) => saveBattle(db, before, outcome, write),
    loadRecentEvents: (battleId, limit) => loadRecentEvents(db, battleId, limit),
    loadKnowledge: async battleId => summarizeKnowledge(await loadKnowledgeEvents(db, battleId)),
  };
}

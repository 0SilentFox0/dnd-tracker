import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import "server-only";
import { AI_LIMITS } from "@/lib/constants/ai";
import { BattleStatus } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { loadBattle } from "@/lib/utils/battle/store";

export const getBattleStateTool = defineTool({
  name: "get_battle_state",
  title: "Стан бою",
  description: "State of a battle (the active one when battleId is omitted): round, turn order, participants with side, HP, AC, status, and the last events.",
  input: z.object({ battleId: z.string().min(1).optional() }),
  handler: async (ctx, { battleId }) => {
    const id =
      battleId ??
      (await prisma.battleScene.findFirst({ where: { campaignId: ctx.campaignId, status: BattleStatus.ACTIVE }, orderBy: { startedAt: "desc" }, select: { id: true } }))?.id;

    if (!id) return "Активного бою немає";

    const battle = await loadBattle(prisma, { battleId: id, campaignId: ctx.campaignId, userId: ctx.userId });

    if (!battle) throw new AiToolError(`Бою ${id} немає в цій кампанії`);

    const events = await prisma.battleEvent.findMany({
      where: { battleId: id, cancelledAt: null },
      orderBy: { seq: "desc" },
      take: AI_LIMITS.battleEvents,
      select: { round: true, resultText: true },
    });

    return {
      name: battle.meta.name,
      status: battle.scene.status,
      round: battle.scene.round,
      currentTurnIndex: battle.scene.turnIndex,
      participants: battle.participants.map((p) => ({
        name: p.basicInfo.name,
        side: p.basicInfo.side,
        hp: `${p.combatStats.currentHp}/${p.combatStats.maxHp}`,
        ac: p.combatStats.armorClass,
        status: p.combatStats.status,
      })),
      lastEvents: events.reverse().map((e) => `Р${e.round}: ${e.resultText}`),
    };
  },
});

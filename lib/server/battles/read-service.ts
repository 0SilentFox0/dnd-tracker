import "server-only";
import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { BattleStatus } from "@/lib/constants/battle";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/translator";
import { ContentError } from "@/lib/server/content/errors";
import { formatBattleLog } from "@/lib/utils/battle/log/lines";
import { loadBattle } from "@/lib/utils/battle/store";
import type { LogLine } from "@/types/text";

/** Legacy read remains available on ai; no new write transport is activated here. */
export async function readLegacyBattleState(ctx: { campaignId: string; userId: string }, battleId?: string) {
    const id =
      battleId ??
      (await prisma.battleScene.findFirst({ where: { campaignId: ctx.campaignId, status: BattleStatus.ACTIVE }, orderBy: { startedAt: "desc" }, select: { id: true } }))?.id;

    if (!id) return "No active battle";

    const battle = await loadBattle(prisma, { battleId: id, campaignId: ctx.campaignId, userId: ctx.userId });

    if (!battle) throw new ContentError(API_ERRORS.BATTLE_NOT_IN_CAMPAIGN, 404, undefined, { id });

    if (!battle.isMember || !battle.isDM) throw new ContentError(API_ERRORS.DM_ONLY, 403);

    const events = await prisma.battleEvent.findMany({
      where: { battleId: id, cancelledAt: null },
      orderBy: { seq: "desc" },
      take: AI_LIMITS.battleEvents,
      select: { round: true, resultText: true, details: true },
    });

    const t = await getTranslator("en");

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
      lastEvents: events.reverse().map((e) => `R${e.round}: ${formatBattleLog(t, { resultText: e.resultText, log: (e.details as { log?: LogLine[] } | null)?.log })}`),
    };
}

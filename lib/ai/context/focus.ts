import "server-only";
import { AiToolError } from "@/lib/ai/tools/define";
import { loadPageForAi } from "@/lib/ai/tools/scenario-read";
import { ACTIVE_CHARACTER } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import type { AiFocus } from "@/types/ai";

/** Queries always bind nested ids to the authorized campaign. No unscoped existence lookup. */
export async function loadFocus(campaignId: string, focus: AiFocus) {
  if (focus.kind === "campaign") return { kind: "campaign" as const };

  if (focus.kind === "character") {
    const character = await prisma.character.findFirst({ where: { id: focus.characterId, campaignId, ...ACTIVE_CHARACTER }, select: { id: true, name: true, level: true, class: true, race: true, armorClass: true } });

    return character ? { kind: "character" as const, character } : { kind: "unavailable" as const };
  }

  if (focus.kind === "battle") {
    const battle = await prisma.battleScene.findFirst({ where: { id: focus.battleId, campaignId }, select: { id: true, name: true, status: true, currentRound: true, currentTurnIndex: true, version: true, rules: true } });

    return battle ? { kind: "battle" as const, battle } : { kind: "unavailable" as const };
  }

  try {
    const page = await loadPageForAi(campaignId, focus.pageId);

    const section = focus.sectionId ? page.content.sections.find(s => s.id === focus.sectionId) : null;

    if (focus.sectionId && !section) return { kind: "unavailable" as const };

    if (focus.rowIds?.some(id => !(section ? [section] : page.content.sections).some(s => s.rows.some(r => r.id === id)))) return { kind: "unavailable" as const };

    return { kind: "scenario" as const, page, focus };
  } catch (e) {
    if (e instanceof AiToolError) return { kind: "unavailable" as const };

    throw e;
  }
}

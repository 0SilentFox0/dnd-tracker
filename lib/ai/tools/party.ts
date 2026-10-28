import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import "server-only";
import { characterNotInCampaignMessage } from "@/lib/constants/api-errors";
import { ACTIVE_CHARACTER, CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { readContent } from "@/lib/server/scenario/page-store";
import { docText } from "@/lib/utils/scenario/doc";

const PARTY_SELECT = { id: true, name: true, level: true, class: true, race: true, armorClass: true, notes: true } as const;

export type PartyMember = { id: string; name: string; level: number; class: string; race: string; armorClass: number; notes: string | null };

export async function partySummary(campaignId: string, limit?: number): Promise<PartyMember[]> {
  return prisma.character.findMany({ where: { campaignId, type: CharacterType.PLAYER, ...ACTIVE_CHARACTER }, select: PARTY_SELECT, orderBy: { name: "asc" }, ...(limit !== undefined && { take: limit }) });
}

export const getPartyTool = defineTool({
  name: "get_party",
  scopes: ["ai"],
  title: "Партія",
  description: "Player heroes of the campaign: id, name, level, class, race, AC, DM notes.",
  input: z.object({}),
  handler: async (ctx) => partySummary(ctx.campaignId),
});

export const readCharacterTool = defineTool({
  name: "read_character",
  scopes: ["ai"],
  title: "Лист персонажа",
  description: "Full character sheet (player hero or NPC hero): ability scores, AC, HP-related stats, goals, DM notes and the hero biography from the scenario.",
  input: z.object({ id: z.string().min(1) }),
  handler: async (ctx, { id }) => {
    const c = await prisma.character.findFirst({
      where: { id, campaignId: ctx.campaignId, ...ACTIVE_CHARACTER },
      select: {
        ...PARTY_SELECT,
        type: true,
        subclass: true,
        alignment: true,
        background: true,
        strength: true,
        dexterity: true,
        constitution: true,
        intelligence: true,
        wisdom: true,
        charisma: true,
        speed: true,
        morale: true,
        goals: true,
      },
    });

    if (!c) throw new AiToolError(characterNotInCampaignMessage(id));

    const bio = await prisma.scenarioPage.findFirst({ where: { campaignId: ctx.campaignId, characterId: id, kind: "hero" }, select: { content: true } });

    const biography = bio
      ? readContent(bio.content)
          .sections.map((s) => `${s.title}: ${s.rows.map((r) => docText(r.story)).join(" ")}`)
          .join("\n")
      : null;

    return { ...c, biography };
  },
});

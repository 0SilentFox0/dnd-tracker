import { z } from "zod";

import { AiToolError, defineTool } from "./define";
import { type WfrpCareerRef, type WfrpHeroView, wfrpHeroView } from "./wfrp-view";

import "server-only";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { ACTIVE_CHARACTER, CharacterType } from "@/lib/constants/characters";
import { prisma } from "@/lib/db";
import { loadRules } from "@/lib/server/campaigns/rules";
import { readContent } from "@/lib/server/scenario/page-store";
import type { Ruleset } from "@/lib/utils/rules/schema";
import { systemKeyOf } from "@/lib/utils/rules/systems";
import { docText } from "@/lib/utils/scenario/doc";

const PARTY_SELECT = { id: true, name: true, level: true, class: true, race: true, armorClass: true, notes: true } as const;

const WFRP_PARTY_SELECT = { id: true, name: true, level: true, race: true, notes: true, characteristics: true } as const;

export type PartyMember = { id: string; name: string; level: number; race: string; notes: string | null } & ({ class: string; armorClass: number } | WfrpHeroView);

const loadCareers = (campaignId: string): Promise<WfrpCareerRef[]> => prisma.career.findMany({ where: { campaignId }, select: { id: true, name: true, tiers: true } });

export async function partySummary(campaignId: string, limit?: number, rules?: Ruleset): Promise<PartyMember[]> {
  const resolved = rules ?? (await loadRules(campaignId));

  const query = { where: { campaignId, type: CharacterType.PLAYER, ...ACTIVE_CHARACTER }, orderBy: { name: "asc" as const }, ...(limit !== undefined && { take: limit }) };

  if (systemKeyOf(resolved) !== "wfrp") return prisma.character.findMany({ ...query, select: PARTY_SELECT });

  const [rows, careers] = await Promise.all([prisma.character.findMany({ ...query, select: WFRP_PARTY_SELECT }), loadCareers(campaignId)]);

  return rows.map(({ characteristics, ...c }) => ({ ...c, ...wfrpHeroView({ characteristics }, careers) }));
}

export const getPartyTool = defineTool({
  name: "get_party",
  scopes: ["ai"],
  title: "Party",
  description: "Player heroes of the campaign: id, name, level, class, race, AC, DM notes (Grim d100 campaigns: race, career and tier, characteristics, Wounds and Fate instead of class and AC).",
  input: z.object({}),
  handler: async (ctx) => partySummary(ctx.campaignId),
});

export const readCharacterTool = defineTool({
  name: "read_character",
  scopes: ["ai"],
  title: "Character sheet",
  description: "Full character sheet (player hero or NPC hero): ability scores, AC, HP-related stats, goals, DM notes and the hero biography from the scenario. Grim d100: characteristics, career, Wounds and Fate instead of ability scores and AC.",
  input: z.object({ id: z.string().min(1) }),
  handler: async (ctx, { id }) => {
    const wfrp = systemKeyOf(await loadRules(ctx.campaignId)) === "wfrp";

    const common = { type: true, subclass: true, alignment: true, background: true, goals: true } as const;

    const c = await prisma.character.findFirst({
      where: { id, campaignId: ctx.campaignId, ...ACTIVE_CHARACTER },
      select: wfrp
        ? { ...WFRP_PARTY_SELECT, ...common }
        : { ...PARTY_SELECT, ...common, strength: true, dexterity: true, constitution: true, intelligence: true, wisdom: true, charisma: true, speed: true, morale: true },
    });

    if (!c) throw new AiToolError(API_ERRORS.CHARACTER_NOT_IN_CAMPAIGN, { id });

    const bio = await prisma.scenarioPage.findFirst({ where: { campaignId: ctx.campaignId, characterId: id, kind: "hero" }, select: { content: true } });

    const biography = bio
      ? readContent(bio.content)
          .sections.map((s) => `${s.title}: ${s.rows.map((r) => docText(r.story)).join(" ")}`)
          .join("\n")
      : null;

    if (wfrp && "characteristics" in c) {
      const { characteristics, ...rest } = c;

      return { ...rest, ...wfrpHeroView({ characteristics }, await loadCareers(ctx.campaignId)), biography };
    }

    return { ...c, biography };
  },
});

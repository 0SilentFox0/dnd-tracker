import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import "server-only";
import { getCachedRaces, getCachedSpells, getCachedUnits } from "@/lib/cache/reference-data";
import { AI_LIMITS } from "@/lib/constants/ai";
import { API_ERRORS } from "@/lib/constants/api-errors";
import { prisma } from "@/lib/db";
import type { Locale } from "@/lib/i18n/config";
import { getTranslator } from "@/lib/i18n/translator";
import { abilityRegistryOf, flowSegments, linesText } from "@/lib/utils/abilities/segments";

const kindSchema = z.enum(["unit", "spell", "race", "skill", "artifact"]);

type Kind = z.infer<typeof kindSchema>;

type Entry = { id: string; name: string } & Record<string, unknown>;

// skills and artifacts are not in the reference cache
async function listOf(campaignId: string, kind: Kind, locale: Locale): Promise<Entry[]> {
  if (kind === "unit") {
    const units = await getCachedUnits(campaignId);

    const registry = abilityRegistryOf(await getTranslator(locale));

    return units.map((u) => ({ ...u, abilitySummary: linesText(registry, (u.abilitySummary ?? []).map(flowSegments)) })) as unknown as Entry[];
  }

  if (kind === "spell") return (await getCachedSpells(campaignId)) as unknown as Entry[];

  if (kind === "race") return (await getCachedRaces(campaignId)) as unknown as Entry[];

  if (kind === "skill") return prisma.skill.findMany({ where: { campaignId }, select: { id: true, name: true } });

  return prisma.artifact.findMany({ where: { campaignId }, select: { id: true, name: true } });
}

async function findEntry(campaignId: string, kind: Kind, id: string, locale: Locale): Promise<Entry | null> {
  if (kind === "skill") return (await prisma.skill.findFirst({ where: { id, campaignId } })) as Entry | null;

  if (kind === "artifact") return (await prisma.artifact.findFirst({ where: { id, campaignId } })) as Entry | null;

  return (await listOf(campaignId, kind, locale)).find((e) => e.id === id) ?? null;
}

export const searchReferenceTool = defineTool({
  name: "search_reference",
  scopes: ["ai"],
  title: "Reference search",
  description: "Search the campaign reference by name: units, spells, races, skills, artifacts. Returns id and name; use read_reference for details.",
  input: z.object({ kind: kindSchema, query: z.string().trim().min(1).max(60) }),
  handler: async (ctx, { kind, query }) => {
    const q = query.toLocaleLowerCase("uk");

    return (await listOf(ctx.campaignId, kind, ctx.locale))
      .filter((e) => e.name.toLocaleLowerCase("uk").includes(q))
      .slice(0, AI_LIMITS.searchHits)
      .map(({ id, name }) => ({ id, name }));
  },
});

export const readReferenceTool = defineTool({
  name: "read_reference",
  scopes: ["ai"],
  title: "Reference entry",
  description: "Full reference entry (unit stats and abilities, spell effects, race traits, skill or artifact description) by kind and id.",
  input: z.object({ kind: kindSchema, id: z.string().min(1) }),
  handler: async (ctx, { kind, id }) => {
    const entry = await findEntry(ctx.campaignId, kind, id, ctx.locale);

    if (!entry) throw new AiToolError(API_ERRORS.REFERENCE_ENTRY_MISSING, { kind, id });

    return entry;
  },
});

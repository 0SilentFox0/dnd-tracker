import { z } from "zod";

import { AiToolError, defineTool } from "./define";

import "server-only";
import { getCachedRaces, getCachedSpells, getCachedUnits } from "@/lib/cache/reference-data";
import { AI_LIMITS } from "@/lib/constants/ai";
import { prisma } from "@/lib/db";

const kindSchema = z.enum(["unit", "spell", "race", "skill", "artifact"]);

type Kind = z.infer<typeof kindSchema>;

type Entry = { id: string; name: string } & Record<string, unknown>;

// skills and artifacts are not in the reference cache
async function listOf(campaignId: string, kind: Kind): Promise<Entry[]> {
  if (kind === "unit") return (await getCachedUnits(campaignId)) as unknown as Entry[];

  if (kind === "spell") return (await getCachedSpells(campaignId)) as unknown as Entry[];

  if (kind === "race") return (await getCachedRaces(campaignId)) as unknown as Entry[];

  if (kind === "skill") return prisma.skill.findMany({ where: { campaignId }, select: { id: true, name: true } });

  return prisma.artifact.findMany({ where: { campaignId }, select: { id: true, name: true } });
}

async function findEntry(campaignId: string, kind: Kind, id: string): Promise<Entry | null> {
  if (kind === "skill") return (await prisma.skill.findFirst({ where: { id, campaignId } })) as Entry | null;

  if (kind === "artifact") return (await prisma.artifact.findFirst({ where: { id, campaignId } })) as Entry | null;

  return (await listOf(campaignId, kind)).find((e) => e.id === id) ?? null;
}

export const searchReferenceTool = defineTool({
  name: "search_reference",
  title: "Пошук у довіднику",
  description: "Search the campaign reference by name: units, spells, races, skills, artifacts. Returns id and name; use read_reference for details.",
  input: z.object({ kind: kindSchema, query: z.string().trim().min(1).max(60) }),
  handler: async (ctx, { kind, query }) => {
    const q = query.toLocaleLowerCase("uk");

    return (await listOf(ctx.campaignId, kind))
      .filter((e) => e.name.toLocaleLowerCase("uk").includes(q))
      .slice(0, AI_LIMITS.searchHits)
      .map(({ id, name }) => ({ id, name }));
  },
});

export const readReferenceTool = defineTool({
  name: "read_reference",
  title: "Запис довідника",
  description: "Full reference entry (unit stats and abilities, spell effects, race traits, skill or artifact description) by kind and id.",
  input: z.object({ kind: kindSchema, id: z.string().min(1) }),
  handler: async (ctx, { kind, id }) => {
    const entry = await findEntry(ctx.campaignId, kind, id);

    if (!entry) throw new AiToolError(`Запису ${kind} ${id} немає в довіднику кампанії`);

    return entry;
  },
});

import { Prisma } from "@prisma/client";
import { z } from "zod";

import { CompendiumError } from "./parse";
import { TARGET_KINDS } from "./types";

import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { contentWrite } from "@/lib/server/scenario/content-write";
import { newContentId } from "@/lib/server/templates/ids";
import { remapIds } from "@/lib/server/templates/remap-ids";
import { jsonContentInput } from "@/lib/utils/common/json";
import type { ScenarioContent } from "@/types/scenario";

const object = z.record(z.string(), z.unknown());

const kind = z.enum(TARGET_KINDS);

const entry = z.object({ canonicalKey: z.string().max(4000), kind, localId: z.string().min(1).max(100), locator: z.unknown(), edition: z.string().max(20), sourceJson: z.string().max(200), originalName: z.string().max(1000), inputHash: z.string().max(100), adapterVersion: z.string().max(100), baseline: object, notes: z.string().max(64 * 1024), issues: z.array(object).max(10_000), bindings: z.unknown(), attribution: object.default({}) });

export const CompendiumBundleSchema = z.object({ formatVersion: z.literal(1), sources: z.array(z.object({ sourceJson: z.string().max(200), metadata: object })), entries: z.array(entry), pages: z.array(z.object({ id: z.string().max(100), kind: z.literal("note"), title: z.string().max(200), content: scenarioContentSchema })) });
export type CompendiumBundle = z.infer<typeof CompendiumBundleSchema>;
export type CompendiumBundleDb = Pick<Prisma.TransactionClient, "compendiumEntry" | "compendiumSource" | "scenarioPage">;

export function remapCompendiumSection(section: CompendiumBundle, idMap: ReadonlyMap<string, string>): CompendiumBundle {
  for (const row of section.entries) if (!idMap.has(row.localId)) throw new CompendiumError("PROVENANCE_TARGET");

  return { ...section, sources: section.sources, entries: section.entries.map((r) => ({ ...r, localId: idMap.get(r.localId)!, baseline: remapIds(r.baseline, idMap), locator: remapIds(r.locator, idMap), bindings: remapIds(r.bindings, idMap) })), pages: section.pages.map((p) => ({ ...p, id: idMap.get(p.id) ?? p.id, content: remapIds(p.content, idMap) })) };
}

export async function exportCompendiumSection(db: CompendiumBundleDb, campaignId: string): Promise<CompendiumBundle | undefined> {
  const entries = await db.compendiumEntry.findMany({ where: { campaignId }, orderBy: { canonicalKey: "asc" } });

  if (!entries.length) return undefined;

  const sources = await db.compendiumSource.findMany({ where: { campaignId }, select: { sourceJson: true, metadata: true } });

  const pages = await db.scenarioPage.findMany({ where: { campaignId, kind: "note", id: { in: entries.filter((e) => e.kind === "scenarioPages").map((e) => e.localId) } }, select: { id: true, kind: true, title: true, content: true } });

  return CompendiumBundleSchema.parse({ formatVersion: 1, sources, entries, pages });
}

export async function importCompendiumSection(db: CompendiumBundleDb, section: CompendiumBundle, campaignId: string, idMap: ReadonlyMap<string, string>): Promise<void> {
  const next = remapCompendiumSection(section, idMap);

  for (const source of next.sources) await db.compendiumSource.upsert({ where: { campaignId_sourceJson: { campaignId, sourceJson: source.sourceJson } }, create: { campaignId, sourceJson: source.sourceJson, metadata: jsonContentInput(source.metadata) }, update: { metadata: jsonContentInput(source.metadata) } });

  if (next.pages.length) await db.scenarioPage.createMany({ data: next.pages.map((page) => ({ id: page.id, campaignId, kind: "note", status: "draft", title: page.title, ...contentWrite(page.title, page.content as ScenarioContent) })) });

  if (next.entries.length) await db.compendiumEntry.createMany({ data: next.entries.map((row) => ({ ...row, id: newContentId(), campaignId, locator: jsonContentInput(row.locator), baseline: jsonContentInput(row.baseline), issues: jsonContentInput(row.issues), bindings: jsonContentInput(row.bindings), attribution: jsonContentInput(row.attribution) })) });
}

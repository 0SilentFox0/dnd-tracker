import { Prisma } from "@prisma/client";

import type { CompendiumBundle, CompendiumBundleDb } from "./bundle";
import { remapCompendiumSection } from "./bundle";
import { CompendiumError } from "./parse";

const json = (v: unknown) => JSON.parse(JSON.stringify(v)) as Prisma.InputJsonValue;

/** Selected native rows only; campaign source lineage and compendium identity remain independent. */
export async function syncCompendiumProvenance(db: Pick<CompendiumBundleDb, "compendiumEntry" | "compendiumSource">, source: CompendiumBundle | undefined, campaignId: string, idMap: ReadonlyMap<string, string>, selectedSourceIds: ReadonlySet<string>): Promise<void> {
  if (!source) return; // Native changes without source provenance leave the old baseline intact -> reimport conflict.

  const selected = source.entries.filter((e) => selectedSourceIds.has(e.localId) && e.kind !== "scenarioPages");

  const section = remapCompendiumSection({ ...source, entries: selected, pages: [] }, idMap);

  for (const row of section.entries) {
    const current = await db.compendiumEntry.findUnique({ where: { campaignId_canonicalKey: { campaignId, canonicalKey: row.canonicalKey } }, select: { localId: true } });

    if (current && current.localId !== row.localId) throw new CompendiumError("PROVENANCE_CONFLICT", row.canonicalKey);
  }
  for (const row of section.entries) {
    const data = { ...row, locator: json(row.locator), baseline: json(row.baseline), issues: json(row.issues), bindings: json(row.bindings), attribution: json(row.attribution) };

    await db.compendiumEntry.upsert({ where: { campaignId_canonicalKey: { campaignId, canonicalKey: row.canonicalKey } }, create: { campaignId, ...data }, update: data });
  }
  for (const source of section.sources.filter((s) => selected.some((e) => e.sourceJson.toLowerCase() === s.sourceJson.toLowerCase()))) await db.compendiumSource.upsert({ where: { campaignId_sourceJson: { campaignId, sourceJson: source.sourceJson } }, create: { campaignId, sourceJson: source.sourceJson, metadata: json(source.metadata) }, update: { metadata: json(source.metadata) } });
}

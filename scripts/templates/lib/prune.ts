import { importOrder } from "./import-order";
import { delegateFor, rowLabel } from "./kind-delegate";
import type { PackRow } from "./pack";

import { prisma } from "@/lib/db";
import { DETACH_KIND_BY_TABLE, detachRefs } from "@/lib/server/content/detach-refs";
import { withCampaignContentWrite } from "@/lib/server/content/write";
import type { PackKind } from "@/lib/utils/templates/manifest";

export interface OutsideRow { kind: PackKind; id: string; slug: string; label: string }

/** Artifacts go before their sets; everything else deletes in reverse import order. */
export const pruneOrder = (kinds: readonly PackKind[]): PackKind[] => {
  const reversed = [...importOrder(kinds)].reverse();

  return [...reversed.filter((kind) => kind === "artifacts"), ...reversed.filter((kind) => kind !== "artifacts")];
};

/** Slugged rows of the template, in the kinds of the manifest, that the pack no longer lists. */
export async function rowsOutsidePack(campaignId: string, kinds: readonly PackKind[], rows: Partial<Record<PackKind, PackRow[]>>): Promise<OutsideRow[]> {
  const found: OutsideRow[] = [];

  for (const kind of pruneOrder(kinds)) {
    const inPack = new Set((rows[kind] ?? []).map((row) => row.slug));

    const existing = await delegateFor(prisma, kind).delegate.findMany({ where: { campaignId, slug: { not: null } }, orderBy: [{ createdAt: "asc" }, { id: "asc" }] });

    for (const row of existing) {
      const slug = String(row.slug);

      if (!inPack.has(slug)) found.push({ kind, id: row.id, slug, label: rowLabel(row, slug) });
    }
  }

  return found;
}

/** Deletes the rows, detaching references to them first; counts as a content change. */
export async function pruneRows(campaignId: string, outside: readonly OutsideRow[]): Promise<void> {
  if (outside.length === 0) return;

  await withCampaignContentWrite(
    campaignId,
    async (db) => {
      for (const kind of new Set(outside.map((row) => row.kind))) {
        const ids = outside.filter((row) => row.kind === kind).map((row) => row.id);

        const { table, delegate } = delegateFor(db, kind);

        const detach = DETACH_KIND_BY_TABLE[table.key];

        if (detach) await detachRefs(db as unknown as Parameters<typeof detachRefs>[0], campaignId, detach, ids);

        await delegate.deleteMany({ where: { id: { in: ids }, campaignId } });
      }
    },
  );
}

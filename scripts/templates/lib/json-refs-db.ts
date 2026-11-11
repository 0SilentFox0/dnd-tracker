import { isDeepStrictEqual } from "node:util";

import { JSON_REF_COLUMNS, mapJsonRefs, slugsToIds } from "./json-refs";

import { withCampaignContentWrite } from "@/lib/server/content/write";
import { markContentDirty } from "@/lib/server/content/write-context";
import { tableOfKind } from "@/lib/server/templates/bundle";

/** Rewrites slugs still left in the JSON columns (a reference to a row imported later) to ids; touches only rows that differ. */
export async function settleJsonRefs(campaignId: string, idBySlug: Record<string, Record<string, string>>): Promise<number> {
  const swap = slugsToIds(idBySlug);

  let changed = 0;

  await withCampaignContentWrite(
    campaignId,
    async (db) => {
      for (const [kind, columns] of Object.entries(JSON_REF_COLUMNS)) {
        const table = tableOfKind(kind);

        if (!table) continue;

        const delegate = (db as unknown as Record<string, { findMany(args: unknown): Promise<Array<Record<string, unknown> & { id: string }>>; update(args: unknown): Promise<unknown> }>)[table.delegate];

        for (const row of await delegate.findMany({ where: { campaignId } })) {
          const data = Object.fromEntries(columns.flatMap((column) => (row[column] == null ? [] : [[column, mapJsonRefs(row[column], swap)] as const])).filter(([column, next]) => !isDeepStrictEqual(next, row[column])));

          if (Object.keys(data).length === 0) continue;

          changed += 1;
          markContentDirty();
          await delegate.update({ where: { id: row.id }, data });
        }
      }
    },
    { bump: false },
  );

  return changed;
}

import type { Prisma } from "@prisma/client";

import { bypassLayer } from "@/lib/db/content-layer";
import { markContentDirty } from "@/lib/server/content/write-context";
import { BUNDLE_TABLES, type BundleTableDef, toPrismaJson } from "@/lib/server/templates/bundle";
import { remapDeep } from "@/lib/server/templates/legacy-migration/remap";
import type { MigrationInput, MigrationPlan, PreImageCell, Row } from "@/lib/server/templates/legacy-migration/types";
import { stableStringify } from "@/lib/utils/battle/store/stable-json";

const CHUNK = 200;

export interface ReferrerUpdate { model: string; pk: Record<string, unknown>; data: Record<string, unknown>; cells: PreImageCell[] }

type Delegate = Record<string, (args: unknown) => Promise<unknown>>;

const delegateName = (model: string) => `${model[0].toLowerCase()}${model.slice(1)}`;

const differs = (a: unknown, b: unknown) => stableStringify(a ?? null) !== stableStringify(b ?? null);

const chunks = <T>(items: readonly T[]): T[][] => Array.from({ length: Math.ceil(items.length / CHUNK) }, (_, i) => items.slice(i * CHUNK, (i + 1) * CHUNK));

export function referrerUpdates(args: { input: MigrationInput; idMap: ReadonlyMap<string, string> }): ReferrerUpdate[] {
  const { input, idMap } = args;

  const out: ReferrerUpdate[] = [];

  for (const { r, rows } of input.referrers) {
    for (const row of rows) {
      const data: Record<string, unknown> = {};

      const cells: PreImageCell[] = [];

      const pkColumn = r.pk ?? "id";

      const pk = { [pkColumn]: row[pkColumn] };

      for (const column of r.columnsFor?.(row) ?? r.columns ?? []) {
        const after = remapDeep(row[column], idMap);

        if (differs(row[column], after)) {
          data[column] = after;
          cells.push({ model: r.model, pk, column, before: row[column], after });
        }
      }

      if (cells.length === 0) continue;

      if (r.derive) {
        const derived = r.derive({ ...row, ...data }, input.campaignId);

        for (const [column, after] of Object.entries(derived)) {
          if (!differs(row[column], after)) continue;

          data[column] = after;
          cells.push({ model: r.model, pk, column, before: row[column], after });
        }
      }

      out.push({ model: r.model, pk, data, cells });
    }
  }

  return out;
}

async function replaceRows(tx: Prisma.TransactionClient, args: { t: BundleTableDef; campaignId: string; rows: Row[] }) {
  const delegate = tx[args.t.delegate] as unknown as { deleteMany(a: unknown): Promise<unknown>; createMany(a: unknown): Promise<unknown> };

  await bypassLayer(() => delegate.deleteMany({ where: { campaignId: args.campaignId } }));

  for (const part of chunks(args.rows)) await bypassLayer(() => delegate.createMany({ data: part.map((row) => toPrismaJson(row, args.t)) }));
}

export async function writeMigration(tx: Prisma.TransactionClient, args: { input: MigrationInput; plan: MigrationPlan }): Promise<{ referrerCells: PreImageCell[] }> {
  const { input, plan } = args;

  const { campaignId, sourceId, version } = input;

  const t = tx as unknown as Record<string, Delegate>;

  for (const def of BUNDLE_TABLES) await replaceRows(tx, { t: def, campaignId, rows: plan.rows[def.key] });

  for (const part of chunks(plan.hides)) await tx.campaignContentHide.createMany({ data: part.map((h) => ({ campaignId, table: h.table, id: h.id })), skipDuplicates: true });

  const ignored = plan.ignored as unknown as Prisma.InputJsonObject;

  await tx.campaignSourceSync.upsert({
    where: { campaignId },
    update: { ignored, sourceVersion: version, sourceCampaignId: sourceId },
    create: { campaignId, sourceCampaignId: sourceId, sourceVersion: version, baseline: { tables: {}, rules: {} }, ignored },
  });

  const dropped = input.droppedNotifications ?? [];

  if (dropped.length > 0) await tx.playerNotification.deleteMany({ where: { id: { in: dropped.map((n) => n.id) } } });

  const updates = referrerUpdates({ input, idMap: plan.idMap });

  for (const u of updates) await t[delegateName(u.model)].update({ where: u.pk, data: u.data });

  await tx.campaign.update({ where: { id: campaignId }, data: { baseSourceId: sourceId, baseVersion: version } });

  markContentDirty();

  return { referrerCells: updates.flatMap((u) => u.cells) };
}

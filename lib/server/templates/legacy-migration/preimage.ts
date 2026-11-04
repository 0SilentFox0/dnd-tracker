import { Prisma, type PrismaClient } from "@prisma/client";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";

import { bypassLayer } from "@/lib/db/content-layer";
import { lockCampaignRow } from "@/lib/server/campaigns/lock";
import { markContentDirty, runContentWriteContext } from "@/lib/server/content/write-context";
import { BUNDLE_TABLES } from "@/lib/server/templates/bundle";
import { REFERRERS } from "@/lib/server/templates/legacy-migration/referrers";
import type { PreImage, Row } from "@/lib/server/templates/legacy-migration/types";
import { stableStringify } from "@/lib/utils/battle/store/stable-json";

export type { PreImage };

export async function writePreImage(dir: string, image: PreImage): Promise<string> {
  await mkdir(dir, { recursive: true });

  const file = path.join(dir, `${image.campaignId}-${image.createdAt.replace(/[:.]/g, "-")}.json.gz`);

  await writeFile(file, gzipSync(JSON.stringify(image)));

  return file;
}

export async function readPreImage(file: string): Promise<PreImage> {
  return JSON.parse(gunzipSync(await readFile(file)).toString("utf8")) as PreImage;
}

export interface UndoConflict { model: string; pk: Record<string, unknown>; column: string }

export type UndoResult = { ok: true } | { ok: false; conflicts: UndoConflict[]; reason?: "CONTENT_CHANGED" };

type Delegate = Record<string, (args: unknown) => Promise<unknown>>;

const CHUNK = 200;

const delegateName = (model: string) => `${model[0].toLowerCase()}${model.slice(1)}`;

const fieldsOf = (model: string) => new Map((Prisma.dmmf.datamodel.models.find((m) => m.name === model)?.fields ?? []).map((f) => [f.name, f]));

/** A JSON round trip leaves Dates as strings and loses the DbNull/JsonNull distinction. */
function revive(model: string, row: Record<string, unknown>): Record<string, unknown> {
  const fields = fieldsOf(model);

  return Object.fromEntries(Object.entries(row).map(([column, value]) => {
    const type = fields.get(column)?.type;

    if (type === "DateTime" && typeof value === "string") return [column, new Date(value)];

    if (type === "Json" && value === null) return [column, Prisma.DbNull];

    return [column, value];
  }));
}

const differs = (a: unknown, b: unknown) => stableStringify(a ?? null) !== stableStringify(b ?? null);

export async function undoMigration(db: PrismaClient, file: string): Promise<UndoResult> {
  const image = await readPreImage(file);

  const { campaignId } = image;

  return db.$transaction((tx) => runContentWriteContext(campaignId, tx, async (): Promise<UndoResult> => {
    await lockCampaignRow(tx, campaignId, "update");

    const campaign = await tx.campaign.findUnique({ where: { id: campaignId }, select: { contentVersion: true } });

    if (campaign?.contentVersion !== image.postContentVersion) return { ok: false, conflicts: [], reason: "CONTENT_CHANGED" };

    for (const r of REFERRERS) if (r.mode === "remap" && r.lockSql) await tx.$queryRaw(r.lockSql(campaignId));

    const t = tx as unknown as Record<string, Delegate>;

    const conflicts: UndoConflict[] = [];

    for (const cell of image.referrerCells) {
      const current = (await t[delegateName(cell.model)].findUnique({ where: cell.pk })) as Record<string, unknown> | null;

      if (!current || differs(current[cell.column], cell.after)) conflicts.push({ model: cell.model, pk: cell.pk, column: cell.column });
    }

    if (conflicts.length > 0) return { ok: false, conflicts };

    for (const def of BUNDLE_TABLES) {
      const delegate = tx[def.delegate] as unknown as Delegate;

      const rows: Row[] = image.stored[def.key];

      await bypassLayer(() => delegate.deleteMany({ where: { campaignId } }));

      for (let i = 0; i < rows.length; i += CHUNK) await bypassLayer(() => delegate.createMany({ data: rows.slice(i, i + CHUNK).map((row) => revive(def.model, row)) }));
    }

    await tx.campaignContentHide.deleteMany({ where: { campaignId } });

    for (const cell of image.referrerCells) await t[delegateName(cell.model)].update({ where: cell.pk, data: revive(cell.model, { [cell.column]: cell.before }) });

    if (image.droppedNotifications?.length) await tx.playerNotification.createMany({ data: image.droppedNotifications.map((n) => revive("PlayerNotification", n)) as Prisma.PlayerNotificationCreateManyInput[] });

    await tx.campaignSourceSync.deleteMany({ where: { campaignId } });

    if (image.sourceSync) await tx.campaignSourceSync.create({ data: revive("CampaignSourceSync", image.sourceSync) as Prisma.CampaignSourceSyncUncheckedCreateInput });

    await tx.campaign.update({ where: { id: campaignId }, data: { baseSourceId: null, baseVersion: null } });

    markContentDirty();

    return { ok: true };
  }), { timeout: 120_000, maxWait: 10_000 });
}

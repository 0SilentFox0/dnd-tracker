#!/usr/bin/env tsx
// pnpm assets:attach <campaignId> <dir> --kind units|spells|artifacts|classes|races|skills|main-skills [--allow-official] [--allow-remote]
import * as fs from "fs";
import * as path from "path";

import { assertSeedTarget } from "../seed/seed-library-lib";
import { readSrdData } from "../srd/lib/data-files";
import { assertAttachAllowed, ASSET_BUCKET, ICON_FIELD, IMAGE_TYPES, isAttachKind, matchAssets, objectPath, srdSlugNames } from "./attach-lib";

import { prisma } from "@/lib/db";
import { importContent, OFFLINE_IMPORT_DEPS } from "@/lib/server/content/import/import-content";
import { loadNames } from "@/lib/server/content/import/names";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { staticAssetUploadOptions } from "@/lib/supabase/storage-cache";
import type { Actor } from "@/lib/utils/api/actor";

const USAGE = "Використання: pnpm assets:attach <campaignId> <тека> --kind units|spells|artifacts|classes|races|skills|main-skills [--allow-official] [--allow-remote]";

async function main() {
  const args = process.argv.slice(2);

  const kind = args.includes("--kind") ? args[args.indexOf("--kind") + 1] : undefined;

  const [campaignId, dir] = args.filter((a, i) => !a.startsWith("--") && args[i - 1] !== "--kind");

  if (!campaignId || !dir || !isAttachKind(kind)) throw new Error(USAGE);

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId }, select: { kind: true, visibility: true, dmUserId: true } });

  assertAttachAllowed(campaign, args.includes("--allow-official"));

  const files = fs.readdirSync(dir).filter((f) => IMAGE_TYPES[path.extname(f).toLowerCase()]);

  const { matches, unmatched, duplicates } = matchAssets(files, await loadNames(campaignId, kind), srdSlugNames(kind, readSrdData()));

  const admin = createAdminClient();

  const bucket = ASSET_BUCKET[kind];

  const ensured = await ensureBucket(admin, bucket);

  if (!ensured.ok) throw new Error(ensured.message);

  const rows: Record<string, unknown>[] = [];

  const uploadErrors: string[] = [];

  for (const m of matches) {
    const ext = path.extname(m.file).toLowerCase();

    const content = fs.readFileSync(path.join(dir, m.file));

    const objectName = objectPath(campaignId, kind, m.name, content, ext);

    const { error } = await admin.storage.from(bucket).upload(objectName, content, staticAssetUploadOptions(IMAGE_TYPES[ext]));

    if (error) {
      uploadErrors.push(`${m.file}: ${error.message}`);
      continue;
    }

    rows.push({ name: m.name, [ICON_FIELD[kind]]: admin.storage.from(bucket).getPublicUrl(objectName).data.publicUrl });
  }

  const actor: Actor = { campaignId, userId: campaign.dmUserId, isDM: true, via: "session", scopes: null };

  const report = rows.length > 0 ? await importContent(actor, kind, { rows, mode: "update", dryRun: false }, OFFLINE_IMPORT_DEPS) : null;

  console.info(`${kind}: файлів ${files.length}, прив'язано ${report?.counts.updated ?? 0}, помилок ${report?.counts.error ?? 0}`);

  for (const r of report?.results.filter((x) => x.status === "error") ?? []) console.warn(`  помилка: ${r.name}: ${r.issues.map((i) => i.message).join("; ")}`);

  for (const e of uploadErrors) console.warn(`  не завантажено: ${e}`);

  for (const f of unmatched) console.warn(`  без пари: ${f}`);

  for (const f of duplicates) console.warn(`  інший варіант (пропущено): ${f}`);

  if ((report?.counts.error ?? 0) > 0 || uploadErrors.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

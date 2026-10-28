#!/usr/bin/env tsx
// pnpm assets:tokens-5e <templateId> [--dir <v2>] [--dry-run] [--allow-remote]
import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { assertSeedTarget } from "../../seed/seed-library-lib";
import { readSrdData } from "../../srd/lib/data-files";
import { ASSET_BUCKET } from "../attach-lib";
import { mapToTemplate, parseCatalog, TOKEN_SIZE, type TokenKind } from "./catalog";
import { toWebp } from "./convert";
import { readIcons, writeIcons } from "./icons-file";

import { CampaignKind, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { staticAssetUploadOptions } from "@/lib/supabase/storage-cache";

const USAGE = "Використання: pnpm assets:tokens-5e <templateId> [--dir <v2>] [--dry-run] [--allow-remote]";

const KB = 1024;

async function main() {
  const args = process.argv.slice(2);

  const dirIdx = args.indexOf("--dir");

  if (dirIdx >= 0 && (!args[dirIdx + 1] || args[dirIdx + 1].startsWith("--"))) throw new Error(`--dir потребує шляху до теки v2. ${USAGE}`);

  const dir = dirIdx >= 0 ? args[dirIdx + 1] : path.join(os.homedir(), "Downloads", "fantasy-tokens", "output", "v2");

  const templateId = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--dir");

  const dryRun = args.includes("--dry-run");

  if (!templateId) throw new Error(USAGE);

  const admin = dryRun ? null : createAdminClient();

  if (!dryRun) {
    assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

    const campaign = await prisma.campaign.findUnique({ where: { id: templateId }, select: { name: true, kind: true } });

    if (campaign?.name !== SRD_TEMPLATE_NAME || campaign.kind !== CampaignKind.TEMPLATE) throw new Error(`Кампанія ${templateId} не є офіційним шаблоном «${SRD_TEMPLATE_NAME}»`);
  }

  // власні AI-іконки, не Forgotten Adventures: --allow-official не потрібен
  const data = readSrdData();

  const { picked, templateOnly, catalogOnly } = mapToTemplate(parseCatalog(fs.readFileSync(path.join(dir, "catalog.csv"), "utf8")), {
    spells: data.spells.map((r) => r.slug),
    units: data.units.map((r) => r.slug),
    artifacts: data.artifacts.map((r) => r.slug),
  });

  const uploaded: Record<TokenKind, Record<string, string>> = { spells: {}, units: {}, artifacts: {} };

  const ensured = new Set<TokenKind>();

  const missing: string[] = [];

  const errors: string[] = [];

  let total = 0;

  let count = 0;

  let largest = { name: "", size: 0 };

  for (const { kind, slug, imagePath } of picked) {
    const file = path.join(dir, imagePath);

    if (!fs.existsSync(file)) {
      console.warn(`немає файлу: ${file}`);
      missing.push(file);
      continue;
    }

    const webp = await toWebp(fs.readFileSync(file), TOKEN_SIZE[kind]);

    count += 1;
    total += webp.length;

    if (webp.length > largest.size) largest = { name: `${kind}/${slug}`, size: webp.length };

    if (!admin) continue;

    const bucket = ASSET_BUCKET[kind];

    if (!ensured.has(kind)) {
      const res = await ensureBucket(admin, bucket);

      if (!res.ok) throw new Error(res.message);

      ensured.add(kind);
    }

    const objectName = `${templateId}/${kind}/${slug}-${createHash("sha1").update(webp).digest("hex").slice(0, 8)}.webp`;

    const { error } = await admin.storage.from(bucket).upload(objectName, webp, staticAssetUploadOptions("image/webp"));

    if (error) {
      errors.push(`${kind}/${slug}: ${error.message}`);
      continue;
    }

    uploaded[kind][slug] = admin.storage.from(bucket).getPublicUrl(objectName).data.publicUrl;
  }

  console.info(`${dryRun ? "конвертовано (dry-run)" : "завантажено"}: ${dryRun ? count : Object.values(uploaded).reduce((n, m) => n + Object.keys(m).length, 0)}, сумарно ${(total / KB).toFixed(0)} КБ, найбільший ${largest.name} ${(largest.size / KB).toFixed(1)} КБ`);
  console.info(`варіанти (via): ${picked.filter((p) => p.via).length}; без файлу: ${missing.length}; лише в шаблоні: ${templateOnly.length}; лише в каталозі: ${catalogOnly}`);

  for (const t of templateOnly.slice(0, 10)) console.info(`  лише в шаблоні: ${t.kind}/${t.slug}`);

  for (const e of errors) console.warn(`  не завантажено: ${e}`);

  if (!dryRun) {
    const old = readIcons();

    const kept = (kind: TokenKind) => Object.fromEntries(Object.entries(old[kind]).filter(([slug]) => picked.some((p) => p.kind === kind && p.slug === slug)));

    writeIcons({ spells: { ...kept("spells"), ...uploaded.spells }, units: { ...kept("units"), ...uploaded.units }, artifacts: { ...kept("artifacts"), ...uploaded.artifacts } });
  }

  if (errors.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

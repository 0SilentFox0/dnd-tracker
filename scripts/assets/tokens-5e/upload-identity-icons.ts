#!/usr/bin/env tsx
// pnpm assets:identity-icons <templateId> [--dir <fantasy-tokens>] [--dry-run] [--allow-remote]
import { createHash } from "crypto";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

import { assertSeedTarget } from "../../seed/seed-library-lib";
import { readSrdData } from "../../srd/lib/data-files";
import { toWebp } from "./convert";
import { readIcons, writeIcons } from "./icons-file";
import { expectedTargets, IDENTITY_BUCKET, IDENTITY_SIZE, type IdentityKind, parseIdentityCsv } from "./identity-catalog";
import { planUploads } from "./identity-plan";

import { CampaignKind, SRD_TEMPLATE_NAME } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { staticAssetUploadOptions } from "@/lib/supabase/storage-cache";

const USAGE = "Використання: pnpm assets:identity-icons <templateId> [--dir <fantasy-tokens>] [--dry-run] [--allow-remote]";

const KB = 1024;

const KINDS: IdentityKind[] = ["features", "races", "classes", "subclasses", "backgrounds"];

async function main() {
  const args = process.argv.slice(2);

  const dirIdx = args.indexOf("--dir");

  if (dirIdx >= 0 && (!args[dirIdx + 1] || args[dirIdx + 1].startsWith("--"))) throw new Error(`--dir потребує шляху. ${USAGE}`);

  const dir = dirIdx >= 0 ? args[dirIdx + 1] : path.join(os.homedir(), "Downloads", "fantasy-tokens");

  const templateId = args.find((a, i) => !a.startsWith("--") && args[i - 1] !== "--dir");

  const dryRun = args.includes("--dry-run");

  if (!templateId) throw new Error(USAGE);

  const admin = dryRun ? null : createAdminClient();

  if (!dryRun) {
    assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

    const campaign = await prisma.campaign.findUnique({ where: { id: templateId }, select: { name: true, kind: true } });

    if (campaign?.name !== SRD_TEMPLATE_NAME || campaign.kind !== CampaignKind.TEMPLATE) throw new Error(`Кампанія ${templateId} не є офіційним шаблоном «${SRD_TEMPLATE_NAME}»`);
  }

  const targets = expectedTargets(readSrdData());

  const readCsv = (name: string) => parseIdentityCsv(fs.readFileSync(path.join(dir, "input", name), "utf8"));

  const plan = planUploads(targets, readCsv("features.csv"), readCsv("identity.csv"), { features: path.join(dir, "output-features", "icons"), identity: path.join(dir, "output-identity", "icons") });

  const uploaded: Record<IdentityKind, Record<string, string>> = { features: {}, races: {}, classes: {}, subclasses: {}, backgrounds: {} };

  const ensured = new Set<string>();

  const missing: string[] = [];

  const errors: string[] = [];

  const sizes: Record<string, number> = {};

  let count = 0;

  let total = 0;

  let largest = { name: "", size: 0 };

  for (const { file, target, missing: noRow } of plan) {
    const label = `${target.kind}/${target.key}`;

    if (noRow || !fs.existsSync(file)) {
      console.warn(`немає файлу: ${noRow ? label : file}`);
      missing.push(label);
      continue;
    }

    const webp = await toWebp(fs.readFileSync(file), IDENTITY_SIZE);

    count += 1;
    total += webp.length;
    sizes[target.kind] = (sizes[target.kind] ?? 0) + webp.length;

    if (webp.length > largest.size) largest = { name: label, size: webp.length };

    if (!admin) continue;

    const bucket = IDENTITY_BUCKET[target.kind];

    if (!ensured.has(bucket)) {
      const res = await ensureBucket(admin, bucket);

      if (!res.ok) throw new Error(res.message);

      ensured.add(bucket);
    }

    const objectName = `${templateId}/${target.kind}/${target.key.replaceAll("/", "_")}-${createHash("sha1").update(webp).digest("hex").slice(0, 8)}.webp`;

    const { error } = await admin.storage.from(bucket).upload(objectName, webp, staticAssetUploadOptions("image/webp"));

    if (error) {
      errors.push(`${label}: ${error.message}`);
      continue;
    }

    uploaded[target.kind][target.key] = admin.storage.from(bucket).getPublicUrl(objectName).data.publicUrl;
  }

  console.info(`${dryRun ? "конвертовано (dry-run)" : "завантажено"}: ${dryRun ? count : Object.values(uploaded).reduce((n, m) => n + Object.keys(m).length, 0)}, сумарно ${(total / KB).toFixed(0)} КБ, найбільший ${largest.name} ${(largest.size / KB).toFixed(1)} КБ`);
  console.info(`за видами: ${KINDS.map((k) => `${k} ${plan.filter((p) => p.target.kind === k).length} (${((sizes[k] ?? 0) / KB).toFixed(0)} КБ)`).join(", ")}; без файлу: ${missing.length}`);

  for (const e of errors) console.warn(`  не завантажено: ${e}`);

  if (!dryRun) {
    const old = readIcons();

    const next = { ...old };

    for (const kind of KINDS) {
      const valid = new Set(targets.filter((t) => t.kind === kind).map((t) => t.key));

      next[kind] = Object.fromEntries(Object.entries({ ...old[kind], ...uploaded[kind] }).filter(([key]) => valid.has(key)));
    }

    writeIcons(next);
  }

  if (errors.length > 0 || missing.length > 0) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

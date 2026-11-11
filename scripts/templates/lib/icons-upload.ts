import { createHash } from "crypto";
import * as fs from "fs";
import * as path from "path";

import { ASSET_BUCKET } from "../../assets/attach-lib";
import { toWebp } from "../../assets/tokens-5e/convert";
import { assertSeedTarget, assertStorageTarget } from "../../seed/seed-library-lib";
import { readIcons, writeIcons } from "./icons-file";
import { type Pack, readPack, TEMPLATES_DIR } from "./pack";
import { makeTemplateStore } from "./store";

import type { ICON_BUCKETS } from "@/lib/constants/storage";
import { createAdminClient } from "@/lib/supabase/admin";
import { ensureBucket } from "@/lib/supabase/buckets";
import { staticAssetUploadOptions } from "@/lib/supabase/storage-cache";
import { templateAssetPath } from "@/lib/utils/common/image-url";
import type { PackKind } from "@/lib/utils/templates/manifest";

type Bucket = (typeof ICON_BUCKETS)[number];

const DEFAULT_BUCKET: Partial<Record<PackKind, Bucket>> = { ...ASSET_BUCKET, feats: "feat-icons", careers: "career-icons", backgrounds: "background-icons" };

export const ICON_SIZE_BY_KIND = (kind: PackKind): number => (kind === "units" ? 384 : 256);

export const bucketOf = (pack: Pack, kind: PackKind): Bucket | undefined => pack.manifest.icons.bucketByKind?.[kind] ?? DEFAULT_BUCKET[kind];

export interface IconUploadPlan { kind: PackKind; slug: string; file: string; missing: boolean }

/** One `<dir>/<kind>/<slug>.png` per row of the kinds that have an icon bucket. */
export function planIconUploads(pack: Pack, dir: string, kinds?: readonly string[]): IconUploadPlan[] {
  return pack.manifest.kinds
    .filter((kind) => bucketOf(pack, kind) && (!kinds || kinds.includes(kind)))
    .flatMap((kind) => (pack.rows[kind] ?? []).map((row) => ({ kind, slug: row.slug, file: path.join(dir, kind, `${row.slug}.png`), missing: false })))
    .map((plan) => ({ ...plan, missing: !fs.existsSync(plan.file) }));
}

export async function uploadIcons(key: string, opts: { dir: string; dryRun?: boolean; allowRemote?: boolean; kinds?: string[]; templatesDir?: string }): Promise<{ uploaded: number; skipped: number }> {
  const templatesDir = opts.templatesDir ?? TEMPLATES_DIR;

  const pack = readPack(key, templatesDir);

  const plan = planIconUploads(pack, opts.dir, opts.kinds);

  if (!opts.dryRun) {
    assertSeedTarget(process.env.DATABASE_URL, opts.allowRemote ?? false);
    assertStorageTarget(process.env.NEXT_PUBLIC_SUPABASE_URL, opts.allowRemote ?? false);

    if (!(await makeTemplateStore(pack.manifest).findTemplate())) throw new Error(`No official template for "${key}" in the database; import the pack first`);
  }

  const admin = opts.dryRun ? null : createAdminClient();

  const ensured = new Set<string>();

  const next = readIcons(key, templatesDir);

  let uploaded = 0;

  let skipped = 0;

  for (const { kind, slug, file, missing } of plan) {
    if (missing) {
      console.warn(`missing file: ${file}`);
      skipped += 1;
      continue;
    }

    const webp = await toWebp(fs.readFileSync(file), ICON_SIZE_BY_KIND(kind));

    if (!admin) {
      uploaded += 1;
      continue;
    }

    const bucket = bucketOf(pack, kind) as Bucket;

    if (!ensured.has(bucket)) {
      const res = await ensureBucket(admin, bucket);

      if (!res.ok) throw new Error(res.message);

      ensured.add(bucket);
    }

    const objectName = templateAssetPath(key, kind, slug, createHash("sha1").update(webp).digest("hex").slice(0, 8));

    const { error } = await admin.storage.from(bucket).upload(objectName, webp, staticAssetUploadOptions("image/webp"));

    if (error) {
      console.warn(`not uploaded ${kind}/${slug}: ${error.message}`);
      skipped += 1;
      continue;
    }

    (next[kind] ??= {})[slug] = admin.storage.from(bucket).getPublicUrl(objectName).data.publicUrl;
    uploaded += 1;
  }

  if (!opts.dryRun) writeIcons(key, next, templatesDir);

  console.info(`${opts.dryRun ? "converted (dry run)" : "uploaded"}: ${uploaded}, skipped: ${skipped}`);

  return { uploaded, skipped };
}

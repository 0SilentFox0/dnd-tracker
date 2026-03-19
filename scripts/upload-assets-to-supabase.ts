#!/usr/bin/env tsx
/**
 * Створює бакети в Supabase Storage і завантажує вміст папки assets/ у них.
 * - assets/unit-icons/* → bucket unit-icons
 * - assets/spell-icons/* → bucket spell-icons
 * - assets/skill-icons/* → bucket skill-icons
 *
 * Потрібно: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (з .env.local або env)
 *
 * Використання: pnpm run upload-assets-to-supabase
 */

import * as fs from "fs";
import * as path from "path";

// Завантажити .env.local якщо є (для tsx без next)
const envPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf8");
  for (const line of content.split("\n")) {
    const m = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
    if (m) {
      const value = m[2].replace(/^["']|["']$/g, "").trim();
      if (!process.env[m[1]]) process.env[m[1]] = value;
    }
  }
}

import { createAdminClient } from "../lib/supabase/admin";

const ASSETS_DIR = path.join(process.cwd(), "assets");

const BUCKET_FOLDERS = [
  { bucket: "unit-icons", folder: "unit-icons" },
  { bucket: "spell-icons", folder: "spell-icons" },
  { bucket: "skill-icons", folder: "skill-icons" },
] as const;

async function ensureBucket(
  supabase: ReturnType<typeof createAdminClient>,
  bucket: string,
) {
  const { data: buckets } = await supabase.storage.listBuckets();

  if (buckets?.some((b) => b.name === bucket)) return;

  const { error } = await supabase.storage.createBucket(bucket, {
    public: true,
  });

  if (error)
    throw new Error(`Failed to create bucket ${bucket}: ${error.message}`);

  console.log(`Created bucket "${bucket}" (public).`);
}

function listFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];

  const entries = fs.readdirSync(dir, { withFileTypes: true });

  const files: string[] = [];

  for (const e of entries) {
    const full = path.join(dir, e.name);

    if (e.isFile()) files.push(full);
    else if (e.isDirectory()) files.push(...listFiles(full));
  }

  return files;
}

async function main() {
  const supabase = createAdminClient();

  for (const { bucket, folder } of BUCKET_FOLDERS) {
    await ensureBucket(supabase, bucket);

    const dir = path.join(ASSETS_DIR, folder);

    const files = listFiles(dir);

    if (files.length === 0) {
      console.log(`No files in ${dir}, skip.`);
      continue;
    }

    console.log(`Uploading ${files.length} files to ${bucket}...`);

    let ok = 0;

    let fail = 0;

    for (const filePath of files) {
      const name = path.relative(dir, filePath);

      const buffer = fs.readFileSync(filePath);

      const ext = path.extname(name).toLowerCase();

      const contentType =
        ext === ".webp"
          ? "image/webp"
          : ext === ".png"
            ? "image/png"
            : ext === ".jpg" || ext === ".jpeg"
              ? "image/jpeg"
              : ext === ".gif"
                ? "image/gif"
                : ext === ".svg"
                  ? "image/svg+xml"
                  : "application/octet-stream";

      const { error } = await supabase.storage
        .from(bucket)
        .upload(name, buffer, {
          contentType,
          upsert: true,
        });

      if (error) {
        console.warn(`[skip] ${name}: ${error.message}`);
        fail++;
      } else {
        ok++;
      }
    }
    console.log(`  ${bucket}: ${ok} ok, ${fail} failed.`);
  }

  console.log("Done.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

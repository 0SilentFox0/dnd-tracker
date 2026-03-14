#!/usr/bin/env tsx
/**
 * Migrate spell icons from external URLs to Supabase Storage.
 * Downloads each spell icon, uploads to bucket "spell-icons", updates spell.icon in DB.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 * Bucket "spell-icons" will be created as public if it does not exist.
 *
 * Usage: pnpm run migrate-spell-icons-to-supabase [campaignId]
 * If campaignId omitted, processes all campaigns.
 */

import { PrismaClient } from "@prisma/client";

import { createAdminClient } from "../lib/supabase/admin";

const prisma = new PrismaClient();

const BUCKET = "spell-icons";

function getExtensionFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;

    const match = pathname.match(/\.(png|jpg|jpeg|gif|webp|svg)(\?|$)/i);

    return match ? `.${match[1].toLowerCase()}` : ".png";
  } catch {
    return ".png";
  }
}

function getExtensionFromContentType(contentType: string | null): string {
  if (!contentType) return ".png";

  const map: Record<string, string> = {
    "image/png": ".png",
    "image/jpeg": ".jpg",
    "image/jpg": ".jpg",
    "image/gif": ".gif",
    "image/webp": ".webp",
    "image/svg+xml": ".svg",
  };

  return map[contentType.split(";")[0].trim().toLowerCase()] ?? ".png";
}

async function ensureBucket(supabase: ReturnType<typeof createAdminClient>) {
  const { data: buckets } = await supabase.storage.listBuckets();

  if (buckets?.some((b) => b.name === BUCKET)) return;

  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
  });

  if (error) {
    throw new Error(`Failed to create bucket ${BUCKET}: ${error.message}`);
  }

  console.log(`Created bucket "${BUCKET}" (public).`);
}

async function main() {
  const campaignId = process.argv[2] ?? undefined;

  const supabase = createAdminClient();

  await ensureBucket(supabase);

  const where = campaignId
    ? { campaignId, icon: { not: null } }
    : { icon: { not: null } };

  const spells = await prisma.spell.findMany({
    where,
    select: { id: true, name: true, icon: true },
  });

  const toMigrate = spells.filter(
    (s) =>
      s.icon &&
      s.icon.trim() !== "" &&
      !s.icon.includes("supabase.co/storage")
  );

  if (toMigrate.length === 0) {
    console.log("No spell icons to migrate (all already use Supabase or have no icon).");
    await prisma.$disconnect();

    return;
  }

  console.log(`Migrating ${toMigrate.length} spell icons to Supabase Storage...`);

  let ok = 0;

  let fail = 0;

  for (const spell of toMigrate) {
    const url = spell.icon!;

    try {
      const res = await fetch(url, {
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; DnD-Combat-Tracker/1.0)",
        },
      });

      if (!res.ok) {
        console.warn(`[skip] ${spell.name} (${spell.id}): HTTP ${res.status} ${url}`);
        fail++;
        continue;
      }

      const buffer = Buffer.from(await res.arrayBuffer());

      const contentType = res.headers.get("content-type");

      const ext = getExtensionFromContentType(contentType) || getExtensionFromUrl(url);

      const path = `${spell.id}${ext}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(path, buffer, {
          contentType: contentType ?? "image/png",
          upsert: true,
        });

      if (uploadError) {
        console.warn(`[skip] ${spell.name} upload: ${uploadError.message}`);
        fail++;
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(path);

      await prisma.spell.update({
        where: { id: spell.id },
        data: { icon: publicUrl },
      });

      console.log(`[ok] ${spell.name} -> ${publicUrl}`);
      ok++;
    } catch (e) {
      console.warn(`[skip] ${spell.name}:`, e instanceof Error ? e.message : e);
      fail++;
    }
  }

  console.log(`Done. Migrated: ${ok}, failed: ${fail}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

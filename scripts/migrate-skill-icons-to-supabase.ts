#!/usr/bin/env tsx
/**
 * Migrate skill and main-skill icons from external URLs to Supabase Storage.
 * Bucket "skill-icons". Updates Skill.icon, Skill.image, MainSkill.icon in DB.
 *
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, DATABASE_URL
 *
 * Usage: pnpm run migrate-skill-icons-to-supabase [campaignId]
 */

import { PrismaClient } from "@prisma/client";

import { createAdminClient } from "../lib/supabase/admin";

const prisma = new PrismaClient();

const BUCKET = "skill-icons";

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

function isExternalUrl(url: string): boolean {
  const t = url.trim();

  return (
    t !== "" &&
    (t.startsWith("http://") || t.startsWith("https://")) &&
    !t.includes("supabase.co/storage")
  );
}

async function downloadAndUpload(
  supabase: ReturnType<typeof createAdminClient>,
  url: string,
  pathPrefix: string
): Promise<string | null> {
  const res = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (compatible; DnD-Combat-Tracker/1.0)",
    },
  });

  if (!res.ok) return null;

  const buffer = Buffer.from(await res.arrayBuffer());

  const contentType = res.headers.get("content-type");

  const ext =
    getExtensionFromContentType(contentType) || getExtensionFromUrl(url);

  const fullPath = `${pathPrefix}${ext}`;

  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fullPath, buffer, {
      contentType: contentType ?? "image/png",
      upsert: true,
    });

  if (error) return null;

  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(fullPath);

  return publicUrl;
}

async function main() {
  const campaignId = process.argv[2] ?? undefined;

  const supabase = createAdminClient();

  await ensureBucket(supabase);

  const campaignFilter = campaignId ? { campaignId } : {};

  let ok = 0;

  let fail = 0;

  // MainSkill icons
  const mainSkills = await prisma.mainSkill.findMany({
    where: { ...campaignFilter, icon: { not: null } },
    select: { id: true, name: true, icon: true },
  });

  const mainToMigrate = mainSkills.filter(
    (s) => s.icon && isExternalUrl(s.icon)
  );

  if (mainToMigrate.length > 0) {
    console.log(`Migrating ${mainToMigrate.length} MainSkill icons...`);
    for (const ms of mainToMigrate) {
      const url = ms.icon!;

      try {
        const publicUrl = await downloadAndUpload(
          supabase,
          url,
          `main_${ms.id}`
        );

        if (publicUrl) {
          await prisma.mainSkill.update({
            where: { id: ms.id },
            data: { icon: publicUrl },
          });
          console.log(`[ok] MainSkill ${ms.name} -> ${publicUrl}`);
          ok++;
        } else {
          console.warn(`[skip] MainSkill ${ms.name}`);
          fail++;
        }
      } catch (e) {
        console.warn(`[skip] MainSkill ${ms.name}:`, e instanceof Error ? e.message : e);
        fail++;
      }
    }
  }

  // Skill icon and image
  const skills = await prisma.skill.findMany({
    where: campaignId ? { campaignId } : {},
    select: { id: true, name: true, icon: true, image: true },
  });

  for (const skill of skills) {
    for (const [field, pathSuffix] of [
      ["icon", "icon"] as const,
      ["image", "image"] as const,
    ]) {
      const url = field === "icon" ? skill.icon : skill.image;

      if (!url || !isExternalUrl(url)) continue;

      try {
        const publicUrl = await downloadAndUpload(
          supabase,
          url,
          `${skill.id}_${pathSuffix}`
        );

        if (publicUrl) {
          await prisma.skill.update({
            where: { id: skill.id },
            data: { [field]: publicUrl },
          });
          console.log(`[ok] Skill ${skill.name} (${field}) -> ${publicUrl}`);
          ok++;
        } else {
          console.warn(`[skip] Skill ${skill.name} (${field})`);
          fail++;
        }
      } catch (e) {
        console.warn(
          `[skip] Skill ${skill.name} (${field}):`,
          e instanceof Error ? e.message : e
        );
        fail++;
      }
    }
  }

  console.log(`Done. Migrated: ${ok}, failed: ${fail}`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

#!/usr/bin/env tsx
/**
 * Створює у кампанії корінь «Ashan» із зонами королівств, містами та вкладеними картами-фрагментами.
 * Відмовляє, якщо у кампанії вже є будь-яка коренева карта; з --replace видаляє наявні корені (з піддеревом і файлами). Лише локальна БД без --allow-remote.
 *
 *   pnpm seed-world-map <campaignId> [--dry-run] [--replace] [--allow-remote]
 */
import sharp from "sharp";

import { assertSeedTarget } from "./seed-library-lib";
import { ASHAN_CITIES, ASHAN_IMAGE_URL, ASHAN_KINGDOMS, cropPixels, targetSize } from "./world-map-ashan";
import { describeRoot, type ExistingRoot, rootsToReplace } from "./world-map-roots";

import { YEAR_CACHE_SECONDS } from "@/lib/constants/storage";
import { WORLD_MAPS_BUCKET } from "@/lib/constants/world";
import { prisma } from "@/lib/db";
import { listWorldMaps, orphanedImagesOfSubtree } from "@/lib/server/world/map-store";
import { createAdminClient } from "@/lib/supabase/admin";
import { createWorldMapUploadTicket, removeWorldMapFiles } from "@/lib/supabase/world-map-storage";
import { polygonCentroid } from "@/lib/utils/world/geometry";
import { subtreeMapIds } from "@/lib/utils/world/tree";

const ROOT_NAME = "Ashan";

function parseArgs(argv: string[]) {
  const flags = new Set(argv.filter((a) => a.startsWith("--")));

  const [campaignId] = argv.filter((a) => !a.startsWith("--"));

  if (!campaignId) throw new Error("Вкажіть campaignId: pnpm seed-world-map <campaignId> [--dry-run] [--replace] [--allow-remote]");

  return { campaignId, dryRun: flags.has("--dry-run"), replace: flags.has("--replace"), allowRemote: flags.has("--allow-remote") };
}

async function upload(campaignId: string, buf: Buffer) {
  const ticket = await createWorldMapUploadTicket(campaignId, "image/webp");

  if (!ticket.ok) throw new Error(ticket.message);

  const { error } = await createAdminClient().storage.from(WORLD_MAPS_BUCKET).uploadToSignedUrl(ticket.value.path, ticket.value.token, buf, { contentType: "image/webp", cacheControl: YEAR_CACHE_SECONDS });

  if (error) throw new Error(error.message);

  return ticket.value.publicUrl;
}

async function findRoots(campaignId: string): Promise<ExistingRoot[]> {
  const all = await listWorldMaps(campaignId);

  return Promise.all(
    all
      .filter((m) => m.parentMapId === null)
      .map(async (m) => {
        const ids = subtreeMapIds(all, m.id);

        return { id: m.id, name: m.name, maps: ids.length, markers: await prisma.worldMarker.count({ where: { mapId: { in: ids } } }) };
      }),
  );
}

async function removeRoots(campaignId: string, roots: ExistingRoot[]) {
  for (const root of roots) {
    const urls = await orphanedImagesOfSubtree(campaignId, root.id);

    await prisma.worldMap.delete({ where: { id: root.id } });
    await removeWorldMapFiles(campaignId, urls);
  }
}

async function main() {
  const { campaignId, dryRun, replace, allowRemote } = parseArgs(process.argv.slice(2));

  const host = assertSeedTarget(process.env.DATABASE_URL, allowRemote);

  console.info(`БД: ${host}${dryRun ? " (dry-run)" : ""}`);

  const roots = await findRoots(campaignId);

  if (dryRun) {
    console.info(roots.length === 0 ? "Кореневих карт немає" : `Наявні корені: ${roots.map(describeRoot).join(", ")}${replace ? " — будуть видалені" : " — без --replace сід відмовить"}`);

    for (const k of ASHAN_KINGDOMS) {
      const px = cropPixels(k.crop);

      const out = targetSize(px);

      console.info(`${k.name}: crop ${px.width}x${px.height} -> ${out.width}x${out.height}, міст: ${k.cities.length}`);
    }

    return;
  }

  if (!(await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } }))) throw new Error(`Кампанію ${campaignId} не знайдено`);

  const stale = rootsToReplace(roots, replace);

  const res = await fetch(ASHAN_IMAGE_URL);

  if (!res.ok) throw new Error(`Ashan image: HTTP ${res.status}`);

  const source = Buffer.from(await res.arrayBuffer());

  const meta = await sharp(source).metadata();

  for (const r of stale) console.info(`Видаляю корінь ${describeRoot(r)}`);

  await removeRoots(campaignId, stale);

  const rootImage = await sharp(source).webp({ quality: 88 }).toBuffer();

  const root = await prisma.worldMap.create({ data: { campaignId, name: ROOT_NAME, imageUrl: await upload(campaignId, rootImage), width: meta.width ?? 1600, height: meta.height ?? 1066 } });

  for (const city of ASHAN_CITIES) {
    await prisma.worldMarker.create({ data: { mapId: root.id, kind: "point", x: city.x, y: city.y, name: city.name, icon: city.icon, alwaysVisible: city.alwaysVisible } });
  }

  for (const [index, k] of ASHAN_KINGDOMS.entries()) {
    const { x, y } = polygonCentroid(k.polygon);

    const zone = await prisma.worldMarker.create({ data: { mapId: root.id, kind: "zone", x, y, polygon: k.polygon, name: k.name, color: k.color, sortOrder: index } });

    const px = cropPixels(k.crop);

    const size = targetSize(px);

    const fragment = await sharp(source).extract(px).resize({ ...size, kernel: sharp.kernel.lanczos3 }).webp({ quality: 88 }).toBuffer();

    const nested = await prisma.worldMap.create({
      data: { campaignId, parentMarkerId: zone.id, name: k.name, imageUrl: await upload(campaignId, fragment), width: size.width, height: size.height, entryX: 0.5, entryY: 0.5 },
    });

    await prisma.worldMarker.createMany({ data: k.cities.map((c, i) => ({ mapId: nested.id, kind: "point", x: c.x, y: c.y, name: c.name, icon: c.icon, sortOrder: i })) });
    console.info(`${k.name}: ${size.width}x${size.height}`);
  }

  console.info(`Готово (замінено старих коренів: ${stale.length}). http://localhost:3000/campaigns/${campaignId}/dm/world`);
}

main()
  .catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

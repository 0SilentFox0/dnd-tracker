import { type Prisma, PrismaClient } from "@prisma/client";
import { readFileSync } from "node:fs";
import path from "node:path";

import { parseArtifactHtml } from "./parse-artifact";

import { SCENARIO_MAX_VERSIONS } from "@/lib/constants/scenario";
import { scenarioContentSchema } from "@/lib/schemas/scenario";
import { buildSearchText } from "@/lib/utils/scenario/search-text";
import type { ScenarioPageKind, ScenarioPageStatus } from "@/types/scenario";

type Entry = { file: string; kind: ScenarioPageKind; arc?: string; status: ScenarioPageStatus; sortOrder: number; characterName?: string };

async function main() {
  const [manifestPath, campaignId] = process.argv.slice(2);

  const dryRun = process.argv.includes("--dry-run");

  const force = process.argv.includes("--force");

  if (!manifestPath || !campaignId) throw new Error("Usage: pnpm import-scenario <manifest.json> <campaignId> [--dry-run] [--force]");

  const entries = JSON.parse(readFileSync(manifestPath, "utf8")) as Entry[];

  const prisma = new PrismaClient();

  const characters = await prisma.character.findMany({ where: { campaignId }, select: { id: true, name: true } });

  for (const entry of entries) {
    const parsed = parseArtifactHtml(readFileSync(path.join(path.dirname(manifestPath), entry.file), "utf8"), entry.kind);

    const content = scenarioContentSchema.parse(parsed.content);

    const characterId = entry.characterName ? (characters.find((c) => c.name.includes(entry.characterName as string))?.id ?? null) : null;

    if (entry.characterName && !characterId) console.warn(`! персонажа «${entry.characterName}» не знайдено — «${parsed.title}» без прив'язки`);

    const data = {
      campaignId, kind: entry.kind, arc: entry.arc ?? null, title: parsed.title, subtitle: parsed.subtitle, status: entry.status, sortOrder: entry.sortOrder, characterId,
      content: content as unknown as Prisma.InputJsonValue, searchText: buildSearchText(parsed.title, content),
    };

    const existing = await prisma.scenarioPage.findFirst({ where: { campaignId, title: parsed.title }, select: { id: true } });

    // re-import would wipe DM edits and played/revealed flags — existing pages are skipped unless --force
    if (existing && !force) {
      console.info(`skip ${entry.kind} «${parsed.title}»: вже є (перезапис — --force)`);
      continue;
    }

    const bytes = Buffer.byteLength(JSON.stringify(content));

    console.info(`${existing ? "update" : "create"} ${entry.kind} «${parsed.title}»: ${content.sections.length} розділів, ${content.sections.reduce((n, s) => n + s.rows.length, 0)} рядків, ${bytes} байт`);

    if (dryRun) continue;

    if (existing) {
      const current = await prisma.scenarioPage.findUnique({ where: { id: existing.id }, select: { content: true } });

      await prisma.scenarioPageVersion.create({ data: { pageId: existing.id, content: current?.content ?? {}, createdBy: "import" } });
      await prisma.scenarioPage.update({ where: { id: existing.id }, data: { ...data, version: { increment: 1 } } });

      const stale = await prisma.scenarioPageVersion.findMany({ where: { pageId: existing.id }, orderBy: { createdAt: "desc" }, skip: SCENARIO_MAX_VERSIONS, select: { id: true } });

      if (stale.length) await prisma.scenarioPageVersion.deleteMany({ where: { id: { in: stale.map((v) => v.id) } } });
    } else {
      await prisma.scenarioPage.create({ data });
    }
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

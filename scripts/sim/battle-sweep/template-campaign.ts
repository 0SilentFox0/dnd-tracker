import { randomUUID } from "node:crypto";

import type { SweepProfile } from "./profiles";
import type { RowCounts } from "./row-counts";
import { heroRowData, heroSpecsFor } from "./seed-template-heroes";

import { prisma } from "@/lib/db";
import { importPack } from "@/scripts/templates/lib/import-pack";

export interface TemplateRun {
  campaign: any;
  heroIds: string[];
  cleanup: () => Promise<void>;
}

async function importTemporaryTemplate(key: string) {
  const userId = `sweep-${randomUUID()}`;

  await prisma.user.create({ data: { id: userId, email: `${userId}@example.invalid`, displayName: userId } });

  const result = await importPack(key, { owner: userId, publish: false });

  const cleanup = async () => {
    const ids = (await prisma.campaign.findMany({ where: { dmUserId: userId }, select: { id: true } })).map((c) => c.id);

    await prisma.campaign.updateMany({ where: { id: { in: ids } }, data: { baseSourceId: null } });
    for (const model of ["featBase", "spellBase", "artifactBase", "careerBase", "raceBase", "unitBase"] as const) await (prisma as any)[model].deleteMany({ where: { sourceCampaignId: { in: ids } } });
    await prisma.campaign.deleteMany({ where: { id: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: userId } });
  };

  return { campaign: await prisma.campaign.findUniqueOrThrow({ where: { id: result.templateId as string } }), cleanup };
}

export async function openTemplateRun(profile: SweepProfile, campaignId: string | undefined): Promise<TemplateRun> {
  if (profile.source.kind !== "template") throw new Error(`${profile.key} runs on an existing campaign`);

  let campaign: any = campaignId ? await prisma.campaign.findUniqueOrThrow({ where: { id: campaignId } }) : await prisma.campaign.findFirst({ where: { kind: "template", templateKey: profile.key } });

  let dropTemplate = async () => {};

  if (!campaign) {
    if (!profile.source.importIfMissing) throw new Error(`template campaign "${profile.key}" is missing in this database`);

    const imported = await importTemporaryTemplate(profile.key);

    campaign = imported.campaign;
    dropTemplate = imported.cleanup;
  }

  const races = await prisma.race.findMany({ where: { campaignId: campaign.id }, orderBy: { name: "asc" } });

  const classes = await prisma.gameClass.findMany({ where: { campaignId: campaign.id }, orderBy: { name: "asc" } });

  const spells = await prisma.spell.findMany({ where: { campaignId: campaign.id }, orderBy: [{ level: "asc" }, { name: "asc" }], select: { id: true, level: true, concentration: true } });

  const picked = [...spells.filter((s) => s.concentration).slice(0, 2), ...spells.filter((s) => !s.concentration && s.level <= Math.ceil(profile.heroLevel / 2)).slice(0, 8)];

  const heroIds: string[] = [];

  for (const spec of heroSpecsFor(races, classes, profile.heroCount)) {
    const row = await prisma.character.create({ data: heroRowData(spec, profile, { campaignId: campaign.id, controlledBy: campaign.dmUserId, spellIds: picked.map((s) => s.id) }) as any });

    heroIds.push(row.id);
  }

  const cleanup = async () => {
    await prisma.battleScene.deleteMany({ where: { campaignId: campaign.id, name: { startsWith: "ТЕСТ" } } });
    await prisma.character.deleteMany({ where: { id: { in: heroIds } } });
    await dropTemplate();
  };

  return { campaign, heroIds, cleanup };
}

export async function snapshotRowCounts(): Promise<RowCounts> {
  const tables = await prisma.$queryRaw<Array<{ table_name: string }>>`select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE'`;

  const out: RowCounts = {};

  for (const { table_name } of tables) out[table_name] = Number((await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(`select count(*) as n from "${table_name}"`))[0].n);

  return out;
}

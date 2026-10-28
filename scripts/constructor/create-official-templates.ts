#!/usr/bin/env tsx
// pnpm constructor:official-templates <homm5CampaignId> [--owner <userId>] [--allow-remote]
import { assertSeedTarget } from "../seed/seed-library-lib";

import { CampaignKind, CampaignVisibility } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";
import { createCampaignFromBundle } from "@/lib/server/campaigns/create-campaign";
import { emptyBundle } from "@/lib/server/templates/bundle";
import { exportCampaign } from "@/lib/server/templates/export-campaign";

const official = { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL };

function report(label: string, result: { campaign: { id: string }; warnings: string[] }, bundle: Awaited<ReturnType<typeof exportCampaign>>) {
  const counts = Object.entries(bundle).flatMap(([table, rows]) => (Array.isArray(rows) ? [`${table}=${rows.length}`] : []));

  console.info(`${label}: ${result.campaign.id}`);
  console.info(`  ${counts.join(" ")}`);
  for (const w of result.warnings) console.warn(`  попередження: ${w}`);
}

async function main() {
  const args = process.argv.slice(2);

  const [homm5Id] = args.filter((a) => !a.startsWith("--") && args[args.indexOf(a) - 1] !== "--owner");

  const ownerIdx = args.indexOf("--owner");

  const owner = ownerIdx >= 0 ? args[ownerIdx + 1] : undefined;

  if (!homm5Id) throw new Error("Використання: pnpm constructor:official-templates <homm5CampaignId> [--owner <userId>] [--allow-remote]");

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const source = await prisma.campaign.findUniqueOrThrow({ where: { id: homm5Id }, select: { id: true, dmUserId: true } });

  const existingHomm5 = await prisma.campaign.findFirst({ where: { createdFromId: source.id, ...official }, select: { id: true } });

  if (existingHomm5) {
    console.info(`Heroes: вже існує (${existingHomm5.id})`);
  } else {
    const bundle = await exportCampaign(prisma, source.id);

    const result = await createCampaignFromBundle({
      userId: owner ?? source.dmUserId,
      name: "Heroes",
      description: "Six fantasy factions: races, units, spells, artifacts, skills and music",
      bundle,
      createdFromId: source.id,
      ...official,
    });

    report("Heroes", result, bundle);
  }

  const existingEmpty = await prisma.campaign.findFirst({ where: { name: "Порожня", ...official }, select: { id: true } });

  if (existingEmpty) {
    console.info(`Порожня: вже існує (${existingEmpty.id})`);
  } else {
    const bundle = emptyBundle();

    const result = await createCampaignFromBundle({
      userId: owner ?? source.dmUserId,
      name: "Порожня",
      description: "Без контенту, правила за замовчуванням",
      bundle,
      ...official,
    });

    report("Порожня", result, bundle);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

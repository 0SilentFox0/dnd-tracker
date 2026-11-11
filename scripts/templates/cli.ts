#!/usr/bin/env tsx
// pnpm template <index|backfill-keys [--apply]|i18n <extract|apply|normalize|status|convert> <key> <locale>> [...args]
import { i18nCommand } from "./lib/i18n-command";
import { writeIndex } from "./lib/index-gen";

type Command = (args: string[]) => Promise<void> | void;

async function backfillKeys(args: string[]) {
  const [{ assertSeedTarget }, { prisma }, { CampaignKind, CampaignVisibility }, { planKeyBackfill }] = await Promise.all([import("../seed/seed-library-lib"), import("@/lib/db"), import("@/lib/constants/campaigns"), import("./lib/store")]);

  try {
    assertSeedTarget(process.env.DATABASE_URL, false);

    const rows = await prisma.campaign.findMany({ where: { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL }, select: { id: true, name: true, templateKey: true, locale: true } });

    const plan = planKeyBackfill(rows);

    for (const { id, from, to } of plan) console.info(`${id}  ${rows.find((row) => row.id === id)?.name} [${rows.find((row) => row.id === id)?.locale ?? "en"}]: ${from ?? "null"} -> ${to}`);

    console.info(`${plan.length} row(s) to update${args.includes("--apply") ? "" : " (dry run, pass --apply to write)"}`);

    if (args.includes("--apply")) for (const { id, to } of plan) await prisma.campaign.update({ where: { id }, data: { templateKey: to } });
  } finally {
    await prisma.$disconnect();
  }
}

const COMMANDS: Record<string, Command> = {
  index: () => {
    writeIndex();
    console.info("data/templates/manifests.ts and dictionaries.server.ts are up to date");
  },
  "backfill-keys": backfillKeys,
  i18n: (args) => i18nCommand(args),
};

async function main() {
  const [name, ...args] = process.argv.slice(2);

  const command = name ? COMMANDS[name] : undefined;

  if (!command) throw new Error(`Usage: pnpm template <${Object.keys(COMMANDS).join("|")}> [...args]`);

  await command(args);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

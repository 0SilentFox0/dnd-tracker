#!/usr/bin/env tsx
// pnpm template <index|validate|build|import|publish|icons|export|backfill-keys|i18n> ...  (see USAGE)
import { parseCommandArgs } from "./lib/cli-args";
import { i18nCommand } from "./lib/i18n-command";
import { writeIndex } from "./lib/index-gen";
import { readPack } from "./lib/pack";
import { validatePack } from "./lib/validate";

const USAGE = [
  "pnpm template index",
  "pnpm template validate <key>",
  "pnpm template build <key> [--source <dir>] [--init-slugs]",
  "pnpm template import <key> [--owner <userId>] [--dry-run] [--publish] [--allow-untranslated] [--allow-remote]",
  "pnpm template publish <key> [--allow-untranslated] [--allow-remote]",
  "pnpm template icons <key> --dir <images> [--kinds a,b] [--dry-run] [--allow-remote]",
  "pnpm template export <key> --from <campaignId> [--system <system>] [--name <name>] [--slugs <file>]",
  "pnpm template backfill-keys [--apply] [--allow-remote]",
  "pnpm template i18n <extract|apply|normalize|status|convert> <key> <locale>",
].join("\n  ");

type Command = (args: string[]) => Promise<void> | void;

async function backfillKeys(args: string[]) {
  const [{ assertSeedTarget }, { prisma }, { CampaignKind, CampaignVisibility }, { planKeyBackfill }] = await Promise.all([import("../seed/seed-library-lib"), import("@/lib/db"), import("@/lib/constants/campaigns"), import("./lib/store")]);

  try {
    assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

    const rows = await prisma.campaign.findMany({ where: { kind: CampaignKind.TEMPLATE, visibility: CampaignVisibility.OFFICIAL }, select: { id: true, name: true, templateKey: true, locale: true } });

    const plan = planKeyBackfill(rows);

    for (const { id, from, to } of plan) console.info(`${id}  ${rows.find((row) => row.id === id)?.name} [${rows.find((row) => row.id === id)?.locale ?? "en"}]: ${from ?? "null"} -> ${to}`);

    console.info(`${plan.length} row(s) to update${args.includes("--apply") ? "" : " (dry run, pass --apply to write)"}`);

    if (args.includes("--apply")) await prisma.$transaction(plan.map(({ id, to }) => prisma.campaign.update({ where: { id }, data: { templateKey: to } })));
  } finally {
    await prisma.$disconnect();
  }
}

function validate(args: string[]) {
  const { key } = parseCommandArgs(args);

  const issues = validatePack(readPack(key), {});

  for (const issue of issues) console[issue.level === "error" ? "error" : "warn"](`${issue.level}: ${issue.message}`);

  const errors = issues.filter((issue) => issue.level === "error").length;

  console.info(`${key}: ${errors} error(s), ${issues.length - errors} warning(s)`);

  if (errors > 0) process.exitCode = 1;
}

async function build(args: string[]) {
  const { key, flags, options } = parseCommandArgs(args);

  const { buildPack } = await import("./lib/build");

  await buildPack(key, { initSlugs: flags.has("--init-slugs"), args: options["--source"] ? ["--source", options["--source"]] : [] });
}

async function importCommand(args: string[]) {
  const { key, flags, options } = parseCommandArgs(args);

  const [{ importPack }, { prisma }] = await Promise.all([import("./lib/import-pack"), import("@/lib/db")]);

  try {
    const result = await importPack(key, { owner: options["--owner"], dryRun: flags.has("--dry-run"), publish: flags.has("--publish"), allowUntranslated: flags.has("--allow-untranslated"), allowRemote: flags.has("--allow-remote") });

    console.info(JSON.stringify(result.perKind));

    if (Object.values(result.perKind).some((c) => c.errors > 0)) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

async function publish(args: string[]) {
  const { key, flags } = parseCommandArgs(args);

  const [{ publishPack }, { prisma }] = await Promise.all([import("./lib/import-pack"), import("@/lib/db")]);

  try {
    const result = await publishPack(key, { allowUntranslated: flags.has("--allow-untranslated"), allowRemote: flags.has("--allow-remote") });

    console.info(`version ${result.contentVersion}, ${result.changedRows} changed row(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

async function icons(args: string[]) {
  const { key, flags, options } = parseCommandArgs(args);

  if (!options["--dir"]) throw new Error("--dir <images> is required");

  const [{ uploadIcons }, { prisma }] = await Promise.all([import("./lib/icons-upload"), import("@/lib/db")]);

  try {
    const { skipped } = await uploadIcons(key, { dir: options["--dir"], dryRun: flags.has("--dry-run"), allowRemote: flags.has("--allow-remote"), kinds: options["--kinds"]?.split(",") });

    if (skipped > 0) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

const COMMANDS: Record<string, Command> = {
  validate,
  build,
  import: importCommand,
  publish,
  icons,
  export: (args) => import("./lib/export-command").then(({ exportCommand }) => exportCommand(args)),
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

  if (!command) throw new Error(`Usage:\n  ${USAGE}`);

  await command(args);
}

void main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

#!/usr/bin/env tsx
// pnpm constructor:srd-template [--owner <userId>] [--allow-remote]
import { readIcons } from "../assets/tokens-5e/icons-file";
import { assertSeedTarget } from "../seed/seed-library-lib";
import { SRD_CREDITS } from "./lib/credits";
import { readSrdData } from "./lib/data-files";
import { ensureSrdTemplate, formatImportSummary, hasRowErrors, importSrdData, resolveSchoolRefs, SRD_TEMPLATE_NAME, staleSpellColumns, withIcons } from "./lib/load-template";
import { SRD_RULES } from "./lib/rules-preset";
import { makeTemplateStore } from "./lib/template-store";

import { REFERENCE_REVALIDATE_SECONDS } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/translator";
import { importContent, OFFLINE_IMPORT_DEPS } from "@/lib/server/content/import/import-content";
import type { Actor } from "@/lib/utils/api/actor";

const store = makeTemplateStore(SRD_TEMPLATE_NAME);

async function main() {
  const args = process.argv.slice(2);

  const owner = args.includes("--owner") ? args[args.indexOf("--owner") + 1] : undefined;

  assertSeedTarget(process.env.DATABASE_URL, args.includes("--allow-remote"));

  const template = await ensureSrdTemplate(store, { owner, rules: SRD_RULES, credits: SRD_CREDITS });

  console.info(`${SRD_TEMPLATE_NAME}: ${template.id}${template.created ? " (створено)" : ""}`);

  const actor: Actor = { campaignId: template.id, userId: template.dmUserId, isDM: true, via: "session", scopes: null };

  const data = readSrdData();

  const icons = readIcons();

  const schoolIds = async () => new Map((await prisma.spellGroup.findMany({ where: { campaignId: template.id }, select: { id: true, name: true } })).map((g) => [g.name, g.id]));

  const results = await importSrdData(
    data,
    (kind, rows) => importContent(actor, kind, { rows, mode: "update", dryRun: false }, OFFLINE_IMPORT_DEPS),
    async (kind, rows) => (kind === "spell-groups" ? rows : withIcons(kind, data, resolveSchoolRefs(rows, await schoolIds()), icons)),
  );

  for (const { column, names } of staleSpellColumns(data.spells)) await prisma.spell.updateMany({ where: { campaignId: template.id, name: { in: names } }, data: { [column]: null } });

  for (const line of formatImportSummary(results, await getTranslator("uk"))) console.info(line);

  console.info(`Кеш довідника на сервері оновиться протягом ${REFERENCE_REVALIDATE_SECONDS} с`);

  if (hasRowErrors(results)) process.exitCode = 1;
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

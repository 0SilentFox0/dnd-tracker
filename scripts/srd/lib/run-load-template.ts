import { readIcons } from "../../assets/tokens-5e/icons-file";
import { assertSeedTarget } from "../../seed/seed-library-lib";
import { readManifest } from "../../templates/lib/pack";
import { ensureTemplate, makeTemplateStore } from "../../templates/lib/store";
import { SRD_CREDITS } from "./credits";
import { readSrdData } from "./data-files";
import { formatImportSummary, hasRowErrors, importSrdData, resolveSchoolRefs, SRD_TEMPLATE_DESCRIPTION, type SrdSeedArgs, staleSpellColumns, withClassIcons, withIcons } from "./load-template";
import { SRD_RULES } from "./rules-preset";

import { REFERENCE_REVALIDATE_SECONDS } from "@/lib/cache/reference-data";
import { prisma } from "@/lib/db";
import { getTranslator } from "@/lib/i18n/translator";
import { bumpContentVersion } from "@/lib/server/campaigns/version";
import { importContent, OFFLINE_IMPORT_DEPS } from "@/lib/server/content/import/import-content";
import { publishTemplate } from "@/lib/server/templates/publish-service";
import type { Actor } from "@/lib/utils/api/actor";

export async function loadSrdTemplate({ owner, locale, allowRemote }: SrdSeedArgs) {
  try {
    assertSeedTarget(process.env.DATABASE_URL, allowRemote);

    const manifest = readManifest("srd-5.2");

    const store = makeTemplateStore(manifest, locale);

    const template = await ensureTemplate(store, { owner, rules: SRD_RULES, credits: SRD_CREDITS, description: SRD_TEMPLATE_DESCRIPTION });

    console.info(`${manifest.names.en} [${locale}]: ${template.id}${template.created ? " (створено)" : ""}`);

    const actor: Actor = { campaignId: template.id, userId: template.dmUserId, isDM: true, via: "session", scopes: null };

    const data = readSrdData(undefined, locale);

    const icons = readIcons();

    const schoolIds = async () => new Map((await prisma.spellGroup.findMany({ where: { campaignId: template.id }, select: { id: true, name: true } })).map((g) => [g.name, g.id]));

    const results = await importSrdData(
      data,
      (kind, rows) => importContent(actor, kind, { rows, mode: "update", dryRun: false }, OFFLINE_IMPORT_DEPS),
      async (kind, rows) => {
        if (kind === "spell-groups") return rows;

        const withUrls = withIcons(kind, data, resolveSchoolRefs(rows, await schoolIds()), icons);

        return kind === "classes" ? withClassIcons(withUrls, data, icons) : withUrls;
      },
    );

    for (const { column, names } of staleSpellColumns(data.spells)) await prisma.spell.updateMany({ where: { campaignId: template.id, name: { in: names } }, data: { [column]: null } });

    await bumpContentVersion(prisma, template.id);

    const published = await publishTemplate(actor);

    console.info(`Версія шаблону ${published.version}: +${published.added} ~${published.changed} -${published.removed}`);

    for (const line of formatImportSummary(results, await getTranslator("uk"))) console.info(line);

    console.info(`Кеш довідника на сервері оновиться протягом ${REFERENCE_REVALIDATE_SECONDS} с`);

    if (hasRowErrors(results)) process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

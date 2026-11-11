import { assertSeedTarget } from "../../seed/seed-library-lib";
import { readManifest, TEMPLATES_DIR } from "./pack";
import { makeTemplateStore } from "./store";

import { CampaignKind } from "@/lib/constants/campaigns";
import { prisma } from "@/lib/db";

export interface LocaleRow { id: string; name: string; locale: string | null }

/** Pure: ids of clones that still have no content locale. */
export const planLocaleBackfill = (clones: readonly LocaleRow[]): string[] => clones.filter((row) => row.locale === null).map((row) => row.id);

/** D34: clones of a template that predates its English base read Ukrainian rows; mark them `locale` before the first sync against the localized source. */
export async function backfillLocale(key: string, opts: { locale?: string; apply?: boolean; allowRemote?: boolean; dir?: string } = {}): Promise<{ ids: string[]; applied: boolean }> {
  assertSeedTarget(process.env.DATABASE_URL, opts.allowRemote ?? false);

  const { locale = "uk" } = opts;

  const manifest = readManifest(key, opts.dir ?? TEMPLATES_DIR);

  if (!manifest.locales.includes(locale as (typeof manifest.locales)[number])) console.warn(`Pack "${key}" does not list locale "${locale}" yet`);

  const template = await makeTemplateStore(manifest).findTemplate();

  if (!template) throw new Error(`No official template for "${key}" in the database`);

  const clones = await prisma.campaign.findMany({ where: { createdFromId: template.id, kind: { not: CampaignKind.TEMPLATE } }, select: { id: true, name: true, locale: true }, orderBy: { createdAt: "asc" } });

  const ids = planLocaleBackfill(clones);

  for (const clone of clones.filter((row) => ids.includes(row.id))) console.info(`${clone.id}  ${clone.name}: null -> ${locale}`);

  console.info(`${ids.length} of ${clones.length} clone(s) to update${opts.apply ? "" : " (dry run, pass --apply to write)"}`);

  if (opts.apply && ids.length > 0) await prisma.$transaction([prisma.campaign.updateMany({ where: { id: { in: ids }, locale: null }, data: { locale } })]);

  return { ids, applied: !!opts.apply };
}

import { assertSeedTarget } from "../../seed/seed-library-lib";
import { readManifest, TEMPLATES_DIR } from "./pack";
import { makeTemplateStore } from "./store";

import { prisma } from "@/lib/db";

export interface LocaleRow { id: string; name: string; locale: string | null }

export const planLocaleBackfill = (clones: readonly LocaleRow[]): string[] => clones.filter((row) => row.locale === null).map((row) => row.id);

/** D34: clones of a template that predates its English base read Ukrainian rows; mark them `locale` before the first sync against the localized source. */
export async function backfillLocale(key: string, opts: { locale?: string; apply?: boolean; allowRemote?: boolean; dir?: string } = {}): Promise<{ ids: string[]; applied: boolean }> {
  assertSeedTarget(process.env.DATABASE_URL, opts.allowRemote ?? false);

  const { locale = "uk" } = opts;

  const manifest = readManifest(key, opts.dir ?? TEMPLATES_DIR);

  if (!manifest.locales.includes(locale as (typeof manifest.locales)[number])) console.warn(`Pack "${key}" does not list locale "${locale}" yet`);

  const template = await makeTemplateStore(manifest).findTemplate();

  if (!template) throw new Error(`No official template for "${key}" in the database`);

  const clones = await prisma.campaign.findMany({ where: { createdFromId: template.id }, select: { id: true, name: true, locale: true }, orderBy: { createdAt: "asc" } });

  const ids = planLocaleBackfill(clones);

  for (const clone of clones.filter((row) => ids.includes(row.id))) console.info(`${clone.id}  ${clone.name}: null -> ${locale}`);

  const histogram = clones.reduce<Record<string, number>>((acc, row) => ({ ...acc, [row.locale ?? "null"]: (acc[row.locale ?? "null"] ?? 0) + 1 }), {});

  console.info(`clone locales: ${Object.entries(histogram).map(([locale, count]) => `${locale}=${count}`).join(", ") || "none"}`);

  console.info(`${ids.length} of ${clones.length} clone(s) to update${opts.apply ? "" : " (dry run, pass --apply to write)"}`);

  if (opts.apply && ids.length > 0) await prisma.campaign.updateMany({ where: { id: { in: ids }, locale: null }, data: { locale } });

  return { ids, applied: !!opts.apply };
}

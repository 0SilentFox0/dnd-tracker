import { type Bundle, BUNDLE_TABLES, BundleInvalidError, delegateOf, pick, SETTINGS_SELECT, settingsOf, type TemplateDb } from "./bundle";

import { type CompendiumBundleDb,exportCompendiumSection } from "@/lib/server/compendium-import/bundle";
import { parseRules } from "@/lib/utils/rules/schema";

export async function exportCampaign(db: TemplateDb, campaignId: string): Promise<Bundle> {
  const campaign = await db.campaign.findUnique({
    where: { id: campaignId },
    select: { ...SETTINGS_SELECT, rules: true, credits: true },
  });

  if (!campaign) throw new BundleInvalidError("Кампанію не знайдено");

  const bundle: Record<string, unknown> = {
    formatVersion: 1,
    settings: settingsOf(campaign),
    rules: parseRules(campaign.rules),
    credits: campaign.credits ?? null,
  };

  for (const t of BUNDLE_TABLES) {
    const rows = await delegateOf(db, t).findMany({
      where: { campaignId },
      select: Object.fromEntries(t.columns.map((c) => [c, true])),
      orderBy: [{ createdAt: "asc" }, { id: "asc" }],
    });

    bundle[t.key] = rows.map((row) => pick(row, t.columns));
  }

  if (db.compendiumEntry && db.compendiumSource && db.scenarioPage) {
    const section = await exportCompendiumSection(db as CompendiumBundleDb, campaignId);

    if (section) bundle.compendium = section;
  }

  return bundle as Bundle;
}

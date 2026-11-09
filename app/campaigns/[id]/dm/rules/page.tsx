import { HudFormPage } from "@/components/hud/form";
import { HudPage, HudPageHeader, HudPanel } from "@/components/hud/page";
import { RulesForm } from "@/components/rules/RulesForm";
import { ExtendLocaleScope } from "@/lib/i18n/extend-locale-scope";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { requireCampaignDMOrDemo } from "@/lib/server/campaigns/access";
import { isWfrpCampaign } from "@/lib/server/campaigns/system-key";
import { MECHANIC_REGISTRY } from "@/lib/utils/rules";
import { parseRules } from "@/lib/utils/rules/schema";

export default async function DMRulesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const { campaign, isDemo } = await requireCampaignDMOrDemo(id);

  const t = await getTranslator(await getRequestLocale(), "rules");

  if (isDemo) {
    const rules = parseRules(campaign.rules);

    return (
      <HudPage>
        <HudPageHeader title={t("page.title")} />
        <div className="space-y-3">
          {Object.keys(MECHANIC_REGISTRY).map((key) => (
            <HudPanel key={key}>
              <h2 className="hud-sc mb-2 text-lg text-hud-ink">{t("mechanics." + key + ".label")}</h2>
              <pre className="overflow-x-auto whitespace-pre-wrap text-xs text-hud-bone">{JSON.stringify(rules[key as keyof typeof rules], null, 2)}</pre>
            </HudPanel>
          ))}
        </div>
      </HudPage>
    );
  }

  const form = (
    <HudFormPage title={t("page.title")}>
      <RulesForm campaignId={id} />
    </HudFormPage>
  );

  return (await isWfrpCampaign(id)) ? <ExtendLocaleScope namespaces={["battleWfrp", "wfrpDowntime"]}>{form}</ExtendLocaleScope> : form;
}

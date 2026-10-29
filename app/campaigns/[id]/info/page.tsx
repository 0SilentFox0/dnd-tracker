import Link from "next/link";

import { InfoReferenceClient } from "@/components/campaigns/info/InfoReferenceClient";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { loadArtifactReference } from "@/lib/cache/artifact-reference";
import { getCachedInfoReference } from "@/lib/cache/info-reference";
import { getCachedClasses } from "@/lib/cache/reference-data";
import { getRequestLocale } from "@/lib/i18n/request-locale";
import { getTranslator } from "@/lib/i18n/translator";
import { requireCampaignMember } from "@/lib/server/campaigns/access";
import { toClassForReference } from "@/lib/utils/campaigns/info-reference";
import { toGameClassData } from "@/lib/utils/characters/classes/row";
import { parseRules } from "@/lib/utils/rules/schema";

export default async function CampaignInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;

  const t = await getTranslator(await getRequestLocale(), "dashboard");

  const { isDM, campaign } = await requireCampaignMember(campaignId);

  const classesEnabled = parseRules(campaign.rules).classes.enabled;

  const [{ skills, spells }, { artifacts, sets }, classRows] = await Promise.all([
    getCachedInfoReference(campaignId),
    loadArtifactReference(campaignId),
    classesEnabled ? getCachedClasses(campaignId) : null,
  ]);

  const classes = classRows ? classRows.map((row) => toClassForReference(toGameClassData(row))) : null;

  return (
    <HudPage width="md">
      <HudPageHeader
        title={t("info.title")}
        subtitle={t(classes ? "info.subtitleClasses" : "info.subtitleSkills")}
        actions={
          <Button variant="outline" className="min-h-11 touch-manipulation sm:min-h-9 shrink-0" asChild>
            <Link href={`/campaigns/${campaignId}`}>{t("info.back")}</Link>
          </Button>
        }
      />

      <InfoReferenceClient
        campaignId={campaignId}
        skills={classes ? [] : skills}
        classes={classes}
        spells={spells}
        artifacts={artifacts}
        artifactSets={sets}
        isDM={isDM}
      />
    </HudPage>
  );
}

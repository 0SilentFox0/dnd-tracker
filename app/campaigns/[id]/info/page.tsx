import Link from "next/link";

import { InfoReferenceClient } from "@/components/campaigns/info/InfoReferenceClient";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { loadArtifactReference } from "@/lib/cache/artifact-reference";
import { getCachedInfoReference } from "@/lib/cache/info-reference";
import { getCachedClasses } from "@/lib/cache/reference-data";
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
        title="Інформація — Довідник"
        subtitle={classes ? "Класи, заклинання та артефакти кампанії: як діють, опис вигляду, у кого артефакти." : "Скіли, заклинання та артефакти кампанії: як діють, опис вигляду, у кого артефакти."}
        actions={
          <Button variant="outline" className="min-h-11 touch-manipulation sm:min-h-9 shrink-0" asChild>
            <Link href={`/campaigns/${campaignId}`}>Назад до кампанії</Link>
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

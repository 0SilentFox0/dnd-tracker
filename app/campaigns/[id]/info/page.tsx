import Link from "next/link";

import { InfoReferenceClient } from "@/components/campaigns/info/InfoReferenceClient";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { loadArtifactReference } from "@/lib/cache/artifact-reference";
import { getCachedInfoReference } from "@/lib/cache/info-reference";
import { requireCampaignMember } from "@/lib/server/campaigns/access";

export default async function CampaignInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;

  const { isDM } = await requireCampaignMember(campaignId);

  const [{ skills, spells }, { artifacts, sets }] = await Promise.all([getCachedInfoReference(campaignId), loadArtifactReference(campaignId)]);

  return (
    <HudPage width="md">
      <HudPageHeader
        title="Інформація — Довідник"
        subtitle="Скіли, заклинання та артефакти кампанії: як діють, опис вигляду, у кого артефакти."
        actions={
          <Button variant="outline" className="min-h-11 touch-manipulation sm:min-h-9 shrink-0" asChild>
            <Link href={`/campaigns/${campaignId}`}>Назад до кампанії</Link>
          </Button>
        }
      />

      <InfoReferenceClient
        campaignId={campaignId}
        skills={skills}
        spells={spells}
        artifacts={artifacts}
        artifactSets={sets}
        isDM={isDM}
      />
    </HudPage>
  );
}

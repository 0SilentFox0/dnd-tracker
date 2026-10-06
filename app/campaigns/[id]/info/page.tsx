import Link from "next/link";

import { InfoReferenceClient } from "@/components/campaigns/info/InfoReferenceClient";
import { HudPage, HudPageHeader } from "@/components/hud/page";
import { Button } from "@/components/ui/button";
import { getCachedInfoReference } from "@/lib/cache/info-reference";
import { requireCampaignMember } from "@/lib/campaigns/access";

export default async function CampaignInfoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: campaignId } = await params;

  const { isDM } = await requireCampaignMember(campaignId);

  const { skills, spells } = await getCachedInfoReference(campaignId);

  return (
    <HudPage width="md">
      <HudPageHeader
        title="Інформація — Довідник"
        subtitle="Усі скіли та заклинання кампанії: як діють, опис вигляду. Для гравців — ознайомлення з механіками."
        actions={
          <Link href={`/campaigns/${campaignId}`} className="shrink-0">
            <Button variant="outline" className="min-h-11 touch-manipulation sm:min-h-9">
              Назад до кампанії
            </Button>
          </Link>
        }
      />

      <InfoReferenceClient
        campaignId={campaignId}
        skills={skills}
        spells={spells}
        isDM={isDM}
      />
    </HudPage>
  );
}

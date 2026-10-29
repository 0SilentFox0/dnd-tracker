import { DMSpellsPageClient } from "./page-client";

import { spellKeys } from "@/lib/hooks/spells/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { requireCampaignDM } from "@/lib/server/campaigns/access";
import { readSpells } from "@/lib/server/spells/read-spells";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { Spell } from "@/types/spells";

export default async function DMSpellsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  await requireCampaignDM(id);

  const spells = await readOkJson<Spell[]>(await readSpells({ id, accessChecked: true }));

  return (
    <PrefetchedQuery queryKey={spellKeys.list(id)} data={spells}>
      <DMSpellsPageClient campaignId={id} />
    </PrefetchedQuery>
  );
}

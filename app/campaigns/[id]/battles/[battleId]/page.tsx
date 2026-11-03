import { BattlePageClient } from "./BattlePageClient";

import { getSessionUserId } from "@/lib/auth";
import { battleQueryKey } from "@/lib/hooks/battles/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { buildDemoEncounter } from "@/lib/server/battles/demo-encounter";
import { readBattleScene } from "@/lib/server/battles/read-battle";
import { requireCampaignMember } from "@/lib/server/campaigns/access";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { BattleScene } from "@/types/api";

export default async function BattlePage({ params }: { params: Promise<{ id: string; battleId: string }> }) {
  const { id, battleId } = await params;

  const [userId, { isDemo }, battle] = await Promise.all([
    getSessionUserId(),
    requireCampaignMember(id),
    readBattleScene({ id, battleId }).then((res) => readOkJson<BattleScene>(res)),
  ]);

  const demoScene = isDemo && battle ? { ...battle, initiativeOrder: await buildDemoEncounter(battle) } : null;

  return (
    <PrefetchedQuery queryKey={battleQueryKey(id, battleId)} data={battle}>
      <BattlePageClient campaignId={id} battleId={battleId} userId={userId} demoScene={demoScene} />
    </PrefetchedQuery>
  );
}

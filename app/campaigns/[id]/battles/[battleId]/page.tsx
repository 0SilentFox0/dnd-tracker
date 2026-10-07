import { BattlePageClient } from "./BattlePageClient";

import { getSessionUserId } from "@/lib/auth";
import { battleQueryKey } from "@/lib/hooks/battles/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { readOkJson } from "@/lib/utils/api/read-json";
import { readBattleScene } from "@/lib/utils/battle/pipeline/read-battle";
import type { BattleScene } from "@/types/api";

export default async function BattlePage({ params }: { params: Promise<{ id: string; battleId: string }> }) {
  const { id, battleId } = await params;

  const [userId, battle] = await Promise.all([
    getSessionUserId(),
    readBattleScene({ id, battleId }).then((res) => readOkJson<BattleScene>(res)),
  ]);

  return (
    <PrefetchedQuery queryKey={battleQueryKey(id, battleId)} data={battle}>
      <BattlePageClient campaignId={id} battleId={battleId} userId={userId} />
    </PrefetchedQuery>
  );
}

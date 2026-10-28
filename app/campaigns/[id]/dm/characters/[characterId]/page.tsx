import { CharacterProfile } from "@/components/character-profile";
import { campaignKeys } from "@/lib/hooks/campaigns/keys";
import { characterKeys } from "@/lib/hooks/characters/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { loadRules } from "@/lib/server/campaigns/rules";
import { readCharacterSheet } from "@/lib/server/characters/core/read-sheet";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { CharacterSheet } from "@/types/characters";

export default async function DmCharacterPage({ params, searchParams }: { params: Promise<{ id: string; characterId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id, characterId }, { tab }] = await Promise.all([params, searchParams]);

  const [sheet, rules] = await Promise.all([readOkJson<CharacterSheet>(await readCharacterSheet({ id, characterId })), loadRules(id)]);

  return (
    <PrefetchedQuery queryKey={characterKeys.sheet(id, characterId)} data={sheet}>
      <PrefetchedQuery queryKey={campaignKeys.rules(id)} data={rules}>
        <CharacterProfile campaignId={id} characterId={characterId} canEdit initialTab={tab} />
      </PrefetchedQuery>
    </PrefetchedQuery>
  );
}

import { readCharacterSheet } from "@/app/api/campaigns/[id]/characters/[characterId]/sheet/read-sheet";
import { CharacterProfile } from "@/components/character-profile";
import { characterSheetKey } from "@/lib/hooks/characters/keys";
import { PrefetchedQuery } from "@/lib/providers/prefetched-query";
import { readOkJson } from "@/lib/utils/api/read-json";
import type { CharacterSheet } from "@/types/characters";

export default async function DmCharacterPage({ params, searchParams }: { params: Promise<{ id: string; characterId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const [{ id, characterId }, { tab }] = await Promise.all([params, searchParams]);

  const sheet = await readOkJson<CharacterSheet>(await readCharacterSheet({ id, characterId }));

  return (
    <PrefetchedQuery queryKey={characterSheetKey(id, characterId)} data={sheet}>
      <CharacterProfile campaignId={id} characterId={characterId} canEdit initialTab={tab} />
    </PrefetchedQuery>
  );
}

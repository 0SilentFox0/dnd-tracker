"use client";

import { Suspense, use } from "react";

import { CharacterProfile } from "@/components/character-profile";
import { LoadingState } from "@/components/common/states";

export default function DmCharacterPage({ params }: { params: Promise<{ id: string; characterId: string }> }) {
  const { id, characterId } = use(params);

  return (
    <Suspense fallback={<LoadingState rows={6} />}>
      <CharacterProfile campaignId={id} characterId={characterId} canEdit />
    </Suspense>
  );
}

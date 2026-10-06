"use client";

import { use } from "react";

import { CharacterProfile } from "@/components/character-profile";

export default function DmCharacterPage({ params, searchParams }: { params: Promise<{ id: string; characterId: string }>; searchParams: Promise<{ tab?: string }> }) {
  const { id, characterId } = use(params);

  const { tab } = use(searchParams);

  return <CharacterProfile campaignId={id} characterId={characterId} canEdit initialTab={tab} />;
}

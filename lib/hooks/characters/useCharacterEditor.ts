"use client";

import { useEffect, useRef, useState } from "react";

import { useCharacterForm } from "./useCharacterForm";
import { useCharacter, useUpdateCharacter } from "./useCharacters";

import { useCampaignMembers } from "@/lib/hooks/campaigns";
import { useRaces } from "@/lib/hooks/races";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { EquippedItems } from "@/types/inventory";

export function useCharacterEditor({ campaignId, characterId, onSaved }: { campaignId: string; characterId: string; onSaved: () => void }) {
  const query = useCharacter(campaignId, characterId);

  const update = useUpdateCharacter(campaignId, characterId);

  const { members, loading: membersLoading } = useCampaignMembers(campaignId);

  const { data: races = [] } = useRaces(campaignId);

  const [equipped, setEquipped] = useState<EquippedItems>({});

  const form = useCharacterForm({
    onSubmit: async (data) => {
      await update.mutateAsync(data);
      onSaved();
    },
  });

  const { setFormData } = form;

  // Refetches (focus, invalidation) must not overwrite what the user is typing.
  const seededFor = useRef<string | null>(null);

  useEffect(() => {
    if (!query.data || seededFor.current === characterId) return;

    seededFor.current = characterId;
    setFormData(characterToFormData(query.data));
    setEquipped((query.data.inventory?.equipped as EquippedItems) ?? {}); // eslint-disable-line react-hooks/set-state-in-effect -- seed from the first server snapshot
  }, [query.data, characterId, setFormData]);

  return { query, form, equipped, setEquipped, members, membersLoading, races };
}

export type CharacterEditor = ReturnType<typeof useCharacterEditor>;

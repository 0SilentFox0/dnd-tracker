"use client";

import { useEffect, useState } from "react";

import { useCharacterForm } from "./useCharacterForm";
import { useCharacter, useUpdateCharacter } from "./useCharacters";

import { ApiError } from "@/lib/api/client";
import { useCampaignMembers } from "@/lib/hooks/campaigns";
import { useRaces } from "@/lib/hooks/races";
import { useRuleSystem } from "@/lib/hooks/systems";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import { statColumnsOf } from "@/lib/utils/rules/systems/stats";
import type { EquippedItems } from "@/types/inventory";

export function useCharacterEditor({ campaignId, characterId, onSaved }: { campaignId: string; characterId: string; onSaved: () => void }) {
  const query = useCharacter(campaignId, characterId);

  const update = useUpdateCharacter(campaignId, characterId);

  const { members, isLoading: membersLoading } = useCampaignMembers(campaignId);

  const { data: races = [] } = useRaces(campaignId);

  const progressionOf = (race: string) => races.find((r) => r.name === race)?.spellSlotProgression;

  const [equipped, setEquipped] = useState<EquippedItems>({});

  const { system } = useRuleSystem({ campaignId });

  const [seededFor, setSeededFor] = useState<string | null>(null);

  const form = useCharacterForm({
    requireRace: system?.lineage,
    requireClass: system ? statColumnsOf(system).has("classes") : undefined,
    onSubmit: async (data) => {
      const saved = await update.mutateAsync(data).catch(async (e: unknown) => {
        if (e instanceof ApiError && e.status === 409) {
          await query.refetch();
          setSeededFor(null);
        }

        throw e;
      });

      onSaved();

      return characterToFormData(saved, progressionOf(saved.race));
    },
  });

  const { setFormData } = form.actions;

  // Seed once from data fetched on this mount: a cached snapshot may predate saves made elsewhere,
  // and later refetches must not overwrite what the user is typing.
  const freshData = query.isFetchedAfterMount ? query.data : undefined;

  useEffect(() => {
    if (!freshData || seededFor === characterId) return;

    setFormData(characterToFormData(freshData, progressionOf(freshData.race)));
    setEquipped((freshData.inventory?.equipped as EquippedItems) ?? {}); // eslint-disable-line react-hooks/set-state-in-effect -- seed from the first server snapshot
    setSeededFor(characterId);
  }, [freshData, characterId, seededFor, setFormData]); // eslint-disable-line react-hooks/exhaustive-deps -- races only inform the default of an empty slot table

  return { query, ready: seededFor === characterId, form, equipped, setEquipped, options: { members, membersLoading, races } };
}

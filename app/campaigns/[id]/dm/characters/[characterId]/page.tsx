"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { CharacterViewClient } from "../../../character/character-view-client";
import { DmCharacterEditForm } from "./DmCharacterEditForm";

import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { getArtifacts } from "@/lib/api/artifacts";
import { getCharacter, updateCharacter } from "@/lib/api/characters";
import { useCampaignMembers } from "@/lib/hooks/campaigns";
import { useCharacterForm } from "@/lib/hooks/characters";
import { useRaces } from "@/lib/hooks/races";
import { characterToFormData } from "@/lib/utils/characters/character-form";
import type { Character } from "@/types/characters";
import type { EquippedItems } from "@/types/inventory";

export default function EditCharacterPage({
  params,
}: {
  params: Promise<{ id: string; characterId: string }>;
}) {
  const { id, characterId } = use(params);

  const router = useRouter();

  const queryClient = useQueryClient();

  const { members, loading: membersLoading } = useCampaignMembers(id);

  const { data: races = [] } = useRaces(id);

  const [characterLoaded, setCharacterLoaded] = useState(false);

  const [equipped, setEquipped] = useState<EquippedItems>({});

  /** Перемикач: показувати сторінку як для гравця (read-only + дерево скілів) */
  const [viewAsPlayer, setViewAsPlayer] = useState(false);

  const { data: artifacts = [] } = useQuery({
    queryKey: ["artifacts", id],
    queryFn: () => getArtifacts(id),
    enabled: !!id && characterLoaded,
  });

  const {
    formData,
    loading,
    error,
    basicInfo,
    abilityScores,
    combatStats,
    skills,
    abilities,
    spellcasting,
    handleSubmit,
    setFormData,
  } = useCharacterForm({
    onSubmit: async (data) => {
      await updateCharacter(id, characterId, data);
      router.push(`/campaigns/${id}/dm/characters`);
    },
  });

  useEffect(() => {
    let cancelled = false;

    const fetchCharacter = async () => {
      try {
        const character: Character = await getCharacter(id, characterId);

        if (cancelled) return;

        const formDataFromCharacter = characterToFormData(character);

        setFormData(formDataFromCharacter);
        setEquipped((character.inventory?.equipped as EquippedItems) ?? {});
        setCharacterLoaded(true);
      } catch (err) {
        if (!cancelled) {
          console.error("Error fetching character:", err);
          setCharacterLoaded(true);
        }
      }
    };

    fetchCharacter();

    return () => {
      cancelled = true;
    };
  }, [id, characterId, setFormData]);

  if (!characterLoaded || (loading && !formData.basicInfo.name)) {
    return (
      <div className="container mx-auto p-4 max-w-4xl">
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-muted-foreground">Завантаження...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 max-w-5xl space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-muted/40 px-4 py-3">
        <div className="flex items-center gap-2">
          <Switch
            id="view-as-player"
            checked={viewAsPlayer}
            onCheckedChange={setViewAsPlayer}
          />
          <Label htmlFor="view-as-player" className="cursor-pointer">
            Перегляд як гравець
          </Label>
        </div>
        <span className="text-sm text-muted-foreground">
          {viewAsPlayer ? "Вигляд для гравця (isPlayer)" : "Редагування (DM)"}
        </span>
      </div>

      {viewAsPlayer ? (
        <CharacterViewClient
          campaignId={id}
          characterId={characterId}
          allowPlayerEdit={false}
        />
      ) : (
        <DmCharacterEditForm
          campaignId={id}
          characterId={characterId}
          formData={formData}
          setFormData={setFormData}
          basicInfo={basicInfo}
          abilityScores={abilityScores}
          combatStats={combatStats}
          skills={skills}
          abilities={abilities}
          spellcasting={spellcasting}
          handleSubmit={handleSubmit}
          error={error}
          members={members}
          races={races}
          equipped={equipped}
          setEquipped={setEquipped}
          artifacts={artifacts}
          loading={loading}
          membersLoading={membersLoading}
          queryClient={queryClient}
        />
      )}
    </div>
  );
}

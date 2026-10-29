"use client";

import { useTranslations } from "next-intl";

import { CharacterChoicesPanel } from "@/components/choices/CharacterChoicesPanel";
import { LoadingState } from "@/components/common/states";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useCharacter } from "@/lib/hooks/characters";
import { choicesStateOf } from "@/lib/utils/characters/choices/picks";

interface ChoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  characterId: string;
}

export default function ChoicesDialog({ open, onOpenChange, campaignId, characterId }: ChoicesDialogProps) {
  const t = useTranslations("characterProfile.choices");

  const { data: character } = useCharacter(campaignId, characterId);

  const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

  const state = character ? choicesStateOf(character) : null;

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title={t("title")} size="lg">
      {!character || !state ? (
        <LoadingState rows={3} label={t("loadingHero")} />
      ) : (
        <CharacterChoicesPanel
          campaignId={campaignId}
          characterId={characterId}
          initial={state}
          hero={{
            race: character.race,
            level: character.level,
            scores: { strength: character.strength, dexterity: character.dexterity, constitution: character.constitution, intelligence: character.intelligence, wisdom: character.wisdom, charisma: character.charisma },
            skills: character.skills,
            classMode: classesEnabled && state.classes.length > 0,
          }}
          onSaved={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDialog>
  );
}

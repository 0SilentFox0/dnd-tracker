"use client";

import { useTranslations } from "next-intl";

import { ChoiceWizard } from "@/components/choices/ChoiceWizard";
import { LoadingState } from "@/components/common/states";
import { ResponsiveDialog } from "@/components/ui/responsive-dialog";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useCharacter, useChoiceRefs } from "@/lib/hooks/characters";
import { choicesStateOf } from "@/lib/utils/characters/choices/picks";

interface ChoicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  campaignId: string;
  characterId: string;
  /** pick.key зі «Шляху»: відкрити майстер на цьому виборі (`subclass` — крок підкласу) */
  startAt?: string;
}

export default function ChoicesDialog({ open, onOpenChange, campaignId, characterId, startAt }: ChoicesDialogProps) {
  const t = useTranslations("characterProfile.choices");

  const { data: character } = useCharacter(campaignId, characterId);

  const classesEnabled = !!useCampaignRules(campaignId).data?.classes.enabled;

  const refs = useChoiceRefs(campaignId, character?.race ?? "");

  const state = character ? choicesStateOf(character) : null;

  return (
    <ResponsiveDialog hud open={open} onOpenChange={onOpenChange} title={t("title")} size="lg">
      {!character || !state || !refs.ready ? (
        <LoadingState rows={3} label={t("loadingHero")} />
      ) : (
        <ChoiceWizard
          campaignId={campaignId}
          characterId={characterId}
          initial={state}
          refs={refs}
          startAt={startAt}
          hero={{
            level: character.level,
            scores: { strength: character.strength, dexterity: character.dexterity, constitution: character.constitution, intelligence: character.intelligence, wisdom: character.wisdom, charisma: character.charisma },
            skills: character.skills,
            classMode: classesEnabled && state.classes.length > 0,
          }}
          onClose={() => onOpenChange(false)}
        />
      )}
    </ResponsiveDialog>
  );
}

"use client";

import { Pencil, Trash2, TrendingUp } from "lucide-react";

import { HeroPortrait } from "@/components/character-profile/HeroPortrait";
import { ActionsMenu } from "@/components/common/ActionsMenu";
import { HudCard, HudPill, HudStatChip } from "@/components/hud/page";
import { CharacterType } from "@/lib/constants/characters";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useClassMode } from "@/lib/hooks/classes";
import { characterBaseHp } from "@/lib/utils/characters/hero-hp";
import { heroHpFormula } from "@/lib/utils/rules";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { CharacterListItem } from "@/types/characters";

interface DmCharacterCardProps {
  character: CharacterListItem;
  campaignId: string;
  busy: boolean;
  actions: { onLevelUp?: () => void; onDelete: () => void };
}

export function DmCharacterCard({ character, campaignId, busy, actions }: DmCharacterCardProps) {
  const { data: rules } = useCampaignRules(campaignId);

  const classMode = useClassMode(campaignId);

  const entries = classMode.enabled && character.classes?.length ? resolveClassEntries(character.classes, classMode.byId) : null;

  const isNpc = character.type === CharacterType.NPC_HERO;

  return (
    <HudCard className="space-y-3 p-3">
      <HeroPortrait src={character.avatar} name={character.name} className="max-h-72" />
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 space-y-1">
          <p className="hud-sc truncate text-lg leading-6 text-hud-ink">{character.name}</p>
          <p className="truncate text-xs text-hud-muted">
            {character.race}
            {character.subrace ? ` (${character.subrace})` : ""} · {character.class}
          </p>
          <div className="flex min-w-0 items-center gap-1.5">
            <HudPill tone={isNpc ? "silver" : "gold"}>{isNpc ? "NPC герой" : "Гравець"}</HudPill>
            {!isNpc && <span className="truncate text-xs text-hud-muted">{character.user?.displayName || "Не призначено"}</span>}
          </div>
        </div>
        <ActionsMenu
          label="Дії персонажа"
          triggerClassName="h-8 w-8 shrink-0 rounded-full text-hud-gold hover:bg-transparent hover:text-hud-gold-strong"
          onTriggerClick={(e) => e.preventDefault()}
          actions={[
            { label: "Редагувати", icon: Pencil, href: `/campaigns/${campaignId}/dm/characters/${character.id}` },
            ...(actions.onLevelUp
              ? [{ label: "Підняти рівень", icon: TrendingUp, onSelect: actions.onLevelUp, disabled: busy }]
              : []),
            { label: "Видалити", icon: Trash2, onSelect: actions.onDelete, destructive: true, separatorBefore: true },
          ]}
        />
      </div>
      <div className="flex gap-1.5">
        <HudStatChip short="Рів" value={character.level} />
        <HudStatChip short="HP" value={characterBaseHp(character, { entries, formula: rules && heroHpFormula(rules.heroScaling) }).total} />
        <HudStatChip short="AC" value={character.armorClass} />
        <HudStatChip short="Ініц" value={character.initiative} />
      </div>
    </HudCard>
  );
}

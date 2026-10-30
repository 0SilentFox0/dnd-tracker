"use client";

import { useTranslations } from "next-intl";
import { Pencil, Trash2, TrendingUp } from "lucide-react";

import { HeroPortrait } from "@/components/character-profile/HeroPortrait";
import { ActionsMenu } from "@/components/common/ActionsMenu";
import { HudCard, HudPill, HudStatChip } from "@/components/hud/page";
import { CharacterType } from "@/lib/constants/characters";
import { levelUpAvailable } from "@/lib/constants/experience";
import { useCampaignRules } from "@/lib/hooks/campaigns";
import { useClassMode } from "@/lib/hooks/classes";
import { characterBaseHp } from "@/lib/utils/characters/hero-hp";
import { currentHp } from "@/lib/utils/characters/resources/hp";
import { heroHpFormula } from "@/lib/utils/rules";
import { resolveClassEntries } from "@/lib/utils/spells/class-slots";
import type { CharacterListItem } from "@/types/characters";

interface DmCharacterCardProps {
  character: CharacterListItem;
  campaignId: string;
  busy: boolean;
  maxLevel?: number;
  actions: { onLevelUp?: () => void; onDelete: () => void };
}

export function DmCharacterCard({ character, campaignId, busy, maxLevel = 20, actions }: DmCharacterCardProps) {
  const t = useTranslations("characters.card");

  const tc = useTranslations("common.actions");

  const { data: rules } = useCampaignRules(campaignId);

  const classMode = useClassMode(campaignId);

  const classPick = classMode.enabled && !!character.classes?.length;

  const entries = classMode.enabled && character.classes?.length ? resolveClassEntries(character.classes, classMode.byId) : null;

  const ooc = rules?.outOfCombat;

  const maxHp = characterBaseHp(character, { entries, formula: rules && heroHpFormula(rules.heroScaling) }).total;

  const hp = ooc?.persistResources && character.resources ? currentHp(character.resources, maxHp) : maxHp;

  const levelReady = !!ooc?.xp && levelUpAvailable({ level: character.level, experience: character.experience ?? 0 }, maxLevel);

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
            <HudPill tone={isNpc ? "silver" : "gold"}>{isNpc ? t("npcHero") : t("player")}</HudPill>
            {ooc?.inspiration && character.inspiration && <span title={t("inspiration")} className="text-hud-gold">✦</span>}
            {levelReady && <HudPill tone="gold">{t("levelReady")}</HudPill>}
            {!isNpc && <span className="truncate text-xs text-hud-muted">{character.user?.displayName || t("unassigned")}</span>}
          </div>
        </div>
        <ActionsMenu
          label={t("actions")}
          triggerClassName="h-8 w-8 shrink-0 rounded-full text-hud-gold hover:bg-transparent hover:text-hud-gold-strong"
          onTriggerClick={(e) => e.preventDefault()}
          actions={[
            { label: tc("edit"), icon: Pencil, href: `/campaigns/${campaignId}/dm/characters/${character.id}` },
            ...(actions.onLevelUp && !classPick
              ? [{ label: t("levelUp"), icon: TrendingUp, onSelect: actions.onLevelUp, disabled: busy }]
              : []),
            { label: tc("delete"), icon: Trash2, onSelect: actions.onDelete, destructive: true, separatorBefore: true },
          ]}
        />
      </div>
      <div className="flex gap-1.5">
        <HudStatChip short={t("statLevel")} value={character.level} />
        <HudStatChip short="HP" label="HP" value={ooc?.persistResources ? (character.resources?.dead ? t("dead") : `${hp}/${maxHp}`) : maxHp} />
        <HudStatChip short="AC" value={character.armorClass} />
        <HudStatChip short={t("statInitiative")} value={character.initiative} />
      </div>
    </HudCard>
  );
}

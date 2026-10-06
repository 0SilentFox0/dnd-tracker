"use client";

import type React from "react";
import { useMemo } from "react";

import { SkillSpellEnhancement } from "./SkillSpellEnhancement";
import { SkillSpellSelector } from "./SkillSpellSelector";

import { SpellMultiSelect } from "@/components/characters/spells/SpellMultiSelect";
import { HudSection } from "@/components/hud/form";
import type { SpellEnhancementType } from "@/lib/constants/spell-enhancement";

interface SpellOption {
  id: string;
  name: string;
}

interface SkillSpellSectionProps {
  campaignId: string;
  spell: {
    spellId: string | null;
    grantedSpellId: string | null;
    setters: {
      setSpellId: (value: string | null) => void;
      setGrantedSpellId: (value: string | null) => void;
    };
  };
  spellEnhancement: {
    spellEnhancementTypes: SpellEnhancementType[];
    spellEffectIncrease: string;
    spellTargetChange: string | null;
    spellAdditionalModifier: {
      modifier?: string;
      damageDice?: string;
      duration?: number;
    };
    spellNewSpellId: string | null;
    spellAoeSpellIds: string[];
    setters: {
      setSpellEffectIncrease: (value: string) => void;
      setSpellTargetChange: (value: string | null) => void;
      setSpellAdditionalModifier: (modifier: {
        modifier?: string;
        damageDice?: string;
        duration?: number;
      }) => void;
      setSpellNewSpellId: (value: string | null) => void;
      setSpellAoeSpellIds: React.Dispatch<React.SetStateAction<string[]>>;
    };
    handlers: {
      handleEnhancementTypeToggle: (type: SpellEnhancementType) => void;
    };
  };
  spells: SpellOption[];
}

export function SkillSpellSection({
  campaignId,
  spell,
  spellEnhancement,
  spells,
}: SkillSpellSectionProps) {
  const { spellId, grantedSpellId, setters: spellSetters } = spell;

  const {
    spellEnhancementTypes,
    spellEffectIncrease,
    spellTargetChange,
    spellAdditionalModifier,
    spellNewSpellId,
    spellAoeSpellIds,
    setters: enhancementSetters,
    handlers,
  } = spellEnhancement;

  const enhancementValue = useMemo(
    () => ({
      types: spellEnhancementTypes,
      effectIncrease: spellEffectIncrease,
      targetChange: spellTargetChange,
      additionalModifier: spellAdditionalModifier,
      newSpellId: spellNewSpellId,
    }),
    [spellEnhancementTypes, spellEffectIncrease, spellTargetChange, spellAdditionalModifier, spellNewSpellId],
  );

  const enhancementActions = useMemo(
    () => ({
      toggleType: handlers.handleEnhancementTypeToggle,
      setEffectIncrease: enhancementSetters.setSpellEffectIncrease,
      setTargetChange: enhancementSetters.setSpellTargetChange,
      setAdditionalModifier: enhancementSetters.setSpellAdditionalModifier,
      setNewSpellId: enhancementSetters.setSpellNewSpellId,
    }),
    [handlers.handleEnhancementTypeToggle, enhancementSetters],
  );

  return (
    <>
      <HudSection title="Заклинання">
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SkillSpellSelector
              spellId={spellId}
              spells={spells}
              onSpellIdChange={spellSetters.setSpellId}
              label="Пов'язане заклинання"
              placeholder="Не обрано"
              noneLabel="Не обрано"
            />
            <SkillSpellSelector
              id="skill-granted-spell"
              spellId={grantedSpellId}
              spells={spells}
              onSpellIdChange={spellSetters.setGrantedSpellId}
              label="Скіл додає заклинання"
              placeholder="Не додає заклинання"
              noneLabel="Не додає заклинання"
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Поле «Пов&apos;язане заклинання» потрібне для модифікаторів ефекту, таргету
            тощо. Заклинання, які стають багатоціль у бою, обираються окремо нижче —
            без прив&apos;язки до цього списку.
          </p>
        </div>
      </HudSection>

      <HudSection title="Заклинання для багатоцільового касту">
        <div className="space-y-2">
          <p className="text-xs text-muted-foreground">
            У списку — усі заклинання бібліотеки кампанії. У бою кілька цілей
            з’являється для заклинань типу «одна ціль», якщо вони тут обрані;
            AoE вже багатоціль, без цілі — без зміни поведінки. Не залежить від
            поля «Пов&apos;язане заклинання».
          </p>
          <SpellMultiSelect
            campaignId={campaignId}
            selectedSpellIds={spellAoeSpellIds}
            onSelectionChange={enhancementSetters.setSpellAoeSpellIds}
          />
        </div>
      </HudSection>

      <HudSection title="Інші покращення заклинань">
        <SkillSpellEnhancement value={enhancementValue} spells={spells} actions={enhancementActions} />
      </HudSection>
    </>
  );
}

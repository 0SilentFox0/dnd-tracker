"use client";

import type React from "react";

import { SkillSpellEnhancement } from "./SkillSpellEnhancement";
import { SkillSpellSelector } from "./SkillSpellSelector";

import { SpellMultiSelect } from "@/components/characters/spells/SpellMultiSelect";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Label } from "@/components/ui/label";
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

  return (
    <div className="space-y-4 rounded-md border p-4">
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

      <div className="space-y-2 rounded-lg border bg-muted/20 p-3">
        <Label>Заклинання для багатоцільового касту</Label>
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

      <Accordion type="single" collapsible className="border rounded-lg">
        <AccordionItem value="spell-enhancement">
          <AccordionTrigger className="px-4">
            <span className="font-medium">Інші покращення заклинань</span>
          </AccordionTrigger>
          <AccordionContent className="px-4 pb-4 space-y-4">
            <SkillSpellEnhancement
              spellEnhancementTypes={spellEnhancementTypes}
              spellEffectIncrease={spellEffectIncrease}
              spellTargetChange={spellTargetChange}
              spellAdditionalModifier={spellAdditionalModifier}
              spellNewSpellId={spellNewSpellId}
              spells={spells}
              onEnhancementTypeToggle={handlers.handleEnhancementTypeToggle}
              onEffectIncreaseChange={enhancementSetters.setSpellEffectIncrease}
              onTargetChangeChange={enhancementSetters.setSpellTargetChange}
              onAdditionalModifierChange={enhancementSetters.setSpellAdditionalModifier}
              onNewSpellIdChange={enhancementSetters.setSpellNewSpellId}
            />
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

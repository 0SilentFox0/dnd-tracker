"use client";

import { SkillSpellEnhancement } from "./SkillSpellEnhancement";
import { SkillSpellSelector } from "./SkillSpellSelector";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import type { SpellEnhancementType } from "@/lib/constants/spell-enhancement";

interface SpellOption {
  id: string;
  name: string;
}

interface SkillSpellSectionProps {
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
    setters: {
      setSpellEffectIncrease: (value: string) => void;
      setSpellTargetChange: (value: string | null) => void;
      setSpellAdditionalModifier: (modifier: {
        modifier?: string;
        damageDice?: string;
        duration?: number;
      }) => void;
      setSpellNewSpellId: (value: string | null) => void;
    };
    handlers: {
      handleEnhancementTypeToggle: (type: SpellEnhancementType) => void;
    };
  };
  spells: SpellOption[];
}

export function SkillSpellSection({
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
          label="Покращення спела"
          placeholder="Без спела"
          noneLabel="Без спела"
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

      {spellId && (
        <Accordion type="single" collapsible className="border rounded-lg">
          <AccordionItem value="spell-enhancement">
            <AccordionTrigger className="px-4">
              <span className="font-medium">Налаштування покращення спела</span>
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
      )}
    </div>
  );
}

"use client";

import { SkillSpellEnhancement } from "@/components/skills/form/SkillSpellEnhancement";
import { SkillSpellSelector } from "@/components/skills/form/SkillSpellSelector";
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
    setters: {
      setSpellId: (value: string | null) => void;
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
  const { spellId, setters: spellSetters } = spell;

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

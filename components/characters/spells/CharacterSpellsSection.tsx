/**
 * Компонент для Магічної Книги персонажа
 */

import { SpellMultiSelect } from "@/components/characters/spells/SpellMultiSelect";
import { Label } from "@/components/ui/label";
import { LabeledInput } from "@/components/ui/labeled-input";
import { SelectField } from "@/components/ui/select-field";
import { SPELLCASTING_ABILITIES } from "@/lib/constants";

interface CharacterSpellsSectionProps {
  spellcasting: {
    spellcastingClass?: string;
    spellcastingAbility?: "intelligence" | "wisdom" | "charisma";
    spellSlots?: Record<string, { max: number; current: number }>;
    knownSpells: string[];
    setters: {
      setSpellcastingClass: (value: string) => void;
      setSpellcastingAbility: (value: "intelligence" | "wisdom" | "charisma" | undefined) => void;
      setSpellSlots: (value: Record<string, { max: number; current: number }>) => void;
      setKnownSpells: (value: string[]) => void;
    };
    handlers: {
      addKnownSpell: (spellId: string) => void;
      removeKnownSpell: (index: number) => void;
    };
  };
  campaignId: string;
}

export function CharacterSpellsSection({
  spellcasting,
  campaignId,
}: CharacterSpellsSectionProps) {
  const { spellcastingClass, spellcastingAbility, knownSpells, setters } = spellcasting;
  
  const handleSpellSelectionChange = (spellIds: string[]) => {
    setters.setKnownSpells(spellIds);
  };

  return (
    <div className="space-y-4 w-full">
      <LabeledInput
        id="spellcastingClass"
        label="Клас заклинателя"
        value={spellcastingClass || ""}
        onChange={(e) => setters.setSpellcastingClass(e.target.value)}
        placeholder="Наприклад: Чарівник"
        containerClassName="w-full min-w-0"
        className="w-full"
      />
      <div className="w-full min-w-0">
        <Label htmlFor="spellcastingAbility">Характеристика заклинань</Label>
        <SelectField
          id="spellcastingAbility"
          value={spellcastingAbility || ""}
          onValueChange={(value) => setters.setSpellcastingAbility(value as "intelligence" | "wisdom" | "charisma" | undefined)}
          placeholder="Виберіть характеристику"
          options={SPELLCASTING_ABILITIES.map(ability => ({ value: ability.value, label: ability.label }))}
          triggerClassName="w-full"
        />
      </div>

      <div className="w-full min-w-0">
        <Label>Стартові заклинання (Магічна Книга)</Label>
        <p className="text-xs text-muted-foreground mb-2">
          Оберіть заклинання, які персонаж знає на початку. Додаткові заклинання будуть автоматично додаватися при вивченні скілів.
        </p>
        <SpellMultiSelect
          campaignId={campaignId}
          selectedSpellIds={knownSpells}
          onSelectionChange={handleSpellSelectionChange}
        />
      </div>
    </div>
  );
}

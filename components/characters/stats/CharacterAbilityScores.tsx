import { PrimaryAbilityPicker } from "./PrimaryAbilityPicker";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AbilityKey, CORE_ABILITY_SCORES } from "@/lib/constants/abilities";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { signed } from "@/lib/utils/format";

interface CharacterAbilityScoresProps {
  primary?: { value: AbilityKey | null; onChange: (v: AbilityKey | null) => void };
  abilityScores: {
    strength: number;
    dexterity: number;
    constitution: number;
    intelligence: number;
    wisdom: number;
    charisma: number;
    setters: {
      setStrength: (value: number) => void;
      setDexterity: (value: number) => void;
      setConstitution: (value: number) => void;
      setIntelligence: (value: number) => void;
      setWisdom: (value: number) => void;
      setCharisma: (value: number) => void;
    };
  };
}

export function CharacterAbilityScores({
  abilityScores,
  primary,
}: CharacterAbilityScoresProps) {
  const { strength, dexterity, constitution, intelligence, wisdom, charisma, setters } = abilityScores;
  
  const abilityMap: Record<AbilityKey, { value: number; setter: (value: number) => void }> = {
    strength: { value: strength, setter: setters.setStrength },
    dexterity: { value: dexterity, setter: setters.setDexterity },
    constitution: { value: constitution, setter: setters.setConstitution },
    intelligence: { value: intelligence, setter: setters.setIntelligence },
    wisdom: { value: wisdom, setter: setters.setWisdom },
    charisma: { value: charisma, setter: setters.setCharisma },
  };

  return (
    <div className="w-full space-y-4">
    <div className="grid w-full grid-cols-3 items-end gap-2 sm:grid-cols-6">
      {CORE_ABILITY_SCORES.map(({ key, label }) => {
        const ability = abilityMap[key];

        return (
          <div key={key} className="w-full min-w-0">
            <Label htmlFor={key} className="text-xs leading-tight">
              {label}
              <span className="text-muted-foreground"> ({signed(getAbilityModifier(ability.value))})</span>
            </Label>
            <Input
              id={key}
              type="number"
              min="1"
              max="30"
              value={ability.value}
              onChange={(e) => ability.setter(parseInt(e.target.value) || 10)}
              className="w-full"
            />
          </div>
        );
      })}
    </div>
    {primary && <PrimaryAbilityPicker value={primary.value} onChange={primary.onChange} />}
    </div>
  );
}

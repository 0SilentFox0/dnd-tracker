/**
 * Компонент для характеристик персонажа
 */

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ABILITY_SCORES } from "@/lib/constants";

interface CharacterAbilityScoresProps {
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
}: CharacterAbilityScoresProps) {
  const { strength, dexterity, constitution, intelligence, wisdom, charisma, setters } = abilityScores;
  
  const abilityMap: Record<string, { value: number; setter: (value: number) => void }> = {
    strength: { value: strength, setter: setters.setStrength },
    dexterity: { value: dexterity, setter: setters.setDexterity },
    constitution: { value: constitution, setter: setters.setConstitution },
    intelligence: { value: intelligence, setter: setters.setIntelligence },
    wisdom: { value: wisdom, setter: setters.setWisdom },
    charisma: { value: charisma, setter: setters.setCharisma },
  };

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4 w-full">
      {ABILITY_SCORES.map(({ key, label }) => {
        const ability = abilityMap[key];

        if (!ability) return null;
        
        return (
          <div key={key} className="w-full min-w-0">
            <Label htmlFor={key}>{label}</Label>
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
  );
}

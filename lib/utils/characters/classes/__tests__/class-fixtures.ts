import type { Ability } from "@/types/abilities";
import type { GameClassData } from "@/types/classes";

export const makeAbility = (id: string, name: string, description?: string): Ability => ({ id, name, description, trigger: { event: "passive" }, effects: [] });

export const makeClass = (over: Partial<GameClassData> = {}): GameClassData => ({
  id: "fighter",
  name: "Fighter",
  icon: null,
  color: "#c33",
  hitDie: 10,
  savingThrows: [],
  proficiencies: { armor: [], weapons: [], tools: [] },
  skillChoices: { count: 0, from: [] },
  caster: "none",
  spellcastingAbility: null,
  features: [],
  subclassLevel: null,
  subclasses: [],
  ...over,
});

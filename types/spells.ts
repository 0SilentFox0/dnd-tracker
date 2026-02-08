/**
 * Типи для заклинань
 */

export interface Spell {
  id: string;
  name: string;
  level: number;
  type: string;
  target: string | null;
  damageType: string;
  damageElement: string | null;
  damageModifier: string | null;
  healModifier: string | null;
  castingTime: string | null;
  range: string | null;
  components: string | null;
  duration: string | null;
  concentration: boolean;
  diceCount: number | null;
  diceType: string | null;
  savingThrow:
    | {
        ability: string;
        onSuccess: string;
        dc?: number | null;
      }
    | null
    | unknown;
  description: string | null;
  effects: string[] | null; // список ефектів (окремо від опису)
  groupId: string | null;
  icon: string | null;
  appearanceDescription?: string | null;
  spellGroup?: {
    id: string;
    name: string;
  } | null;
}

export interface SpellGroup {
  id: string;
  name: string;
}

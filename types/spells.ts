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
  /**
   * AoE damage distribution per target slot, у відсотках.
   * Приклад: [100, 75, 50, 25] — перша ціль 100%, друга 75% тощо.
   * `null`/`undefined` = усі цілі 100% (backward-compat).
   */
  damageDistribution?: number[] | null;
  /** Юніт з бібліотеки кампанії — з’являється на полі після успішного касту (кінець черги ініціативи) */
  summonUnitId?: string | null;
  spellGroup?: {
    id: string;
    name: string;
  } | null;
}

export interface SpellGroup {
  id: string;
  name: string;
}

export type SpellFormData = Partial<Spell> & { effects?: string[] };

export type BookSpell = {
  id: string;
  name: string;
  level: number;
  type: "target" | "aoe" | "no_target";
  damageType: "damage" | "heal" | "all";
  diceCount?: number | null;
  diceType?: string | null;
  savingThrow?: { ability: string; onSuccess: "half" | "none"; dc?: number } | null;
  hitCheck?: { ability: string; dc: number } | null;
  description?: string | null;
  icon?: string | null;
  range?: string | null;
  duration?: string | null;
  concentration?: boolean;
  damageElement?: string | null;
  spellGroup?: { id: string; name: string } | null;
};

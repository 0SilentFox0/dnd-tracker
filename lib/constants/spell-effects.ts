/**
 * База ефектів заклинань — вибір лише з цього списку (дропдаун).
 */

import type { SelectOption } from "@/components/ui/select-field";

/** Всі доступні ефекти заклинань (value = текст ефекту, зберігається в spell.effects) */
export const SPELL_EFFECT_OPTIONS: SelectOption[] = [
  // Рух і швидкість
  { value: "Speed halved", label: "Speed halved" },
  { value: "Speed doubled", label: "Speed doubled" },
  { value: "Speed -20 ft", label: "Speed -20 ft" },
  { value: "0 speed (immobilized)", label: "0 speed (immobilized)" },
  { value: "Can't use reactions", label: "Can't use reactions" },
  { value: "+10 movement until end of next turn", label: "+10 movement until end of next turn" },

  // Броня та захист
  { value: "-2 AC", label: "-2 AC" },
  { value: "+2 AC", label: "+2 AC" },
  { value: "+3 AC", label: "+3 AC" },
  { value: "AC reduced by 4", label: "AC reduced by 4" },
  { value: "Advantage on Dex saves", label: "Advantage on Dex saves" },
  { value: "-2 Dex saves", label: "-2 Dex saves" },

  // Атаки та урон
  { value: "Target deals half damage on all weapon attacks", label: "Target deals half damage on all weapon attacks" },
  { value: "-2 to attack rolls and saving throws", label: "-2 to attack rolls and saving throws" },
  { value: "-4 to attack rolls and damage rolls (min 1 damage)", label: "-4 to attack rolls and damage rolls (min 1 damage)" },
  { value: "+3 to attack rolls", label: "+3 to attack rolls" },
  { value: "Damage at start of each target's turn", label: "Damage at start of each target's turn" },
  { value: "Weapon damage dice +1 size", label: "Weapon damage dice +1 size" },
  { value: "+2d6 radiant (per hit)", label: "+2d6 radiant (per hit)" },
  { value: "Ranged spell attack", label: "Ranged spell attack" },
  { value: "Ignores resistance/immunity to magic damage", label: "Ignores resistance/immunity to magic damage" },

  // Контроль і статуси
  { value: "Blinded and incapacitated with 0 speed. Ends if takes damage", label: "Blinded and incapacitated with 0 speed. Ends if takes damage" },
  { value: "Restrained (frozen). Takes +50% physical damage. Repeat save each turn", label: "Restrained (frozen). Takes +50% physical damage. Repeat save each turn" },
  { value: "Failed save: restrained until end of their next turn", label: "Failed save: restrained until end of their next turn" },
  { value: "Stunned until end of next turn", label: "Stunned until end of next turn" },
  { value: "Must attack nearest creature (ally/enemy) dealing +100% damage", label: "Must attack nearest creature (ally/enemy) dealing +100% damage" },
  { value: "Control one creature. Repeat save when damaged", label: "Control one creature. Repeat save when damaged" },
  { value: "Confusion: roll d8 each turn for behavior. Repeat save each turn", label: "Confusion: roll d8 each turn for behavior. Repeat save each turn" },
  { value: "Creatures knocked prone on failed save", label: "Creatures knocked prone on failed save" },

  // Резисти та імунітети
  { value: "Resistance to nonmagical B/P/S damage", label: "Resistance to nonmagical B/P/S damage" },
  { value: "Resistance to ranged weapon and spell attacks", label: "Resistance to ranged weapon and spell attacks" },
  { value: "Resistance to all damage (while temp HP remains)", label: "Resistance to all damage (while temp HP remains)" },
  { value: "Fire resistant take half damage (quarter on save)", label: "Fire resistant take half damage (quarter on save)" },
  { value: "Undead and fiends immune", label: "Undead and fiends immune" },
  { value: "Only affects undead and fiends. Undead have disadvantage", label: "Only affects undead and fiends. Undead have disadvantage" },
  { value: "Cannot target undead/constructs/elementals", label: "Cannot target undead/constructs/elementals" },
  { value: "Immune to 1-3rd level spells. Higher: disadvantage on attacks/advantage on saves", label: "Immune to 1-3rd level spells. Higher: disadvantage on attacks/advantage on saves" },

  // Лікування та відновлення
  { value: "Regain HP at start of each turn", label: "Regain HP at start of each turn" },
  { value: "Heal half melee damage (vampirism)", label: "Heal half melee damage (vampirism)" },
  { value: "Remove all curses/diseases/hostile spells", label: "Remove all curses/diseases/hostile spells" },
  { value: "Return to life. Max HP -20% until long rest", label: "Return to life. Max HP -20% until long rest" },
  { value: "Rises as temporary undead. Dies after combat", label: "Rises as temporary undead. Dies after combat" },

  // Бафи / додаткові дії
  { value: "+1 action (Attack/Dash/Disengage/Hide/Use Object)", label: "+1 action (Attack/Dash/Disengage/Hide/Use Object)" },
  { value: "Teleport willing ally to unoccupied space", label: "Teleport willing ally to unoccupied space" },
  { value: "+5 initiative (controlled creature)", label: "+5 initiative (controlled creature)" },
  { value: "Repeat save each turn", label: "Repeat save each turn" },
  { value: "Multiple castings don't stack", label: "Multiple castings don't stack" },

  // Область та особливі
  { value: "Creatures entering or starting turn in wall take damage", label: "Creatures entering or starting turn in wall take damage" },
  { value: "Each target must be within 30 ft of previous. Save halves each", label: "Each target must be within 30 ft of previous. Save halves each" },
  { value: "Cross-shaped area", label: "Cross-shaped area" },
  { value: "4 invisible runes. Each triggers separately when entered", label: "4 invisible runes. Each triggers separately when entered" },
  { value: "Barrier: AC 10, 1 HP. Explodes when destroyed", label: "Barrier: AC 10, 1 HP. Explodes when destroyed" },
  { value: "Wall: AC 15, 80 HP. Melee attackers take damage equal to damage dealt to wall", label: "Wall: AC 15, 80 HP. Melee attackers take damage equal to damage dealt to wall" },
  { value: "Create illusory duplicate. Same stats. Disappears when damaged", label: "Create illusory duplicate. Same stats. Disappears when damaged" },
  { value: "Damage based on enemies killed this combat", label: "Damage based on enemies killed this combat" },
  { value: "Force damage cannot be reduced by resistance", label: "Force damage cannot be reduced by resistance" },
  { value: "Target gains undead traits. Max starting HP", label: "Target gains undead traits. Max starting HP" },
  { value: "Remove all spells (from target)", label: "Remove all spells (from target)" },
  { value: "Cannot be dispelled", label: "Cannot be dispelled" },

  // Мана
  { value: "Крадіжка мани", label: "Крадіжка мани — у ворога зникає 1 слот магії 1 рівня (якщо є)" },
];

/** Чи є рядок ефектом з бази (для відображення кастомних) */
export function isKnownSpellEffect(effect: string): boolean {
  return SPELL_EFFECT_OPTIONS.some((o) => o.value === effect);
}

import type { FxArchetype, FxAuraKind, FxElement } from "./types";

/** A library spell's signature look; anything left out comes from the generic rules (`spellRules`, `auraOf`). */
export interface SpellFx {
  archetype?: FxArchetype;
  element?: FxElement;
  /** The aura of the effect this spell applies (matched by the effect's name). */
  aura?: FxAuraKind;
}

export const SPELL_FX: Record<string, SpellFx> = {
  "Рій ос": { archetype: "swarm", element: "nature", aura: "stings" },
  "Землетрус": { archetype: "quake", element: "earth", aura: "dust" },
  "Корені": { archetype: "entangle", element: "nature", aura: "roots" },
  "Сплутування": { archetype: "entangle", element: "nature", aura: "roots" },
  "Прикликання елементаля: Вогонь": { archetype: "firesummon", element: "fire" },
  "Прикликання елементаля: Вода": { archetype: "watersummon", element: "cold" },
  "Прикликання елементаля: Земля": { archetype: "earthsummon", element: "earth" },
  "Прикликання елементаля: Повітря": { archetype: "airsummon", element: "lightning" },
  "Аватар": { archetype: "avatar", element: "necrotic" },
  "Призив Фенікса": { archetype: "phoenix", element: "fire" },
  "Кам'яні шипи": { element: "earth" },
  "Метеоритний дощ": { archetype: "meteor", element: "fire" },
  "Вампіризм": { archetype: "vampire", element: "fury", aura: "bloodlust" },
  "Поспіх": { archetype: "haste", element: "wind", aura: "haste" },
  "Потойбічна стріла": { archetype: "eldritch", element: "fire" },
  "Сповільнення": { archetype: "slow", element: "necrotic", aura: "shackles" },
  "Кам'яна шкіра": { archetype: "stoneskin", element: "earth", aura: "stoneskin" },
  "Телепортація": { archetype: "teleport", element: "arcane" },
  "Очищення": { archetype: "cleanse", element: "radiant" },
  "Регенерація": { archetype: "regenerate", element: "nature", aura: "lifedome" },
  "Праведна міць": { archetype: "might", element: "radiant", aura: "might" },
  "Ухилення": { archetype: "deflect", element: "radiant", aura: "deflect" },
  "Слово світла": { archetype: "holyword", element: "radiant" },
  "Божественна сила": { archetype: "empower", element: "radiant", aura: "holyweapon" },
  "Магічний імунітет": { archetype: "spellward", element: "arcane", aura: "spellward" },
  "Вічне світло": { archetype: "sunbeam", element: "radiant", aura: "sunglow" },
  "Божественна відплата": { archetype: "retribution", element: "radiant" },
  "Воскресіння": { archetype: "resurrect", element: "radiant" },
  "Ослаблення": { archetype: "siphon", element: "necrotic", aura: "sapped" },
  "Немічність": { archetype: "rust", element: "necrotic", aura: "rust" },
  "Чума": { archetype: "pestilence", element: "poison" },
  "Розсіяність": { archetype: "whispers", element: "arcane", aura: "dizzy" },
  "Страждання": { archetype: "thorns", element: "necrotic", aura: "thorncrown" },
  "Смуток": { archetype: "raincloud", element: "necrotic", aura: "raincloud" },
  "Сліпота": { archetype: "blindfold", element: "necrotic", aura: "blind" },
  "Ляльковод": { archetype: "puppet", element: "arcane", aura: "strings" },
  "Прокляття Потойбіччя": { archetype: "netherhands", element: "necrotic" },
  "Слово лікування": { archetype: "healword", element: "nature" },
  "Хвиля зцілення": { archetype: "healwave", element: "nature" },
  "Відродження лісу": { archetype: "rebirth", element: "nature" },
  "Дух лісу": { archetype: "forestspirit", element: "nature", aura: "stag" },
  "Колючі лози": { archetype: "thornvines", element: "poison", aura: "vines" },
  "Місячний промінь": { archetype: "moonbeam", element: "radiant" },
};

// own keys only: a spell named like an Object.prototype member must not pick up a function
export const spellFx = (name: string | null | undefined): SpellFx | undefined => (name && Object.hasOwn(SPELL_FX, name) ? SPELL_FX[name] : undefined);

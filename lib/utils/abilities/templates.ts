import type { Ability } from "@/lib/utils/abilities/schema";

type Template = { id: string; label: string; hint: string; build: () => Omit<Ability, "id"> };

export const ABILITY_TEMPLATES: readonly Template[] = [
  { id: "stats", label: "Пасивний бонус статів", hint: "+Сила, +AC, +HP… завжди", build: () => ({ name: "Бонус статів", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] }) },
  { id: "damage", label: "Бонус шкоди", hint: "+% / +число до ближньої, дальньої, магії (школа)", build: () => ({ name: "Бонус шкоди", trigger: { event: "passive" }, effects: [{ kind: "damageBonus", filter: { kind: "melee" }, percent: 10 }] }) },
  { id: "onHit", label: "Ефект при влучанні", hint: "DOT, дебаф, стан на ціль", build: () => ({ name: "Кровотеча", trigger: { event: "hit", role: "attacker" }, effects: [{ kind: "dot", damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" }] }) },
  { id: "resistance", label: "Опір / імунітет", hint: "фізичний, магічний, стихія, заклинання", build: () => ({ name: "Опір", trigger: { event: "passive" }, effects: [{ kind: "flag", flag: "resistance", damageType: "physical", percent: 25 }] }) },
  { id: "aura", label: "Аура", hint: "бонус усім союзникам / штраф ворогам", build: () => ({ name: "Аура", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1, target: "allAllies" }] }) },
  { id: "survive", label: "Раз за бій: вижити з 1 HP", hint: "летальна шкода → 1 HP", build: () => ({ name: "Невмирущий", trigger: { event: "lethalDamage" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: 1, revive: true }] }) },
  { id: "bonusAction", label: "Бонусна дія", hint: "кнопка гравця: лікування, мораль, слот…", build: () => ({ name: "Друге дихання", trigger: { event: "bonusAction" }, limits: { perBattle: 1 }, effects: [{ kind: "heal", amount: "1d10" }] }) },
  { id: "spellSlots", label: "Слоти заклинань", hint: "+N слотів рівня", build: () => ({ name: "Слоти", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "spellSlots", spellLevels: [1], flat: 1 }] }) },
  { id: "custom", label: "Власне", hint: "порожнє вміння", build: () => ({ name: "Нове вміння", trigger: { event: "passive" }, effects: [{ kind: "note", text: "Опишіть вміння" }] }) },
];

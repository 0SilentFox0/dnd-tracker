import { type Ability, type Amount, type Condition, type Effect } from "@/lib/utils/abilities/schema";

type ModStat = "attackBonus" | "initiative" | "armor" | "morale";

const STAT_LABELS: Record<ModStat, string> = { attackBonus: "атаку", initiative: "ініціативу", armor: "КД", morale: "мораль" };

const CONDITION_LABELS = { disable_ranged_attacks: "дальні атаки", disable_spell_casting: "закляття" } as const;

const ELEMENT_LABELS: Record<string, string> = { fire: "вогню", cold: "холоду", lightning: "блискавки" };

function hash(text: string): string {
  let h = 0;

  for (let i = 0; i < text.length; i++) h = (h * 31 + text.charCodeAt(i)) >>> 0;

  return h.toString(36);
}

const passive = { event: "passive" } as const;

const onHit = { event: "hit", role: "attacker" } as const;

const rounds = (n: number) => `${n} ${n === 1 ? "раунд" : "раунди"}`;

const chanceText = (chance?: number) => (chance === undefined ? "" : ` з шансом ${chance} %`);

const chanceLimit = (chance?: number) => (chance === undefined ? {} : { limits: { chance } });

export const noRetaliation = (): Ability => ({
  id: "unit-no-retaliation",
  name: "Без відповіді",
  description: "Ціль не відповідає на атаку цього юніта.",
  trigger: passive,
  effects: [{ kind: "flag", flag: "noRetaliation" }],
});

export const unlimitedRetaliation = (): Ability => ({
  id: "unit-unlimited-retaliation",
  name: "Безмежна відсіч",
  description: "Відповідає на кожну атаку, а не раз за раунд.",
  trigger: passive,
  effects: [{ kind: "flag", flag: "unlimitedRetaliation" }],
});

export const falloff = (name: string): Ability => ({
  id: "unit-falloff",
  name,
  description: "Атакує кілька цілей; кожна наступна отримує 50 % шкоди.",
  trigger: passive,
  effects: [{ kind: "flag", flag: "multiTargetFalloff", percent: 50 }],
});

export const doubleStrike = (name: string, chance: number): Ability => ({
  id: "unit-double-strike",
  name,
  description: `Після атаки з шансом ${chance} % — ще одна атака, раз за хід.`,
  trigger: { event: "attack", phase: "after", role: "attacker" },
  limits: { chance, perTurn: 1 },
  effects: [{ kind: "grantAction", extraActions: 1, target: "self" }],
});

export const firstStrike = (name: string, percent = 50): Ability => ({
  id: "unit-first-strike",
  name,
  description: `Перша атака в бою завдає на ${percent} % більше шкоди.`,
  trigger: { event: "attack", phase: "before", role: "attacker" },
  limits: { perBattle: 1 },
  effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent }],
});

export const deathBlow = (name: string, chance: number): Ability => ({
  id: "unit-death-blow",
  name,
  description: `Атака з шансом ${chance} % завдає подвійної шкоди.`,
  trigger: { event: "attack", phase: "before", role: "attacker" },
  limits: { chance },
  effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent: 100 }],
});

export const armorBreak = (name: string, flat = 2): Ability => ({
  id: "unit-armor-break",
  name,
  description: `Влучання знижує КД цілі на ${flat} на 1 раунд.`,
  trigger: onHit,
  effects: [{ kind: "modifyStat", stat: "armor", flat: -flat, duration: { rounds: 1 }, target: "eventTarget" }],
});

export const rage = (percent = 25): Ability => ({
  id: "unit-rage",
  name: "Лють",
  description: `Коли гине союзник, шкода юніта зростає на ${percent} % на 2 раунди.`,
  trigger: { event: "kill", role: "victimSide" },
  effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent, duration: { rounds: 2 }, target: "self" }],
});

export const hatred = (name: string, races: string[], percent = 25): Ability => ({
  id: "unit-hatred",
  name,
  description: `+${percent} % шкоди проти рас: ${races.join(", ")}.`,
  trigger: { event: "attack", phase: "before", role: "attacker" },
  condition: { type: "targetRace", races },
  effects: [{ kind: "damageBonus", filter: { kind: "all" }, percent }],
});

export const stun = (name: string, chance: number): Ability => ({
  id: "unit-stun",
  name,
  description: `Влучання з шансом ${chance} % змушує ціль пропустити хід.`,
  trigger: onHit,
  limits: { chance },
  effects: [{ kind: "applyCondition", condition: "skip_action", duration: { rounds: 1 }, target: "eventTarget" }],
});

export const dot = (name: string, dice: string, damageType: string, roundCount: number, chance?: number): Ability => ({
  id: `unit-dot-${damageType}`,
  name,
  description: `Влучання${chanceText(chance)} завдає ${dice} шкоди (${damageType}) щораунду протягом ${rounds(roundCount)}.`,
  trigger: onHit,
  ...chanceLimit(chance),
  effects: [{ kind: "dot", damagePerRound: dice, damageType, duration: { rounds: roundCount }, target: "eventTarget" }],
});

export const debuff = (name: string, stat: ModStat, flat: number, roundCount: number, chance?: number): Ability => ({
  id: `unit-debuff-${stat}`,
  name,
  description: `Влучання${chanceText(chance)} знижує ${STAT_LABELS[stat]} цілі на ${Math.abs(flat)} на ${rounds(roundCount)}.`,
  trigger: onHit,
  ...chanceLimit(chance),
  effects: [{ kind: "modifyStat", stat, flat: -Math.abs(flat), duration: { rounds: roundCount }, target: "eventTarget" }],
});

export const fearAura = (name = "Аура страху", flat = 1): Ability => ({
  id: "unit-fear-aura",
  name,
  description: `Вороги отримують −${flat} до моралі.`,
  trigger: passive,
  effects: [{ kind: "modifyStat", stat: "morale", flat: -flat, target: "allEnemies" }],
});

export const disable = (name: string, condition: keyof typeof CONDITION_LABELS, chance: number): Ability => ({
  id: `unit-disable-${condition}`,
  name,
  description: `Влучання з шансом ${chance} % забороняє цілі ${CONDITION_LABELS[condition]} на 1 раунд.`,
  trigger: onHit,
  limits: { chance },
  effects: [{ kind: "applyCondition", condition, duration: { rounds: 1 }, target: "eventTarget" }],
});

export const charmOnHit = (name: string, chance: number): Ability => ({
  id: "unit-charm",
  name,
  description: `Влучання з шансом ${chance} % підкоряє ціль на 2 раунди.`,
  trigger: onHit,
  limits: { chance },
  effects: [{ kind: "charm", duration: { rounds: 2 }, target: "eventTarget" }],
});

const mindless = (id: string, name: string, description: string, extra: Effect[] = []): Ability => ({
  id,
  name,
  description,
  trigger: passive,
  effects: [{ kind: "flag", flag: "ignoreMorale" }, { kind: "flag", flag: "conditionImmunity", conditions: ["fear"] }, ...extra],
});

export const undead = (): Ability => mindless("unit-undead", "Нежить", "Ігнорує мораль, імунітет до страху.");

export const construct = (): Ability => mindless("unit-construct", "Механізм", "Ігнорує мораль, імунітет до страху.");

export const elemental = (element: "fire" | "cold" | "lightning" | null, vulnerableTo?: string): Ability => {
  const extra: Effect[] = [];

  if (element) extra.push({ kind: "flag", flag: "resistance", damageType: element, percent: 100 });

  if (vulnerableTo) extra.push({ kind: "flag", flag: "resistance", damageType: vulnerableTo, percent: -100 });

  const parts = ["Ігнорує мораль, імунітет до страху"];

  if (element) parts.push(`імунітет до ${ELEMENT_LABELS[element]}`);

  if (vulnerableTo) parts.push(`вразливість до ${ELEMENT_LABELS[vulnerableTo] ?? vulnerableTo} (×2)`);

  return mindless("unit-elemental", "Елементаль", `${parts.join(", ")}.`, extra);
};

export const magicResist = (percent: number): Ability => ({
  id: "unit-magic-resist",
  name: `Опір магії ${percent} %`,
  description: `Шкода від заклять зменшена на ${percent} %.`,
  trigger: passive,
  effects: [{ kind: "flag", flag: "resistance", damageType: "spell", percent }],
});

export const magicImmunity = (): Ability => ({
  id: "unit-magic-immunity",
  name: "Повний імунітет до магії",
  description: "Закляття не діють на цей юніт.",
  trigger: passive,
  effects: [{ kind: "flag", flag: "spellImmunity" }],
});

export const elementResist = (types: string[], percent: number, name: string): Ability => ({
  id: `unit-resist-${types.join("-")}`,
  name,
  description: `Опір шкоді (${types.join(", ")}) ${percent} %.`,
  trigger: passive,
  effects: types.map((damageType): Effect => ({ kind: "flag", flag: "resistance", damageType, percent })),
});

export const physicalResist = (percent: number, types: string[] = ["physical"], name = "Опір фізичній шкоді"): Ability => ({
  id: `unit-physical-resist-${types.join("-")}`,
  name,
  description: `Фізична шкода (${types.join(", ")}) зменшена на ${percent} %.`,
  trigger: passive,
  effects: types.map((damageType): Effect => ({ kind: "flag", flag: "resistance", damageType, percent })),
});

export const incorporeal = (): Ability => ({
  id: "unit-incorporeal",
  name: "Безтілесний",
  description: "Атакувальники б'ють з недоліком.",
  trigger: passive,
  effects: [{ kind: "flag", flag: "disadvantageForAttackers" }],
});

export const regeneration = (percent: number): Ability => ({
  id: "unit-regeneration",
  name: `Регенерація ${percent} %`,
  description: `На початку ходу відновлює ${percent} % максимального HP.`,
  trigger: { event: "turnStart" },
  effects: [{ kind: "heal", amount: { percentOf: "maxHp", value: percent }, target: "self" }],
});

export const lifeDrain = (percent = 50): Ability => ({
  id: "unit-life-drain",
  name: "Висмоктування життя",
  description: `Лікується на ${percent} % завданої шкоди.`,
  trigger: passive,
  effects: [{ kind: "flag", flag: "lifesteal", percent }],
});

export const retaliateAura = (name: string, percent = 25, damageType = "fire"): Ability => ({
  id: `unit-retaliate-${damageType}`,
  name,
  description: `Атакувальник у ближньому бою отримує ${percent} % завданої шкоди (${damageType}).`,
  trigger: { event: "hit", role: "target", attackKind: "melee" },
  effects: [{ kind: "dealDamage", amount: { percentOf: "eventDamage", value: percent }, damageType, target: "eventActor" }],
});

export const guardian = (percent = 30): Ability => ({
  id: "unit-guardian",
  name: "Захисник",
  description: `Бере на себе ${percent} % шкоди союзників.`,
  trigger: { event: "battleStart" },
  effects: [{ kind: "guard", percent, duration: { rounds: 99 }, target: "allAllies" }],
});

export const bigShield = (percent = 30): Ability => ({
  id: "unit-big-shield",
  name: "Великий щит",
  description: `Дальня шкода зменшена на ${percent} %.`,
  trigger: passive,
  effects: [{ kind: "flag", flag: "resistance", damageType: "all", percent, attackKind: "ranged" }],
});

export const bravery = (): Ability => ({
  id: "unit-bravery",
  name: "Сміливість",
  description: "Імунітет до страху, мораль не нижча за 0.",
  trigger: passive,
  effects: [{ kind: "flag", flag: "conditionImmunity", conditions: ["fear"] }, { kind: "flag", flag: "minMorale", value: 0 }],
});

export const undyingOnce = (): Ability => ({
  id: "unit-undying",
  name: "Нежива стійкість",
  description: "Раз за бій смертельний удар лишає юніта з 1 HP.",
  trigger: { event: "lethalDamage" },
  limits: { perBattle: 1 },
  effects: [{ kind: "heal", amount: 1, revive: true, target: "self" }],
});

export const healAlly = (name: string, amount: Amount, opts: { bonus?: boolean; perBattle?: number; cleanse?: boolean; targetRaceNote?: string } = {}): Ability => ({
  id: "unit-heal-ally",
  name,
  description: `${opts.bonus ? "Бонусна дія" : "Дія"}${opts.perBattle ? ` (${opts.perBattle} раз за бій)` : ""}: лікує союзника${opts.cleanse ? " і знімає негативні ефекти" : ""}${opts.targetRaceNote ? ` (${opts.targetRaceNote})` : ""}.`,
  trigger: { event: opts.bonus ? "bonusAction" : "action" },
  ...(opts.perBattle && { limits: { perBattle: opts.perBattle } }),
  effects: [{ kind: "heal", amount, target: "eventTarget" }, ...(opts.cleanse ? [{ kind: "cleanse", includeConditions: true, target: "eventTarget" } as const] : [])],
});

export const resurrect = (): Ability => ({
  id: "unit-resurrect",
  name: "Воскресіння",
  description: "Раз за бій повертає загиблого союзника в бій з 50 % HP.",
  trigger: { event: "action" },
  condition: { type: "targetDead" },
  limits: { perBattle: 1 },
  effects: [{ kind: "raiseDead", hpPercent: 50, target: "eventTarget" }],
});

export const buffAlly = (
  name: string,
  effects: Array<{ stat: ModStat; flat: number }>,
  roundCount: number,
  opts: { bonus?: boolean; self?: boolean } = {},
): Ability => ({
  id: `unit-buff-${effects.map((e) => e.stat).join("-")}${opts.self ? "-self" : ""}`,
  name,
  description: `${opts.bonus ? "Бонусна дія" : "Дія"}: ${effects.map((e) => `${e.flat > 0 ? "+" : ""}${e.flat} на ${STAT_LABELS[e.stat]}`).join(", ")} ${opts.self ? "собі" : "союзнику"} на ${rounds(roundCount)}.`,
  trigger: { event: opts.bonus ? "bonusAction" : "action" },
  effects: effects.map((e): Effect => ({ kind: "modifyStat", stat: e.stat, flat: e.flat, duration: { rounds: roundCount }, target: opts.self ? "self" : "eventTarget" })),
});

export const restoreSlotOnce = (name: string): Ability => ({
  id: "unit-restore-slot",
  name,
  description: "Раз за бій: союзник відновлює слот закляття.",
  trigger: { event: "action" },
  limits: { perBattle: 1 },
  effects: [{ kind: "restoreSpellSlot", count: 1, target: "eventTarget" }],
});

export const drainMana = (): Ability => ({
  id: "unit-drain-mana",
  name: "Крадіжка мани",
  description: "Влучання: ціль втрачає 1 слот закляття.",
  trigger: onHit,
  effects: [{ kind: "drainSpellSlot", count: 1, target: "eventTarget" }],
});

export const summonGroupOnce = (name: string, group: string, tier: number): Ability => ({
  id: "unit-summon-group",
  name,
  description: `Раз за бій прикликає юніта «${group}», Tier ${tier}.`,
  trigger: { event: "action" },
  limits: { perBattle: 1 },
  effects: [{ kind: "summon", group, tier }],
});

export const raiseOnKill = (unitKey: string): Ability => ({
  id: "unit-raise-on-kill",
  name: "Підняття мертвих",
  description: "Вбивство прикликає союзного юніта, раз за раунд.",
  trigger: { event: "kill", role: "killer" },
  limits: { perRound: 1 },
  effects: [{ kind: "summon", unitId: unitKey, count: 1 }],
});

export const extraDamage = (name: string, dice: string, damageType: string): Ability => ({
  id: `unit-extra-damage-${damageType}`,
  name,
  description: `Влучання завдає додатково ${dice} шкоди (${damageType}).`,
  trigger: onHit,
  effects: [{ kind: "dealDamage", amount: dice, damageType, target: "eventTarget" }],
});

export const finisher = (name: string, condition: Condition, bonus: { percent?: number; advantage?: boolean }): Ability => {
  const effects: Effect[] = [];

  if (bonus.percent) effects.push({ kind: "damageBonus", filter: { kind: "all" }, percent: bonus.percent });

  if (bonus.advantage) effects.push({ kind: "flag", flag: "advantage", attackKind: "all" });

  if (effects.length === 0) throw new Error(`finisher «${name}»: потрібен percent або advantage`);

  return {
    id: "unit-finisher",
    name,
    description: `За умови: ${[bonus.percent ? `+${bonus.percent} % шкоди` : "", bonus.advantage ? "атака з перевагою" : ""].filter(Boolean).join(", ")}.`,
    trigger: { event: "attack", phase: "before", role: "attacker" },
    condition,
    effects,
  };
};

function effectSlug(effect: Effect): string {
  if (effect.kind === "flag") return "damageType" in effect ? `${effect.flag}-${effect.damageType}` : effect.flag;

  if (effect.kind === "modifyStat") return effect.stat;

  return effect.kind;
}

export const alliesAura = (name: string, effect: Effect): Ability => ({
  id: `unit-allies-aura-${effectSlug(effect)}`,
  name,
  description: "Постійна аура: діє на всіх союзників.",
  trigger: passive,
  effects: [{ ...effect, target: "allAllies" } as Effect],
});

export const enemiesRoundDamage = (name: string, percentOfAttack: number): Ability => ({
  id: "unit-enemies-round-damage",
  name,
  description: `На початку раунду кожен ворог отримує шкоду ${percentOfAttack} % від атаки юніта.`,
  trigger: { event: "roundStart" },
  effects: [{ kind: "dealDamage", amount: { percentOf: "ownerAttack", value: percentOfAttack }, target: "allEnemies" }],
});

export const oncePerBattleAoe = (name: string, opts: { percentOfAttack: number; targets: "all" | number; stunChance?: number; damageType?: string }): Ability => {
  const all = opts.targets === "all";

  const target = all ? "allEnemies" : "eventTarget";

  const effects: Effect[] = [{ kind: "dealDamage", amount: { percentOf: "ownerAttack", value: opts.percentOfAttack }, ...(opts.damageType && { damageType: opts.damageType }), target }];

  if (opts.stunChance) effects.push({ kind: "applyCondition", condition: "skip_action", duration: { rounds: 1 }, percent: opts.stunChance, target });

  return {
    id: "unit-aoe-once",
    name,
    description: `Раз за бій: ${all ? "усі вороги" : `до ${opts.targets} цілей`} отримують ${opts.percentOfAttack} % шкоди від атаки юніта${opts.stunChance ? `, ${opts.stunChance} % шанс оглушення` : ""}.`,
    trigger: { event: "action" },
    limits: { perBattle: 1 },
    ...(!all && { maxTargets: opts.targets as number }),
    effects,
  };
};

export const wheelOfFortune = (): Ability => ({
  id: "unit-wheel-of-fortune",
  name: "Колесо фортуни",
  description: "Влучання, раз за раунд: випадково або баф собі, або дебаф цілі на 1 раунд.",
  trigger: onHit,
  limits: { perRound: 1 },
  effects: [
    {
      kind: "randomOf",
      options: [
        { kind: "modifyStat", stat: "attackBonus", flat: 2, duration: { rounds: 1 }, target: "self" },
        { kind: "modifyStat", stat: "morale", flat: 1, duration: { rounds: 1 }, target: "self" },
        { kind: "modifyStat", stat: "armor", flat: -2, duration: { rounds: 1 }, target: "eventTarget" },
        { kind: "modifyStat", stat: "initiative", flat: -3, duration: { rounds: 1 }, target: "eventTarget" },
      ],
    },
  ],
});

export const critRange = (threshold: number): Ability => ({
  id: "unit-crit-range",
  name: "Влучний удар",
  description: `Критичне влучання з ${threshold} на кубику.`,
  trigger: passive,
  effects: [{ kind: "modifyStat", stat: "critThreshold", flat: threshold - 20 }],
});

export const flavor = (text: string): Ability => ({
  id: `unit-flavor-${hash(text)}`,
  name: text,
  description: "Особливість для антуражу, без ігрового ефекту.",
  trigger: passive,
  effects: [{ kind: "note", text }],
});

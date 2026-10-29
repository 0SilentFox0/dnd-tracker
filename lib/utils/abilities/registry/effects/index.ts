import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { limitsLabel } from "../labels";
import { describeTrigger } from "../triggers";
import { applyBerserk, applyCharm, describeBerserk, describeCharm } from "./control";
import { applyCopySpellBuffs } from "./copy-buffs";
import { describeFlag, FLAG_FIELDS, FLAG_LABELS } from "./flags";
import { applyDealDamage, applyDot, applyHeal, applyHot, describeDealDamage, describeDot, describeHeal, describeHot } from "./hp";
import { applyManeuver, describeManeuver, MANEUVER_LABELS } from "./maneuver";
import { applyPush, describePush } from "./push";
import {
  applyChangeMorale,
  applyCleanse,
  applyCondition,
  applyDrainSpellSlot,
  applyGrantAction,
  applyGuard,
  applyHelp,
  applyMark,
  applyRestoreSpellSlot,
  CONDITION_LABELS,
  conditionLabel,
  describeGrantAction,
} from "./state";
import {
  applyStatic,
  damageBonusFields,
  describeDamageBonus,
  describeModifyStat,
  modifyStatFields,
} from "./static";
import { applyRaiseDead, applySummon, describeRaiseDead, describeSummon } from "./summon";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import { ABILITY_LABELS } from "@/lib/constants/abilities";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import type { Ability, Effect, EffectKind } from "@/lib/utils/abilities/schema";
import { CONDITION_5E_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { pickOne } from "@/lib/utils/common/dice";
import { signed } from "@/lib/utils/common/format";
import type { SpellEffect } from "@/lib/utils/spells/model/schema";

export type { EffectApplyInput, EffectApplyResult };

interface EffectDefinition<K extends EffectKind> {
  kind: K;
  label: string;
  static: boolean;
  fields: readonly FieldMeta[];
  describe: (e: Extract<Effect, { kind: K }>) => string;
  apply: (input: EffectApplyInput<Extract<Effect, { kind: K }>>) => EffectApplyResult;
}

const AMOUNT: FieldMeta = { name: "amount", label: "Кількість (число, кубики, формула, %)", input: "amount" };

const REQUIRED_DURATION: FieldMeta = { ...DURATION_FIELD, optional: false };

export const EFFECT_REGISTRY: { [K in EffectKind]: EffectDefinition<K> } = {
  modifyStat: { kind: "modifyStat", label: "Змінити стат", static: true, fields: modifyStatFields, describe: describeModifyStat, apply: (i) => applyStatic(i, describeEffect) },
  damageBonus: { kind: "damageBonus", label: "Бонус шкоди", static: true, fields: damageBonusFields, describe: describeDamageBonus, apply: (i) => applyStatic(i, describeEffect) },
  flag: {
    kind: "flag",
    label: "Прапорець",
    static: true,
    fields: [{ name: "flag", label: "Прапорець", input: "select", options: Object.entries(FLAG_LABELS).map(([value, label]) => ({ value, label })) }, TARGET_FIELD, DURATION_FIELD],
    describe: describeFlag,
    apply: (i) => applyStatic(i, describeEffect),
  },
  note: {
    kind: "note",
    label: "Нотатка для DM",
    static: true,
    fields: [{ name: "text", label: "Текст", input: "text" }],
    // ✋ — механіку відпрацьовує DM вручну (рушій її не автоматизує)
    describe: (e) => (/\bDM\b/.test(e.text) ? `✋ ${e.text}` : e.text),
    apply: (i) => ({ participants: i.participants, messages: [`📜 ${i.ability.name}: ${i.effect.text}`] }),
  },
  dealDamage: { kind: "dealDamage", label: "Завдати шкоди", static: false, fields: [AMOUNT, { name: "damageType", label: "Тип", input: "text", optional: true }, { name: "falloff", label: "% шкоди по цілях по черзі (100, 50, 25…)", input: "numberList", optional: true }, { name: "byDistance", label: "Кубики за відстанню (футів:кубики, лише в заклинаннях)", input: "distanceDice", optional: true }, { name: "delayIfBeyond.feet", label: "Відкласти удар, якщо ціль далі, ніж (футів, лише в заклинаннях)", input: "number", optional: true }, { name: "delayIfBeyond.perRoundFeet", label: "…летить за раунд (футів)", input: "number", optional: true }, TARGET_FIELD], describe: describeDealDamage, apply: applyDealDamage },
  heal: { kind: "heal", label: "Лікування", static: false, fields: [AMOUNT, { name: "revive", label: "Воскрешає", input: "toggle", optional: true }, TARGET_FIELD], describe: describeHeal, apply: applyHeal },
  dot: { kind: "dot", label: "Шкода щораунду (DOT)", static: false, fields: [{ ...AMOUNT, name: "damagePerRound", label: "Шкода/раунд (число, кубики, формула)" }, { name: "damageType", label: "Тип", input: "text" }, { name: "linkedToCondition", label: "Зникає разом зі станом цього заклинання", input: "toggle", optional: true }, TARGET_FIELD, REQUIRED_DURATION], describe: describeDot, apply: applyDot },
  hot: { kind: "hot", label: "Лікування щораунду (HOT)", static: false, fields: [{ ...AMOUNT, name: "healPerRound", label: "Лікування/раунд (число, кубики, формула)" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeHot, apply: applyHot },
  berserk: { kind: "berserk", label: "Шал", static: false, fields: [{ name: "damageBonusPercent", label: "Бонус шкоди, %", input: "number" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeBerserk, apply: applyBerserk },
  charm: { kind: "charm", label: "Перехід на бік заклинателя", static: false, fields: [TARGET_FIELD, REQUIRED_DURATION], describe: describeCharm, apply: applyCharm },
  applyCondition: {
    kind: "applyCondition",
    label: "Накласти стан",
    static: false,
    fields: [
      {
        name: "condition",
        label: "Стан",
        input: "select",
        options: Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label, group: (CONDITION_5E_KEYS as readonly string[]).includes(value) ? "Стани 5e" : "Механічні стани" })),
      },
      { name: "levels", label: "Рівні виснаження (1–6)", input: "number", optional: true, visibleWhen: (v) => v.condition === "exhaustion" },
      { name: "saveEnds", label: "Рятівний кидок наприкінці ходу", input: "saveEnds", optional: true, visibleWhen: (v) => (CONDITION_5E_KEYS as readonly string[]).includes(String(v.condition)) },
      { name: "percent", label: "Шанс, % (для втрати дії)", input: "number", optional: true, visibleWhen: (v) => v.condition === "skip_action" },
      { name: "breakOnDamage", label: "Знімається при отриманні шкоди", input: "toggle", optional: true },
      { name: "escapeDc", label: "«Вирватися» проти СК заклинання (для схоплення)", input: "toggle", optional: true, visibleWhen: (v) => v.condition === "grappled" },
      { name: "onlyIfAffected", label: "Лише якщо хоч одну ціль заклинання уражено (для себе)", input: "toggle", optional: true },
      TARGET_FIELD,
      REQUIRED_DURATION,
    ],
    describe: (e) =>
      `${conditionLabel(e.condition)}${e.condition === "skip_action" && e.percent ? ` ${e.percent}%` : ""}${e.levels ? ` ×${e.levels}` : ""} × ${e.duration?.rounds ?? "?"} р.${e.breakOnDamage ? ", до шкоди" : ""}${e.saveEnds ? `, рятівний кидок ${ABILITY_LABELS[e.saveEnds.ability]}` : ""}${e.escapeDc ? ", вирватися проти СК" : ""}`,
    apply: applyCondition,
  },
  grantAction: { kind: "grantAction", label: "Дати дію", static: false, fields: [
      { name: "extraActions", label: "Додаткові дії", input: "number", optional: true },
      { name: "refreshAction", label: "Оновити дію", input: "toggle", optional: true },
      { name: "refreshBonusAction", label: "Оновити бонусну дію", input: "toggle", optional: true },
      { name: "refreshReaction", label: "Оновити реакцію", input: "toggle", optional: true },
      TARGET_FIELD,
    ], describe: describeGrantAction, apply: applyGrantAction },
  restoreSpellSlotLevels: {
    kind: "restoreSpellSlotLevels",
    label: "Відновити слоти за бюджетом кіл (короткий відпочинок)",
    static: false,
    fields: [{ name: "budget", label: "Бюджет кіл", input: "flat" }, { name: "maxSlotLevel", label: "Макс. коло слота", input: "number" }],
    describe: (e) => `відновлює слоти до ${e.maxSlotLevel}-го кола за бюджетом кіл на короткому відпочинку`,
    apply: (input) => ({ participants: input.participants, messages: [] }),
  },
  restoreSpellSlot: { kind: "restoreSpellSlot", label: "Відновити слот", static: false, fields: [{ name: "count", label: "Скільки", input: "number" }, TARGET_FIELD], describe: (e) => `+${e.count} слот`, apply: applyRestoreSpellSlot },
  drainSpellSlot: { kind: "drainSpellSlot", label: "Крадіжка слоту заклинань", static: false, fields: [{ name: "count", label: "Скільки", input: "number" }, TARGET_FIELD], describe: (e) => `−${e.count} слот заклинань`, apply: applyDrainSpellSlot },
  changeMorale: { kind: "changeMorale", label: "Змінити мораль", static: false, fields: [{ name: "delta", label: "Зміна", input: "number" }, TARGET_FIELD], describe: (e) => `мораль ${signed(e.delta)}`, apply: applyChangeMorale },
  mark: { kind: "mark", label: "Мітка на ціль", static: false, fields: [{ name: "markId", label: "Ідентифікатор мітки", input: "text" }, TARGET_FIELD, REQUIRED_DURATION], describe: (e) => `мітка × ${e.duration.rounds} р.`, apply: applyMark },
  copySpellBuffs: { kind: "copySpellBuffs", label: "Копіювати бафи закляття союзника", static: false, fields: [TARGET_FIELD], describe: () => "копіює бафи закляття, накладені на союзника", apply: applyCopySpellBuffs },
  guard: { kind: "guard", label: "Захист союзника", static: false, fields: [{ name: "percent", label: "% шкоди від атак, що бере на себе", input: "number" }, TARGET_FIELD, REQUIRED_DURATION], describe: (e) => `захист: ${e.percent}% шкоди від атак × ${e.duration.rounds} р.`, apply: applyGuard },
  summon: {
    kind: "summon",
    label: "Прикликати юнітів",
    static: false,
    fields: [{ name: "unitId", label: "Конкретний юніт (замість групи і Tier)", input: "unit", optional: true }, { name: "group", label: "Група (раса юнітів)", input: "text", optional: true }, { name: "tier", label: "Tier (рівень юніта 1–7)", input: "number", optional: true }, { name: "count", label: "Кількість", input: "number", optional: true }],
    describe: describeSummon,
    apply: applySummon,
  },
  raiseDead: { kind: "raiseDead", label: "Підняти мертвих", static: false, fields: [{ name: "hpPercent", label: "HP, %", input: "number" }, TARGET_FIELD], describe: describeRaiseDead, apply: applyRaiseDead },
  cleanse: { kind: "cleanse", label: "Зняти дебафи", static: false, fields: [{ name: "includeConditions", label: "Зняти й стани", input: "toggle", optional: true }, TARGET_FIELD], describe: (e) => (e.includeConditions ? "зняття дебафів і станів" : "зняття дебафів"), apply: applyCleanse },
  maneuver: {
    kind: "maneuver",
    label: "Маневр",
    static: false,
    fields: [
      { name: "maneuver", label: "Маневр", input: "select", options: Object.entries(MANEUVER_LABELS).map(([value, label]) => ({ value, label })) },
      { name: "percentOfAttack", label: "% шкоди атаки", input: "number" },
    ],
    describe: describeManeuver,
    apply: applyManeuver,
  },
  help: { kind: "help", label: "Допомога союзнику", static: false, fields: [TARGET_FIELD], describe: () => "перевага союзнику на наступну атаку", apply: applyHelp },
  push: { kind: "push", label: "Відштовхнути", static: false, fields: [{ name: "feet", label: "Футів (5–30)", input: "number" }, { name: "from", label: "Від", input: "select", options: [{ value: "caster", label: "Від кастера" }] }, TARGET_FIELD], describe: describePush, apply: applyPush },
  randomOf: {
    kind: "randomOf",
    label: "Випадковий з варіантів",
    static: false,
    fields: [{ name: "options", label: "Варіанти", input: "effects" }],
    describe: (e) => `одне з: ${e.options.map(describeEffect).join(" / ")}`,
    apply: (i) => {
      const option = pickOne(i.effect.options, i.ctx.rng);

      const targetIds = "target" in option && option.target ? resolveTargetIds(option.target, i.ownerId, i.event, i.participants, i.ctx) : i.targetIds;

      return applyEffect({ ...i, effect: option, targetIds });
    },
  },
};

export function applyEffect(input: EffectApplyInput): EffectApplyResult {
  const def = EFFECT_REGISTRY[input.effect.kind] as EffectDefinition<EffectKind>;

  return def.apply(input as never);
}

export function describeEffect(effect: Effect | SpellEffect): string {
  if (effect.kind === "inputDice") return `кубики з введення (до ${effect.max}): ${effect.label}`;

  if (effect.kind === "grantCast") return `підкаст «${effect.label}» (${effect.cost === "action" ? "дія" : effect.cost === "bonusAction" ? "бонусна дія" : "реакція"}${effect.uses ? `, ×${effect.uses}` : ""}) на ${effect.duration.rounds} р.`;

  if (effect.kind === "hitRider") return `заряди ×${effect.charges}: +${effect.extraDice} ${effect.damageType} на ${effect.attackKind === "any" ? "будь-яку" : effect.attackKind === "melee" ? "ближню" : "дальню"} атаку${effect.consumeOnMiss ? " (і промах)" : ""}${effect.save ? `, СК ${effect.save.ability}: ${effect.save.onFail.map(describeEffect).join(", ")}` : ""}`;

  if (effect.kind === "anchoredZone") return `аура ${effect.radiusFeet} фт на цілі (${effect.side === "enemies" ? "вороги" : effect.side === "allies" ? "союзники" : "усі"}${effect.excludeBearer ? ", крім носія" : ""}) на ${effect.duration.rounds} р.${effect.onEnter ? `; вхід: ${effect.onEnter.effects.map(describeEffect).join(", ")}` : ""}${effect.onTurnStart ? `; початок ходу: ${effect.onTurnStart.effects.map(describeEffect).join(", ")}` : ""}${effect.endsWhenStartOutside ? "; закінчується, якщо хід починається поза аурою" : ""}`;

  if (effect.kind === "summonInline") return `викликає ${effect.count}× «${effect.name}» (${effect.hp === null ? "предмет" : `${effect.hp} HP`}, КЗ ${effect.ac === "spellDc" ? "= СК" : effect.ac}) на ${effect.duration.rounds} р.${effect.upcastEvery ? `; +1 за кожні ${effect.upcastEvery} кола слота` : ""}${effect.aura ? `; аура ${effect.aura.radiusFeet} фт${effect.aura.onEnter?.attack || effect.aura.onTurnStart?.attack ? " (атака заклинанням)" : ""}` : ""}`;

  if (effect.kind === "transform") return `перетворює ціль на форму юніта на ${effect.duration.rounds} р.; на 0 HP форми — відкат, надлишок шкоди переходить на звичайну форму`;

  if (effect.kind === "moveSelf") return "кастер переміщується до цілі";

  if (effect.kind === "createTerrain") return `${effect.terrain === "wall" ? "стіна" : "складна місцевість"}: ${effect.shape === "line" ? "лінія до цілі" : "клітинки області"} (до ${effect.cells}) на ${effect.rounds} р.`;

  if (effect.kind === "chooseOne") return `на вибір: ${effect.options.map(describeEffect).join(" / ")}`;

  const def = EFFECT_REGISTRY[effect.kind] as EffectDefinition<EffectKind> | undefined;

  return def ? def.describe(effect as never) : `невідомий ефект (${String(effect.kind)})`;
}

export { FLAG_FIELDS, FLAG_LABELS };

export function describeAbility(a: Ability): string {
  return [...describeTrigger(a.trigger), ...limitsLabel(a.limits), ...a.effects.map(describeEffect)].join(" · ");
}

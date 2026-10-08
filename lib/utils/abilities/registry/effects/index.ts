import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { limitsLabel } from "../labels";
import { describeTrigger } from "../triggers";
import { applyBerserk, applyCharm, describeBerserk, describeCharm } from "./control";
import { applyDealDamage, applyDot, applyHeal, applyHot, describeDealDamage, describeDot, describeHeal, describeHot } from "./hp";
import {
  applyChangeMorale,
  applyCleanse,
  applyCondition,
  applyGrantAction,
  applyGuard,
  applyMark,
  applyRestoreSpellSlot,
  CONDITION_LABELS,
  describeGrantAction,
} from "./state";
import {
  applyStatic,
  damageBonusFields,
  describeDamageBonus,
  describeFlag,
  describeModifyStat,
  FLAG_FIELDS,
  FLAG_LABELS,
  modifyStatFields,
} from "./static";
import { applyRaiseDead, applySummon, describeRaiseDead, describeSummon } from "./summon";
import type { EffectApplyInput, EffectApplyResult } from "./types";

import type { Ability, Effect, EffectKind } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/format";

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
    describe: (e) => e.text,
    apply: (i) => ({ participants: i.participants, messages: [`📜 ${i.ability.name}: ${i.effect.text}`] }),
  },
  dealDamage: { kind: "dealDamage", label: "Завдати шкоди", static: false, fields: [AMOUNT, { name: "damageType", label: "Тип", input: "text", optional: true }, { name: "falloff", label: "% шкоди по цілях по черзі (100, 50, 25…)", input: "numberList", optional: true }, TARGET_FIELD], describe: describeDealDamage, apply: applyDealDamage },
  heal: { kind: "heal", label: "Лікування", static: false, fields: [AMOUNT, { name: "revive", label: "Воскрешає", input: "toggle", optional: true }, TARGET_FIELD], describe: describeHeal, apply: applyHeal },
  dot: { kind: "dot", label: "Шкода щораунду (DOT)", static: false, fields: [{ ...AMOUNT, name: "damagePerRound", label: "Шкода/раунд (число, кубики, формула)" }, { name: "damageType", label: "Тип", input: "text" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeDot, apply: applyDot },
  hot: { kind: "hot", label: "Лікування щораунду (HOT)", static: false, fields: [{ ...AMOUNT, name: "healPerRound", label: "Лікування/раунд (число, кубики, формула)" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeHot, apply: applyHot },
  berserk: { kind: "berserk", label: "Шал", static: false, fields: [{ name: "damageBonusPercent", label: "Бонус шкоди, %", input: "number" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeBerserk, apply: applyBerserk },
  charm: { kind: "charm", label: "Перехід на бік заклинателя", static: false, fields: [TARGET_FIELD, REQUIRED_DURATION], describe: describeCharm, apply: applyCharm },
  applyCondition: {
    kind: "applyCondition",
    label: "Накласти стан",
    static: false,
    fields: [
      { name: "condition", label: "Стан", input: "select", options: Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label })) },
      { name: "percent", label: "Шанс, % (для втрати дії)", input: "number", optional: true, visibleWhen: (v) => v.condition === "skip_action" },
      { name: "breakOnDamage", label: "Знімається при отриманні шкоди", input: "toggle", optional: true },
      TARGET_FIELD,
      REQUIRED_DURATION,
    ],
    describe: (e) =>
      `${CONDITION_LABELS[e.condition]}${e.condition === "skip_action" && e.percent ? ` ${e.percent}%` : ""} × ${e.duration?.rounds ?? "?"} р.${e.breakOnDamage ? ", до шкоди" : ""}`,
    apply: applyCondition,
  },
  grantAction: { kind: "grantAction", label: "Дати дію", static: false, fields: [
      { name: "extraActions", label: "Додаткові дії", input: "number", optional: true },
      { name: "refreshAction", label: "Оновити дію", input: "toggle", optional: true },
      { name: "refreshBonusAction", label: "Оновити бонусну дію", input: "toggle", optional: true },
      { name: "refreshReaction", label: "Оновити реакцію", input: "toggle", optional: true },
      TARGET_FIELD,
    ], describe: describeGrantAction, apply: applyGrantAction },
  restoreSpellSlot: { kind: "restoreSpellSlot", label: "Відновити слот", static: false, fields: [{ name: "count", label: "Скільки", input: "number" }, TARGET_FIELD], describe: (e) => `+${e.count} слот`, apply: applyRestoreSpellSlot },
  changeMorale: { kind: "changeMorale", label: "Змінити мораль", static: false, fields: [{ name: "delta", label: "Зміна", input: "number" }, TARGET_FIELD], describe: (e) => `мораль ${signed(e.delta)}`, apply: applyChangeMorale },
  mark: { kind: "mark", label: "Мітка на ціль", static: false, fields: [{ name: "markId", label: "Ідентифікатор мітки", input: "text" }, TARGET_FIELD, REQUIRED_DURATION], describe: (e) => `мітка «${e.markId}» × ${e.duration.rounds} р.`, apply: applyMark },
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
  randomOf: {
    kind: "randomOf",
    label: "Випадковий з варіантів",
    static: false,
    fields: [{ name: "options", label: "Варіанти", input: "effects" }],
    describe: (e) => `одне з: ${e.options.map(describeEffect).join(" / ")}`,
    apply: (i) => {
      const index = Math.min(i.effect.options.length - 1, Math.floor(i.ctx.rng() * i.effect.options.length));

      return applyEffect({ ...i, effect: i.effect.options[index] });
    },
  },
};

export function applyEffect(input: EffectApplyInput): EffectApplyResult {
  const def = EFFECT_REGISTRY[input.effect.kind] as EffectDefinition<EffectKind>;

  return def.apply(input as never);
}

export function describeEffect(effect: Effect): string {
  const def = EFFECT_REGISTRY[effect.kind] as EffectDefinition<EffectKind> | undefined;

  return def ? def.describe(effect as never) : `невідомий ефект (${String(effect.kind)})`;
}

export { FLAG_FIELDS, FLAG_LABELS };

export function describeAbility(a: Ability): string {
  return [...describeTrigger(a.trigger), ...limitsLabel(a.limits), ...a.effects.map(describeEffect)].join(" · ");
}

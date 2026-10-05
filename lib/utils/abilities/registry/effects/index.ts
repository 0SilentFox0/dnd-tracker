import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { limitsLabel, signed } from "../labels";
import { TRIGGER_REGISTRY } from "../triggers";
import { applyDealDamage, applyDot, applyHeal, describeDealDamage, describeDot, describeHeal } from "./hp";
import {
  applyChangeMorale,
  applyCleanse,
  applyCondition,
  applyGrantAction,
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
import type { EffectApplyInput, EffectApplyResult } from "./types";

import type { Ability, Effect, EffectKind } from "@/lib/utils/abilities/schema";

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
  dealDamage: { kind: "dealDamage", label: "Завдати шкоди", static: false, fields: [AMOUNT, { name: "damageType", label: "Тип", input: "text", optional: true }, TARGET_FIELD], describe: describeDealDamage, apply: applyDealDamage },
  heal: { kind: "heal", label: "Лікування", static: false, fields: [AMOUNT, { name: "revive", label: "Воскрешає", input: "toggle", optional: true }, TARGET_FIELD], describe: describeHeal, apply: applyHeal },
  dot: { kind: "dot", label: "Шкода щораунду (DOT)", static: false, fields: [{ ...AMOUNT, name: "damagePerRound", label: "Шкода/раунд (число, кубики, формула)" }, { name: "damageType", label: "Тип", input: "text" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeDot, apply: applyDot },
  applyCondition: {
    kind: "applyCondition",
    label: "Накласти стан",
    static: false,
    fields: [{ name: "condition", label: "Стан", input: "select", options: Object.entries(CONDITION_LABELS).map(([value, label]) => ({ value, label })) }, TARGET_FIELD, REQUIRED_DURATION],
    describe: (e) => `${CONDITION_LABELS[e.condition]} × ${e.duration?.rounds ?? "?"} р.`,
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
  cleanse: { kind: "cleanse", label: "Зняти дебафи", static: false, fields: [TARGET_FIELD], describe: () => "зняття дебафів", apply: applyCleanse },
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
  return [TRIGGER_REGISTRY[a.trigger.event].label, ...limitsLabel(a.limits), ...a.effects.map(describeEffect)].join(" · ");
}

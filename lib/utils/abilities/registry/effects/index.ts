import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { CONDITION_LABELS, limitsLabel } from "../labels";
import { abilityArg, flag, roundsOf } from "../text";
import { describeTrigger } from "../triggers";
import { applyBerserk, applyCharm, describeBerserk, describeCharm } from "./control";
import { applyCopySpellBuffs } from "./copy-buffs";
import { describeFlag, FLAG_FIELDS, FLAG_LABELS } from "./flags";
import { applyDealDamage, applyDot, applyHeal, applyHot, describeDealDamage, describeDot, describeHeal, describeHot } from "./hp";
import { applyManeuver, describeManeuver, MANEUVERS } from "./maneuver";
import {
  applyChangeMorale,
  applyCleanse,
  applyCondition,
  applyDrainSpellSlot,
  applyGrantAction,
  applyGuard,
  applyMark,
  applyRestoreSpellSlot,
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

import { joinLines, textRef } from "@/lib/i18n/text-ref";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import type { Ability, Effect, EffectKind } from "@/lib/utils/abilities/schema";
import { CONDITION_5E_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { pickOne } from "@/lib/utils/common/dice";
import { signed } from "@/lib/utils/common/format";
import type { LogLine } from "@/types/text";

export type { EffectApplyInput, EffectApplyResult };

interface EffectDefinition<K extends EffectKind> {
  kind: K;
  static: boolean;
  fields: readonly FieldMeta[];
  describe: (e: Extract<Effect, { kind: K }>) => LogLine;
  apply: (input: EffectApplyInput<Extract<Effect, { kind: K }>>) => EffectApplyResult;
}

const AMOUNT: FieldMeta = { name: "amount", input: "amount" };

const REQUIRED_DURATION: FieldMeta = { ...DURATION_FIELD, optional: false };

const CONDITION_KEY_LIST = Object.keys(CONDITION_LABELS);

export const EFFECT_REGISTRY: { [K in EffectKind]: EffectDefinition<K> } = {
  modifyStat: { kind: "modifyStat", static: true, fields: modifyStatFields, describe: describeModifyStat, apply: (i) => applyStatic(i, describeEffect) },
  damageBonus: { kind: "damageBonus", static: true, fields: damageBonusFields, describe: describeDamageBonus, apply: (i) => applyStatic(i, describeEffect) },
  flag: {
    kind: "flag",
    static: true,
    fields: [{ name: "flag", input: "select", options: Object.keys(FLAG_LABELS).map((value) => ({ value })) }, TARGET_FIELD, DURATION_FIELD],
    describe: describeFlag,
    apply: (i) => applyStatic(i, describeEffect),
  },
  note: {
    kind: "note",
    static: true,
    fields: [{ name: "text", input: "text" }],
    // ✋ — механіку відпрацьовує DM вручну (рушій її не автоматизує)
    describe: (e) => (/\bDM\b/.test(e.text) ? `✋ ${e.text}` : e.text),
    apply: (i) => ({ participants: i.participants, messages: [`📜 ${i.ability.name}: ${i.effect.text}`] }),
  },
  dealDamage: { kind: "dealDamage", static: false, fields: [AMOUNT, { name: "damageType", input: "text", optional: true }, { name: "falloff", input: "numberList", optional: true }, TARGET_FIELD], describe: describeDealDamage, apply: applyDealDamage },
  heal: { kind: "heal", static: false, fields: [AMOUNT, { name: "revive", input: "toggle", optional: true }, TARGET_FIELD], describe: describeHeal, apply: applyHeal },
  dot: { kind: "dot", static: false, fields: [{ ...AMOUNT, name: "damagePerRound" }, { name: "damageType", input: "text" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeDot, apply: applyDot },
  hot: { kind: "hot", static: false, fields: [{ ...AMOUNT, name: "healPerRound" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeHot, apply: applyHot },
  berserk: { kind: "berserk", static: false, fields: [{ name: "damageBonusPercent", input: "number" }, TARGET_FIELD, REQUIRED_DURATION], describe: describeBerserk, apply: applyBerserk },
  charm: { kind: "charm", static: false, fields: [TARGET_FIELD, REQUIRED_DURATION], describe: describeCharm, apply: applyCharm },
  applyCondition: {
    kind: "applyCondition",
    static: false,
    fields: [
      {
        name: "condition",
        input: "select",
        options: CONDITION_KEY_LIST.map((value) => ({ value, group: (CONDITION_5E_KEYS as readonly string[]).includes(value) ? "conditions5e" : "mechanicalConditions" })),
      },
      { name: "levels", input: "number", optional: true, visibleWhen: (v) => v.condition === "exhaustion" },
      { name: "saveEnds", input: "saveEnds", optional: true, visibleWhen: (v) => (CONDITION_5E_KEYS as readonly string[]).includes(String(v.condition)) },
      { name: "percent", input: "number", optional: true, visibleWhen: (v) => v.condition === "skip_action" },
      { name: "breakOnDamage", input: "toggle", optional: true },
      TARGET_FIELD,
      REQUIRED_DURATION,
    ],
    describe: (e) =>
      textRef("abilityText.effects.applyCondition", {
        condition: CONDITION_LABELS[e.condition],
        percent: e.condition === "skip_action" && e.percent ? ` ${e.percent}%` : "",
        levels: e.levels ? ` ×${e.levels}` : "",
        rounds: roundsOf(e),
        breakOnDamage: flag(e.breakOnDamage),
        hasSave: flag(e.saveEnds),
        ability: e.saveEnds ? abilityArg(e.saveEnds.ability) : "",
      }),
    apply: applyCondition,
  },
  grantAction: { kind: "grantAction", static: false, fields: [
      { name: "extraActions", input: "number", optional: true },
      { name: "refreshAction", input: "toggle", optional: true },
      { name: "refreshBonusAction", input: "toggle", optional: true },
      { name: "refreshReaction", input: "toggle", optional: true },
      TARGET_FIELD,
    ], describe: describeGrantAction, apply: applyGrantAction },
  restoreSpellSlotLevels: {
    kind: "restoreSpellSlotLevels",
    static: false,
    fields: [{ name: "budget", input: "flat" }, { name: "maxSlotLevel", input: "number" }],
    describe: (e) => textRef("abilityText.effects.restoreSpellSlotLevels", { level: e.maxSlotLevel }),
    apply: (input) => ({ participants: input.participants, messages: [] }),
  },
  restoreSpellSlot: { kind: "restoreSpellSlot", static: false, fields: [{ name: "count", input: "number" }, TARGET_FIELD], describe: (e) => textRef("abilityText.effects.restoreSpellSlot", { count: e.count }), apply: applyRestoreSpellSlot },
  drainSpellSlot: { kind: "drainSpellSlot", static: false, fields: [{ name: "count", input: "number" }, TARGET_FIELD], describe: (e) => textRef("abilityText.effects.drainSpellSlot", { count: e.count }), apply: applyDrainSpellSlot },
  changeMorale: { kind: "changeMorale", static: false, fields: [{ name: "delta", input: "number" }, TARGET_FIELD], describe: (e) => textRef("abilityText.effects.changeMorale", { delta: signed(e.delta) }), apply: applyChangeMorale },
  mark: { kind: "mark", static: false, fields: [{ name: "markId", input: "text" }, TARGET_FIELD, REQUIRED_DURATION], describe: (e) => textRef("abilityText.effects.mark", { rounds: e.duration.rounds }), apply: applyMark },
  copySpellBuffs: { kind: "copySpellBuffs", static: false, fields: [TARGET_FIELD], describe: () => textRef("abilityText.effects.copySpellBuffs"), apply: applyCopySpellBuffs },
  guard: { kind: "guard", static: false, fields: [{ name: "percent", input: "number" }, TARGET_FIELD, REQUIRED_DURATION], describe: (e) => textRef("abilityText.effects.guard", { percent: e.percent, rounds: e.duration.rounds }), apply: applyGuard },
  summon: {
    kind: "summon",
    static: false,
    fields: [{ name: "unitId", input: "unit", optional: true }, { name: "group", input: "text", optional: true }, { name: "tier", input: "number", optional: true }, { name: "count", input: "number", optional: true }],
    describe: describeSummon,
    apply: applySummon,
  },
  raiseDead: { kind: "raiseDead", static: false, fields: [{ name: "hpPercent", input: "number" }, TARGET_FIELD], describe: describeRaiseDead, apply: applyRaiseDead },
  cleanse: { kind: "cleanse", static: false, fields: [{ name: "includeConditions", input: "toggle", optional: true }, TARGET_FIELD], describe: (e) => textRef("abilityText.effects.cleanse", { conditions: flag(e.includeConditions) }), apply: applyCleanse },
  maneuver: {
    kind: "maneuver",
    static: false,
    fields: [
      { name: "maneuver", input: "select", options: MANEUVERS.map((value) => ({ value })) },
      { name: "percentOfAttack", input: "number" },
    ],
    describe: describeManeuver,
    apply: applyManeuver,
  },
  randomOf: {
    kind: "randomOf",
    static: false,
    fields: [{ name: "options", input: "effects" }],
    describe: (e) => textRef("abilityText.effects.randomOf", { options: joinLines(e.options.map(describeEffect), " / ") }),
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

export function describeEffect(effect: Effect): LogLine {
  const def = EFFECT_REGISTRY[effect.kind] as EffectDefinition<EffectKind> | undefined;

  return def ? def.describe(effect as never) : textRef("abilityText.effects.unknown", { kind: String(effect.kind) });
}

export { FLAG_FIELDS, FLAG_LABELS };

export function describeAbility(a: Ability): LogLine {
  return joinLines([...describeTrigger(a.trigger), ...limitsLabel(a.limits), ...a.effects.map(describeEffect)], " · ");
}

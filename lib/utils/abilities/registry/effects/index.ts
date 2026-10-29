import { DURATION_FIELD, type FieldMeta, TARGET_FIELD } from "../fields";
import { CONDITION_KEYS_ALL, conditionKeySegment, limitsSegments } from "../labels";
import { describeTrigger } from "../triggers";
import { applyBerserk, applyCharm, describeBerserk, describeCharm } from "./control";
import { applyCopySpellBuffs } from "./copy-buffs";
import { describeFlag, FLAG_FIELDS, FLAG_KEYS } from "./flags";
import { applyDealDamage, applyDot, applyHeal, applyHot, describeDealDamage, describeDot, describeHeal, describeHot } from "./hp";
import { applyManeuver, describeManeuver } from "./maneuver";
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

import type { Translator } from "@/lib/i18n/translator";
import { resolveTargetIds } from "@/lib/utils/abilities/engine/core/targets";
import { logText } from "@/lib/utils/abilities/log-text";
import type { Ability, Effect, EffectKind } from "@/lib/utils/abilities/schema";
import { MANEUVERS } from "@/lib/utils/abilities/schema/effects";
import { CONDITION_5E_KEYS } from "@/lib/utils/abilities/schema/kinds";
import { renderSegments, seg, type Segment } from "@/lib/utils/abilities/segments";
import { pickOne } from "@/lib/utils/common/dice";
import { signed } from "@/lib/utils/common/format";

export type { EffectApplyInput, EffectApplyResult };

interface EffectDefinition<K extends EffectKind> {
  kind: K;
  static: boolean;
  fields: readonly FieldMeta[];
  describe: (e: Extract<Effect, { kind: K }>) => Segment[];
  apply: (input: EffectApplyInput<Extract<Effect, { kind: K }>>) => EffectApplyResult;
}

const AMOUNT: FieldMeta = { name: "amount", input: "amount" };

const REQUIRED_DURATION: FieldMeta = { ...DURATION_FIELD, optional: false };

export const EFFECT_REGISTRY: { [K in EffectKind]: EffectDefinition<K> } = {
  modifyStat: { kind: "modifyStat", static: true, fields: modifyStatFields, describe: describeModifyStat, apply: (i) => applyStatic(i, describeEffectText) },
  damageBonus: { kind: "damageBonus", static: true, fields: damageBonusFields, describe: describeDamageBonus, apply: (i) => applyStatic(i, describeEffectText) },
  flag: {
    kind: "flag",
    static: true,
    fields: [{ name: "flag", input: "select", options: FLAG_KEYS.map((value) => ({ value })) }, TARGET_FIELD, DURATION_FIELD],
    describe: describeFlag,
    apply: (i) => applyStatic(i, describeEffectText),
  },
  note: {
    kind: "note",
    static: true,
    fields: [{ name: "text", input: "text" }],
    // ✋ — механіку відпрацьовує DM вручну (рушій її не автоматизує)
    describe: (e) => [seg(/\bDM\b/.test(e.text) ? "summary.effects.noteDm" : "summary.effects.note", { text: e.text })],
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
        options: CONDITION_KEYS_ALL.map((value) => ({ value })),
      },
      { name: "levels", input: "number", optional: true, visibleWhen: (v) => v.condition === "exhaustion" },
      { name: "saveEnds", input: "saveEnds", optional: true, visibleWhen: (v) => (CONDITION_5E_KEYS as readonly string[]).includes(String(v.condition)) },
      { name: "percent", input: "number", optional: true, visibleWhen: (v) => v.condition === "skip_action" },
      { name: "breakOnDamage", input: "toggle", optional: true },
      TARGET_FIELD,
      REQUIRED_DURATION,
    ],
    describe: (e) => [
      seg("summary.effects.applyCondition", {
        condition: conditionKeySegment(e.condition),
        hasPercent: e.condition === "skip_action" && e.percent ? "yes" : "no",
        percent: e.percent ?? 0,
        hasLevels: e.levels ? "yes" : "no",
        levels: e.levels ?? 0,
        rounds: e.duration?.rounds ?? "?",
        breakOnDamage: e.breakOnDamage ? "yes" : "no",
        hasSave: e.saveEnds ? "yes" : "no",
        ability: e.saveEnds ? seg(`options.abilities.${e.saveEnds.ability}`) : "",
      }),
    ],
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
    describe: (e) => [seg("summary.effects.restoreSpellSlotLevels", { level: e.maxSlotLevel })],
    apply: (input) => ({ participants: input.participants, messages: [] }),
  },
  restoreSpellSlot: { kind: "restoreSpellSlot", static: false, fields: [{ name: "count", input: "number" }, TARGET_FIELD], describe: (e) => [seg("summary.effects.restoreSpellSlot", { count: e.count })], apply: applyRestoreSpellSlot },
  drainSpellSlot: { kind: "drainSpellSlot", static: false, fields: [{ name: "count", input: "number" }, TARGET_FIELD], describe: (e) => [seg("summary.effects.drainSpellSlot", { count: e.count })], apply: applyDrainSpellSlot },
  changeMorale: { kind: "changeMorale", static: false, fields: [{ name: "delta", input: "number" }, TARGET_FIELD], describe: (e) => [seg("summary.effects.changeMorale", { delta: signed(e.delta) })], apply: applyChangeMorale },
  mark: { kind: "mark", static: false, fields: [{ name: "markId", input: "text" }, TARGET_FIELD, REQUIRED_DURATION], describe: (e) => [seg("summary.effects.mark", { rounds: e.duration.rounds })], apply: applyMark },
  copySpellBuffs: { kind: "copySpellBuffs", static: false, fields: [TARGET_FIELD], describe: () => [seg("summary.effects.copySpellBuffs")], apply: applyCopySpellBuffs },
  guard: { kind: "guard", static: false, fields: [{ name: "percent", input: "number" }, TARGET_FIELD, REQUIRED_DURATION], describe: (e) => [seg("summary.effects.guard", { percent: e.percent, rounds: e.duration.rounds })], apply: applyGuard },
  summon: {
    kind: "summon",
    static: false,
    fields: [{ name: "unitId", input: "unit", optional: true }, { name: "group", input: "text", optional: true }, { name: "tier", input: "number", optional: true }, { name: "count", input: "number", optional: true }],
    describe: describeSummon,
    apply: applySummon,
  },
  raiseDead: { kind: "raiseDead", static: false, fields: [{ name: "hpPercent", input: "number" }, TARGET_FIELD], describe: describeRaiseDead, apply: applyRaiseDead },
  cleanse: { kind: "cleanse", static: false, fields: [{ name: "includeConditions", input: "toggle", optional: true }, TARGET_FIELD], describe: (e) => [seg("summary.effects.cleanse", { includeConditions: e.includeConditions ? "yes" : "no" })], apply: applyCleanse },
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
    describe: (e) => [seg("summary.effects.randomOf", { options: { join: " / ", items: e.options.flatMap(describeEffect) } })],
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

export function describeEffect(effect: Effect): Segment[] {
  const def = EFFECT_REGISTRY[effect.kind] as EffectDefinition<EffectKind> | undefined;

  return def ? def.describe(effect as never) : [seg("summary.unknownEffect", { kind: String(effect.kind) })];
}

const describeEffectText = (effect: Effect) => logText(describeEffect(effect));

export { FLAG_FIELDS, FLAG_KEYS };

export function describeAbilitySegments(a: Ability): Segment[] {
  return [...describeTrigger(a.trigger), ...limitsSegments(a.limits), ...a.effects.flatMap(describeEffect)];
}

export function describeAbilityText(a: Ability, t: Translator): string {
  return renderSegments(t, describeAbilitySegments(a)).join(" · ");
}

// temporary string form for consumers not yet moved to describeAbilityText (Task 8)
export const describeAbility = (a: Ability): string => logText(describeAbilitySegments(a));

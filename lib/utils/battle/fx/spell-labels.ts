import { DAMAGE_ELEMENT_LABELS } from "@/lib/constants/damage";
import { describeFlag } from "@/lib/utils/abilities/registry/effects/flags";
import { describeDamageBonus, describeModifyStat } from "@/lib/utils/abilities/registry/effects/static";
import { CONDITION_LABELS } from "@/lib/utils/abilities/registry/labels";
import type { Effect } from "@/lib/utils/abilities/schema";
import { signed } from "@/lib/utils/common/format";
import type { SpellTargeting } from "@/lib/utils/spells/model/schema";

const damageType = (type: string | undefined) => (type ? ` (${(DAMAGE_ELEMENT_LABELS[type] ?? type).toLowerCase()})` : "");

const isNegative = (v: unknown) => typeof v === "number" && v < 0;

const sign = (e: { flat?: unknown; percent?: unknown }) => (isNegative(e.flat) || isNegative(e.percent) ? "дебаф" : "баф");

/** Short Ukrainian name of what an effect does, for dev listings. */
export function effectLabel(effect: Effect): string {
  switch (effect.kind) {
    case "dealDamage":
      return `шкода${damageType(effect.damageType)}`;
    case "dot":
      return `шкода щораунду${damageType(effect.damageType)}`;
    case "heal":
      return effect.revive ? "воскресіння" : "лікування";
    case "hot":
      return "лікування щораунду";
    case "applyCondition":
      return `стан: ${CONDITION_LABELS[effect.condition]}`;
    case "modifyStat":
      return `${sign(effect)}: ${describeModifyStat(effect)}`;
    case "damageBonus":
      return `${sign(effect)}: ${describeDamageBonus(effect)}`;
    case "flag":
      return `ефект: ${describeFlag(effect)}`;
    case "berserk":
      return "шал";
    case "charm":
      return "перехід на бік заклинателя";
    case "summon":
      return "призов";
    case "raiseDead":
      return "підняття мертвих";
    case "cleanse":
      return "очищення";
    case "changeMorale":
      return `мораль ${signed(effect.delta)}`;
    case "randomOf":
      return `випадково: ${effect.options.map(effectLabel).join(" / ")}`;
    case "note":
      return "нотатка для DM";
    default:
      return effect.kind;
  }
}

export function targetingLabel(targeting: SpellTargeting): string {
  switch (targeting.kind) {
    case "self":
      return "себе";
    case "ally":
      return "союзник";
    case "enemy":
      return "одна ціль";
    case "allyDead":
      return "полеглий союзник";
    case "allAlliesDead":
      return "усі полеглі союзники";
    case "area":
      return `область: до ${targeting.maxTargets} ${targeting.side === "ally" ? "союзників" : "ворогів"}`;
    case "template":
      return `шаблон: до ${targeting.maxTargets} ${targeting.side === "ally" ? "союзників" : "ворогів"}`;
    case "allAllies":
      return "усі союзники";
    case "allEnemies":
      return "усі вороги";
    case "everyone":
      return "усі учасники";
  }
}

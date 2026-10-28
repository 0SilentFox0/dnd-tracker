import { EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import { AbilitiesSchema, type Ability, type Effect, type EffectKind, isActionScopedTrigger, isStaticEffect, type Trigger, type TriggerEvent } from "@/lib/utils/abilities/schema";
import { PASSIVE_TARGETS } from "@/lib/utils/abilities/schema/kinds";

const STATIC_KINDS: EffectKind[] = ["modifyStat", "damageBonus", "flag", "note"];

const ALL_KINDS = Object.keys(EFFECT_REGISTRY) as EffectKind[];

export function allowedEffectKinds(trigger: Trigger): EffectKind[] {
  if (trigger.event === "passive") return STATIC_KINDS;

  return trigger.event === "bonusAction" || trigger.event === "action" ? ALL_KINDS : ALL_KINDS.filter((k) => k !== "summon" && k !== "maneuver");
}

type WithoutKind<T> = T extends unknown ? Omit<T, "kind"> : never;

const EFFECT_DEFAULTS: { [K in EffectKind]: WithoutKind<Extract<Effect, { kind: K }>> } = {
  modifyStat: { stat: "armor", flat: 1 },
  damageBonus: { filter: { kind: "all" }, percent: 10 },
  flag: { flag: "advantage", attackKind: "all" },
  note: { text: "Опис" },
  grantAction: { refreshAction: true },
  dealDamage: { amount: "1d6", target: "eventTarget" },
  heal: { amount: "1d8" },
  dot: { damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" },
  hot: { healPerRound: "1d4", duration: { rounds: 2 }, target: "eventTarget" },
  berserk: { damageBonusPercent: 50, duration: { rounds: 1 }, target: "eventTarget" },
  charm: { duration: { rounds: 1 }, target: "eventTarget" },
  applyCondition: { condition: "no_reaction", duration: { rounds: 1 }, target: "eventTarget" },
  restoreSpellSlot: { count: 1 },
  drainSpellSlot: { count: 1, target: "eventTarget" },
  changeMorale: { delta: 1 },
  cleanse: {},
  copySpellBuffs: {},
  summon: { tier: 1 },
  raiseDead: { hpPercent: 50, target: "eventTarget" },
  guard: { percent: 50, duration: { rounds: 2 }, target: "eventTarget" },
  mark: { markId: "mark", duration: { rounds: 2 }, target: "eventTarget" },
  maneuver: { maneuver: "fireBurst", percentOfAttack: 50 },
  randomOf: { options: [{ kind: "heal", amount: "1d4" }, { kind: "changeMorale", delta: 1 }] },
};

const baseEffect = (kind: EffectKind): Effect => ({ kind, ...structuredClone(EFFECT_DEFAULTS[kind]) }) as Effect;

function fitToTrigger(effect: Effect, trigger: Trigger): Effect {
  if (trigger.event === "passive") {
    // keep incompatible effects intact so validation names the real problem instead of a missing field
    if (effect.kind !== "note" && !isStaticEffect(effect)) return effect;

    const next = { ...effect } as Record<string, unknown>;

    delete next.duration;

    if (typeof next.target === "string" && !PASSIVE_TARGETS.has(next.target)) delete next.target;

    return next as Effect;
  }

  if (isStaticEffect(effect) && !effect.duration && !isActionScopedTrigger(trigger)) return { ...effect, duration: { rounds: 1 } };

  return effect;
}

export function newEffect(kind: EffectKind, trigger: Trigger): Effect {
  return fitToTrigger(baseEffect(kind), trigger);
}

export function changeEffectKind(effect: Effect, kind: EffectKind, trigger: Trigger): Effect {
  const next = baseEffect(kind) as Record<string, unknown>;

  const old = effect as Record<string, unknown>;

  if ("target" in old && old.target !== undefined && kind !== "note" && kind !== "randomOf") next.target = old.target;

  return fitToTrigger(next as Effect, trigger);
}

export function newTrigger(event: TriggerEvent): Trigger {
  switch (event) {
    case "attack":
      return { event, phase: "before", role: "attacker" };
    case "hit":
      return { event, role: "attacker" };
    case "kill":
      return { event, role: "killer" };
    case "spellCast":
      return { event, phase: "after", role: "caster" };
    case "moraleCheck":
      return { event, result: "success", whose: "self" };
    default:
      return { event } as Trigger;
  }
}

export function changeTriggerEvent(ability: Ability, event: TriggerEvent): Ability {
  const trigger = newTrigger(event);

  const { limits, maxTargets, stackable, maxStacks, ...rest } = ability;

  const button = event === "bonusAction" || event === "action";

  return {
    ...rest,
    ...(event !== "passive" && limits && { limits }),
    ...(event !== "passive" && stackable && { stackable }),
    ...(event !== "passive" && stackable && maxStacks !== undefined && { maxStacks }),
    ...(button && maxTargets !== undefined && { maxTargets }),
    trigger, effects: ability.effects.map((e) => fitToTrigger(e, trigger)),
  };
}

const segs = (path: string) => path.split(".").filter(Boolean);

export function getAtPath(obj: unknown, path: string): unknown {
  return segs(path).reduce<unknown>((acc, k) => (acc && typeof acc === "object" ? (acc as Record<string, unknown>)[k] : undefined), obj);
}

export function setAtPath<T>(obj: T, path: string, value: unknown): T {
  const [head, ...tail] = segs(path);

  const src = (obj ?? {}) as Record<string, unknown> | unknown[];

  const copy = (Array.isArray(src) ? [...src] : { ...src }) as Record<string, unknown>;

  if (tail.length === 0) {
    if (value === undefined) delete copy[head];
    else copy[head] = value;
  } else {
    copy[head] = setAtPath(copy[head], tail.join("."), value);
  }

  return copy as T;
}

export function validateAbilities(list: unknown[]): { ok: boolean; errorsByPath: Record<string, string[]> } {
  const r = AbilitiesSchema.safeParse(list);

  if (r.success) return { ok: true, errorsByPath: {} };

  const errorsByPath: Record<string, string[]> = {};

  for (const issue of r.error.issues) (errorsByPath[issue.path.join(".")] ??= []).push(issue.message);

  return { ok: false, errorsByPath };
}

export function withFreshIds(list: Ability[], taken: string[]): Ability[] {
  const used = new Set(taken);

  let n = 1;

  return list.map((a) => {
    while (used.has(`a${n}`)) n++;

    const id = `a${n}`;

    used.add(id);

    return { ...a, id };
  });
}

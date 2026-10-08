import { EFFECT_REGISTRY } from "@/lib/utils/abilities/registry/effects";
import { AbilitiesSchema, type Ability, type Effect, type EffectKind, isActionScopedTrigger, isStaticEffect, type Trigger, type TriggerEvent } from "@/lib/utils/abilities/schema";

const STATIC_KINDS: EffectKind[] = ["modifyStat", "damageBonus", "flag", "note"];

const ALL_KINDS = Object.keys(EFFECT_REGISTRY) as EffectKind[];

const PASSIVE_TARGETS = new Set(["self", "allAllies", "allEnemies"]);

export function allowedEffectKinds(trigger: Trigger): EffectKind[] {
  if (trigger.event === "passive") return STATIC_KINDS;

  return trigger.event === "bonusAction" || trigger.event === "action" ? ALL_KINDS : ALL_KINDS.filter((k) => k !== "summon");
}

function baseEffect(kind: EffectKind): Effect {
  switch (kind) {
    case "modifyStat":
      return { kind, stat: "armor", flat: 1 };
    case "damageBonus":
      return { kind, filter: { kind: "all" }, percent: 10 };
    case "flag":
      return { kind, flag: "advantage", attackKind: "all" };
    case "note":
      return { kind, text: "Опис" };
    case "grantAction":
      return { kind, refreshAction: true };
    case "dealDamage":
      return { kind, amount: "1d6", target: "eventTarget" };
    case "heal":
      return { kind, amount: "1d8" };
    case "dot":
      return { kind, damagePerRound: "1d4", damageType: "bleed", duration: { rounds: 2 }, target: "eventTarget" };
    case "hot":
      return { kind, healPerRound: "1d4", duration: { rounds: 2 }, target: "eventTarget" };
    case "berserk":
      return { kind, damageBonusPercent: 50, duration: { rounds: 1 }, target: "eventTarget" };
    case "charm":
      return { kind, duration: { rounds: 1 }, target: "eventTarget" };
    case "applyCondition":
      return { kind, condition: "no_reaction", duration: { rounds: 1 }, target: "eventTarget" };
    case "restoreSpellSlot":
      return { kind, count: 1 };
    case "changeMorale":
      return { kind, delta: 1 };
    case "cleanse":
      return { kind };
    case "summon":
      return { kind, group: "Демони", tier: 1 };
    case "raiseDead":
      return { kind, hpPercent: 50, target: "eventTarget" };
    case "guard":
      return { kind, percent: 50, duration: { rounds: 2 }, target: "eventTarget" };
    case "mark":
      return { kind, markId: "mark", duration: { rounds: 2 }, target: "eventTarget" };
    case "randomOf":
      return { kind, options: [{ kind: "heal", amount: "1d4" }, { kind: "changeMorale", delta: 1 }] };
  }
}

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

export function newAbility(taken: string[]): Ability {
  return withFreshIds([{ id: "", name: "Нове вміння", trigger: { event: "passive" }, effects: [{ kind: "modifyStat", stat: "armor", flat: 1 }] }], taken)[0];
}

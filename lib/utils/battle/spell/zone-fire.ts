import { findParticipant, isActive, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { resolveDowned } from "@/lib/utils/abilities/engine/core/run-abilities";
import type { Rng } from "@/lib/utils/abilities/engine/core/types";
import { applyEffect } from "@/lib/utils/abilities/registry/effects";
import { type ConcentrationTag, isZoneConcentrationLive } from "@/lib/utils/battle/concentration";
import { getEffectiveArmorClass } from "@/lib/utils/battle/participant/helpers";
import { rollSave } from "@/lib/utils/battle/saves/roll-save";
import { rollDie } from "@/lib/utils/common/dice";
import type { Ruleset } from "@/lib/utils/rules";
import type { ZoneTrigger } from "@/lib/utils/spells/model/schema";
import type { ResolvedAbility } from "@/types/abilities";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

export type TriggerKind = "onEnter" | "onTurnStart" | "onExit";

export interface ZoneCtx {
  map: BattleMapConfig;
  round: number;
  rng: Rng;
  rules?: Ruleset;
}

/** Джерело тригера: зона на мапі або аура на учаснику. */
export interface FireSource {
  casterId: string;
  spellId: string;
  spellName: string;
  dc: number;
  side: "enemies" | "allies" | "all";
  concentrationOf?: ConcentrationTag;
  hitKey: string;
  excludeId?: string;
  attackBonus?: number;
  /** id ефекту-аури: накладені тригером ефекти прив'язуються до нього */
  anchorId?: string;
}

export interface Fired {
  participants: BattleParticipant[];
  messages: string[];
  failed: boolean;
}

const zoneAbility = (src: FireSource): ResolvedAbility =>
  ({ id: `zone-${src.hitKey}`, name: src.spellName, trigger: { event: "spellCast", phase: "after", role: "caster" }, effects: [], stackable: false, key: `spell:${src.spellId}`, source: { type: "skill", id: src.spellId, name: src.spellName } }) as ResolvedAbility;

const sideAllows = (side: FireSource["side"], target: BattleParticipant, owner: BattleParticipant) => side === "all" || (side === "enemies") === (target.basicInfo.side !== owner.basicInfo.side);

export function fireTrigger(ps: BattleParticipant[], src: FireSource, trigger: ZoneTrigger | undefined, kind: TriggerKind, targetId: string, ctx: ZoneCtx): Fired {
  const target = findParticipant(ps, targetId);

  const owner = findParticipant(ps, src.casterId);

  const none: Fired = { participants: ps, messages: [], failed: false };

  if (!trigger || !target || !owner || !isActive(target) || target.basicInfo.id === src.excludeId || !isZoneConcentrationLive(ps, src.concentrationOf) || !sideAllows(src.side, target, owner)) return none;

  const once = kind !== "onTurnStart";

  const key = `${src.hitKey}:${kind === "onExit" ? "out" : "in"}`;

  if (once && target.battleData.zoneHits?.[key] === ctx.round) return none;

  let next = once ? replaceParticipant(ps, { ...target, battleData: { ...target.battleData, zoneHits: { ...Object.fromEntries(Object.entries(target.battleData.zoneHits ?? {}).filter(([, r]) => r >= ctx.round - 1)), [key]: ctx.round } } }) : ps;

  const messages: string[] = [];

  if (trigger.save) {
    const res = rollSave({ target: findParticipant(next, targetId) ?? target, ability: trigger.save.ability, dc: src.dc, participants: next, rules: ctx.rules, rng: ctx.rng, vsSpell: true });

    messages.push(`🎲 ${target.basicInfo.name}: «${src.spellName}» — рятівний ${trigger.save.ability.toUpperCase()} ${res.total} проти СК ${src.dc}: ${res.success ? "успіх" : "провал"}`);

    if (res.success) return { participants: next, messages, failed: false };
  }

  if (trigger.attack) {
    const roll = rollDie(20, ctx.rng);

    const total = roll + (src.attackBonus ?? 0);

    const ac = getEffectiveArmorClass(findParticipant(next, targetId) ?? target, next);

    const hit = roll === 20 || (roll !== 1 && total >= ac);

    messages.push(`🎯 ${target.basicInfo.name}: «${src.spellName}» — атака ${roll}+${src.attackBonus ?? 0}=${total} проти КЗ ${ac}: ${hit ? "влучання" : "промах"}`);

    if (!hit) return { participants: next, messages, failed: false };
  }

  const event = { type: "spellCast" as const, phase: "after" as const, actorId: src.casterId, targetIds: [targetId] };

  const known = findParticipant(next, targetId)?.battleData.activeEffects ?? [];

  trigger.effects.forEach((effect, i) => {
    const r = applyEffect({ participants: next, ability: zoneAbility(src), effectIndex: 200 + i, ownerId: src.casterId, effect, targetIds: [targetId], event, ctx: { round: ctx.round, rng: ctx.rng, map: ctx.map, rules: ctx.rules } });

    next = r.participants;
    messages.push(...r.messages);

    for (const downed of r.downed ?? []) {
      const d = resolveDowned(next, downed, { round: ctx.round, rng: ctx.rng, rules: ctx.rules });

      next = d.participants;
      messages.push(...d.messages);
    }
  });

  if (src.anchorId) next = bindToAnchor(next, targetId, known, src);

  return { participants: next, messages, failed: true };
}

function bindToAnchor(ps: BattleParticipant[], targetId: string, known: BattleParticipant["battleData"]["activeEffects"], src: FireSource): BattleParticipant[] {
  const t = findParticipant(ps, targetId);

  if (!t || !src.anchorId) return ps;

  const tag = { anchorOf: src.anchorId, ...(src.concentrationOf && { concentrationOf: src.concentrationOf }) };

  const fresh = t.battleData.activeEffects.map((e) => (known.includes(e) || e.anchoredZone ? e : { ...e, ...tag }));

  return replaceParticipant(ps, { ...t, battleData: { ...t.battleData, activeEffects: fresh } });
}

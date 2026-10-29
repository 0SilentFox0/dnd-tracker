import { CombatStatus } from "@/lib/constants/battle";
import { findParticipant, replaceParticipant, withActiveEffects } from "@/lib/utils/abilities/engine/core/participants";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { hasCondition, removeEffects } from "@/lib/utils/battle/conditions/query";
import { resolveSave, rollSave } from "@/lib/utils/battle/saves";
import type { Ruleset } from "@/lib/utils/rules";
import type { ActiveEffect, BattleParticipant } from "@/types/battle";

export type ConcentrationTag = NonNullable<ActiveEffect["concentrationOf"]>;

const concentrationOn = (p: BattleParticipant) => p.battleData.activeEffects.find((e) => e.concentration);

export function castIdFor(casterId: string, spellId: string, round: number, seq: number): string {
  return `${casterId}:${spellId}@${round}#${seq}`;
}

export function hasConcentration(p: BattleParticipant): boolean {
  return !!concentrationOn(p);
}

function strip(ps: BattleParticipant[], casterId: string): { participants: BattleParticipant[]; spellName: string } | null {
  const caster = findParticipant(ps, casterId);

  const marker = caster && concentrationOn(caster);

  if (!marker?.concentration) return null;

  const { castId, spellName } = marker.concentration;

  const ended = (e: ActiveEffect) => e.concentration?.castId === castId || (e.concentrationOf?.casterId === casterId && e.concentrationOf.castId === castId);

  return { spellName, participants: ps.map((p) => {
    const next = removeEffects(p, ended).participant;

    return p.basicInfo.id === casterId && next.battleData.pendingCast ? { ...next, battleData: { ...next.battleData, pendingCast: undefined } } : next;
  }) };
}

export function dropConcentration(ps: BattleParticipant[], casterId: string, reason: string): { participants: BattleParticipant[]; messages: string[] } {
  const stripped = strip(ps, casterId);

  if (!stripped) return { participants: ps, messages: [] };

  const name = findParticipant(ps, casterId)?.basicInfo.name ?? casterId;

  return { participants: stripped.participants, messages: [`🔮 ${name} втрачає концентрацію на «${stripped.spellName}»${reason ? ` (${reason})` : ""}`] };
}

export function beginConcentration(
  ps: BattleParticipant[],
  casterId: string,
  castId: string,
  spellName: string,
  rounds: number,
  round = 0,
): { participants: BattleParticipant[]; messages: string[] } {
  const dropped = dropConcentration(ps, casterId, "нове заклинання");

  const caster = findParticipant(dropped.participants, casterId);

  if (!caster) return dropped;

  const next = upsertTimedEffect(caster, { timedKey: "concentration", name: `Концентрація: ${spellName}`, type: "buff", rounds, stackable: false, concentration: { castId, spellName } }, round);

  return { participants: replaceParticipant(dropped.participants, next), messages: dropped.messages };
}

export function tagConcentration(before: BattleParticipant[], after: BattleParticipant[], tag: ConcentrationTag, abilityKey: string): BattleParticipant[] {
  const beforeById = new Map(before.map((p) => [p.basicInfo.id, p]));

  let tagged = false;

  const result = after.map((p) => {
    const beforeP = beforeById.get(p.basicInfo.id);

    if (p === beforeP) return p;

    const known = beforeP?.battleData.activeEffects ?? [];

    const fresh = (e: ActiveEffect) => !e.concentration && !e.concentrationOf && !known.includes(e) && e.abilityKey?.startsWith(`${abilityKey}#`);

    if (!p.battleData.activeEffects.some(fresh)) return p;

    tagged = true;

    return withActiveEffects(p, (list) => list.map((e) => (fresh(e) ? { ...e, concentrationOf: tag } : e)));
  });

  if (!tagged) return result;

  return result.map((p) => (p.basicInfo.id === tag.casterId ? withActiveEffects(p, (list) => list.map((e) => (e.concentration?.castId === tag.castId ? { ...e, concentration: { ...e.concentration, tracksEffects: true as const } } : e))) : p));
}

/** Заклинання, чиї ефекти всі зняті (втеча, СК, дісел, спливання), більше не тримає концентрацію. */
export function dropOrphanedConcentration(ps: BattleParticipant[]): { participants: BattleParticipant[]; messages: string[] } {
  let next = ps;

  const messages: string[] = [];

  for (const p of ps) {
    const marker = concentrationOn(p);

    if (!marker?.concentration?.tracksEffects) continue;

    const { castId } = marker.concentration;

    if (next.some((q) => q.battleData.activeEffects.some((e) => e.concentrationOf?.castId === castId))) continue;

    const dropped = dropConcentration(next, p.basicInfo.id, "ефекти заклинання завершилися");

    next = dropped.participants;
    messages.push(...dropped.messages);
  }

  return { participants: next, messages };
}

export function concentrationBroken(p: BattleParticipant): boolean {
  return p.combatStats.status === CombatStatus.DEAD || p.combatStats.currentHp <= 0 || hasCondition(p, "incapacitated");
}

export function isZoneConcentrationLive(ps: BattleParticipant[], tag: ConcentrationTag | undefined): boolean {
  if (!tag) return true;

  const caster = findParticipant(ps, tag.casterId);

  return !!caster && caster.combatStats.status !== CombatStatus.DEAD && caster.battleData.activeEffects.some((e) => e.concentration?.castId === tag.castId);
}

export function concentrationCheck(input: { caster: BattleParticipant; damage: number; participants: BattleParticipant[]; rules: Ruleset; rng: () => number }): { participants: BattleParticipant[]; messages: string[] } {
  const { caster, damage, participants, rules, rng } = input;

  const id = caster.basicInfo.id;

  const marker = concentrationOn(caster);

  const ps = findParticipant(participants, id) ? replaceParticipant(participants, caster) : [caster, ...participants];

  if (!marker?.concentration || damage <= 0) return { participants: ps, messages: [] };

  if (caster.combatStats.currentHp <= 0 || caster.combatStats.status === CombatStatus.DEAD) return dropConcentration(ps, id, "");

  const dc = Math.min(rules.concentration.dcCap ?? Infinity, Math.max(10, Math.floor(damage / 2)));

  const rolled = rollSave({ target: caster, ability: "constitution", dc, participants: ps, rules, rng });

  const { result: save, participant: resisted, message } = resolveSave(caster, rolled);

  const head = `🎲 ${caster.basicInfo.name}: концентрація — рятівний кидок ВИТ ${rolled.total} проти СК ${dc}`;

  if (save.success) return { participants: message ? replaceParticipant(ps, resisted) : ps, messages: [`${head} — утримує`, ...(message ? [message] : [])] };

  return { participants: strip(ps, id)?.participants ?? ps, messages: [`${head} — втрачає концентрацію на «${marker.concentration.spellName}»`] };
}

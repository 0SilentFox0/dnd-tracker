import { CombatStatus } from "@/lib/constants/battle";
import { findParticipant, replaceParticipant, withActiveEffects } from "@/lib/utils/abilities/engine/core/participants";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { hasCondition, removeEffects } from "@/lib/utils/battle/conditions/query";
import { rollSave } from "@/lib/utils/battle/saves";
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

  return { spellName, participants: ps.map((p) => removeEffects(p, ended).participant) };
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

  return after.map((p) => {
    const beforeP = beforeById.get(p.basicInfo.id);

    if (p === beforeP) return p;

    const known = beforeP?.battleData.activeEffects ?? [];

    const fresh = (e: ActiveEffect) => !e.concentration && !e.concentrationOf && !known.includes(e) && e.abilityKey?.startsWith(`${abilityKey}#`);

    return p.battleData.activeEffects.some(fresh) ? withActiveEffects(p, (list) => list.map((e) => (fresh(e) ? { ...e, concentrationOf: tag } : e))) : p;
  });
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

  const save = rollSave({ target: caster, ability: "constitution", dc, participants: ps, rules, rng });

  const head = `🎲 ${caster.basicInfo.name}: концентрація — рятівний кидок ВИТ ${save.total} проти СК ${dc}`;

  if (save.success) return { participants: ps, messages: [`${head} — утримує`] };

  return { participants: strip(ps, id)?.participants ?? ps, messages: [`${head} — втрачає концентрацію на «${marker.concentration.spellName}»`] };
}

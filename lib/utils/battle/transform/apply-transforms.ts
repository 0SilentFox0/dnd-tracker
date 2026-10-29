import { findParticipant, replaceParticipant } from "@/lib/utils/abilities/engine/core/participants";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant";
import type { SummonDeps } from "@/lib/utils/battle/summon/ability-summons";
import { transformKey } from "@/lib/utils/battle/transform/revert";
import type { TransformRequest } from "@/lib/utils/battle/transform/types";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleParticipant, TransformState } from "@/types/battle";

function savedForm(p: BattleParticipant): TransformState["saved"] {
  const { combatStats: c, abilities: a, battleData: b } = p;

  return {
    maxHp: c.maxHp,
    currentHp: c.currentHp,
    tempHp: c.tempHp,
    armorClass: c.armorClass,
    speed: c.speed,
    ...(c.gridSize !== undefined && { gridSize: c.gridSize }),
    status: c.status,
    strength: a.strength,
    dexterity: a.dexterity,
    constitution: a.constitution,
    modifiers: { strength: a.modifiers.strength, dexterity: a.modifiers.dexterity, constitution: a.modifiers.constitution },
    attacks: b.attacks,
    ...(b.movement && { movement: b.movement }),
    ...(a.creatureType && { creatureType: a.creatureType }),
  };
}

/** Ментальні характеристики, рятівні кидки й вміння лишаються своїми; змінюються HP, КЗ, СИЛ/СПР/ВИТ, атаки, швидкість. */
function intoForm(p: BattleParticipant, form: BattleParticipant, req: TransformRequest, round: number): BattleParticipant {
  const saved = p.battleData.transform?.saved ?? savedForm(p);

  const { strength, dexterity, constitution } = form.abilities;

  const transform: TransformState = { unitId: req.unitId, castId: req.castId, expiresRound: req.expiresRound, ...(req.concentrationOf && { concentrationOf: req.concentrationOf }), saved };

  const shaped: BattleParticipant = {
    ...p,
    abilities: {
      ...p.abilities,
      ...(form.abilities.creatureType && { creatureType: form.abilities.creatureType }),
      strength,
      dexterity,
      constitution,
      modifiers: { ...p.abilities.modifiers, strength: form.abilities.modifiers.strength, dexterity: form.abilities.modifiers.dexterity, constitution: form.abilities.modifiers.constitution },
    },
    combatStats: { ...p.combatStats, maxHp: form.combatStats.maxHp, currentHp: form.combatStats.maxHp, tempHp: 0, armorClass: form.combatStats.armorClass, speed: form.combatStats.speed, ...(form.combatStats.gridSize !== undefined && { gridSize: form.combatStats.gridSize }) },
    battleData: { ...p.battleData, attacks: form.battleData.attacks, movement: form.battleData.movement, transform },
  };

  return upsertTimedEffect(
    shaped,
    {
      timedKey: transformKey(req.castId),
      name: `${req.spellName}: ${form.basicInfo.name}`,
      type: "debuff",
      rounds: Math.max(1, req.expiresRound - round),
      stackable: false,
      source: { participantId: req.casterId, name: req.spellName, abilityName: req.spellName },
      ...(req.concentrationOf && { concentrationOf: req.concentrationOf }),
    },
    round,
  );
}

export async function applyTransforms(
  order: BattleParticipant[],
  requests: TransformRequest[],
  opts: { campaignId: string; battleId: string; rules?: Ruleset; deps: SummonDeps; round: number },
): Promise<{ order: BattleParticipant[]; messages: string[] }> {
  if (requests.length === 0) return { order, messages: [] };

  const pool = await opts.deps.loadPool(opts.campaignId);

  const messages: string[] = [];

  let next = order;

  for (const req of requests) {
    const target = findParticipant(next, req.targetId);

    const unit = pool.units.find((u) => u.id === req.unitId);

    if (!target || !unit) {
      messages.push(unit ? "ціль перетворення не знайдено" : "форму перетворення не знайдено");
      continue;
    }

    const form = await createBattleParticipantFromUnit(unit as UnitFromPrisma, opts.battleId, target.basicInfo.side, 1, {}, opts.rules);

    next = replaceParticipant(next, intoForm(target, form, req, opts.round));
    messages.push(`🐾 ${target.basicInfo.name} перетворюється: ${unit.name} (${form.combatStats.maxHp} HP, КЗ ${form.combatStats.armorClass})`);
  }

  return { order: next, messages };
}

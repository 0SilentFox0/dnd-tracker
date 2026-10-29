import type { InlineSummon, SummonRequest } from "@/lib/utils/abilities/engine/core/types";
import { upsertTimedEffect } from "@/lib/utils/abilities/engine/effects/timed-effects";
import { nearestStandable } from "@/lib/utils/battle/grid/occupancy";
import { createBattleParticipantFromUnit } from "@/lib/utils/battle/participant";
import type { UnitFromPrisma } from "@/lib/utils/battle/types/participant";
import type { Ruleset } from "@/lib/utils/rules";
import type { BattleMapConfig, BattleParticipant } from "@/types/battle";

const GRID_SIZE: Record<InlineSummon["size"], number> = { tiny: 1, small: 1, medium: 1, large: 2 };

function inlineUnitRow(inline: InlineSummon, id: string, campaignId: string): UnitFromPrisma {
  const attacks = (inline.attacks ?? []).map((a) => ({ ...a, type: a.range && !/^5\s*(фт|ft)/i.test(a.range) ? "ranged" : "melee" }));

  return {
    id, campaignId, name: inline.name, raceId: null, level: 1, strength: 10, dexterity: 10, constitution: 10, intelligence: 10, wisdom: 10, charisma: 10,
    armorClass: inline.ac, initiative: 0, speed: 0, gridSize: GRID_SIZE[inline.size], maxHp: inline.hp ?? 1, proficiencyBonus: 2, attacks, knownSpells: [], avatar: null, createdAt: new Date(),
    immunities: [], morale: 0, maxTargets: 1, minTargets: 1, abilities: [], levelScaling: null, cr: null, xp: null, multiattack: 1, legendaryActions: 0, legendaryResistances: 0,
    saveProficiencies: [], statblock: { movement: { walk: 0 } }, spellcasting: {}, sourceId: null, sourceHash: null,
  } as unknown as UnitFromPrisma;
}

interface BuildInput {
  req: SummonRequest & { inline: InlineSummon };
  owner: BattleParticipant;
  order: BattleParticipant[];
  number: number;
  opts: { campaignId: string; battleId: string; rules?: Ruleset; map?: BattleMapConfig | null; round?: number };
}

export async function buildInlineSummon({ req, owner, order, number, opts }: BuildInput): Promise<BattleParticipant> {
  const { inline } = req;

  const unitId = `inline:${req.castId ?? req.spellId ?? "x"}`;

  const built = await createBattleParticipantFromUnit(inlineUnitRow(inline, unitId, opts.campaignId), opts.battleId, owner.basicInfo.side, number, {}, opts.rules);

  const base: BattleParticipant = {
    ...built,
    basicInfo: { ...built.basicInfo, id: `${unitId}:${number}`, name: req.count > 1 ? `${inline.name} ${number}` : inline.name, controlledBy: owner.basicInfo.controlledBy },
    battleData: {
      ...built.battleData,
      summonedBy: owner.basicInfo.id,
      ...(inline.hp === null && { object: { spellId: req.spellId ?? "", ...(req.expiresRound !== undefined && { expiresRound: req.expiresRound }), ...(req.concentrationOf && { concentrationOf: req.concentrationOf }) } }),
    },
  };

  const at = opts.map && req.atCell ? nearestStandable(opts.map, order, base, req.atCell) : null;

  const placed = at ? { ...base, battleData: { ...base.battleData, position: at } } : base;

  if (!inline.zone) return placed;

  return upsertTimedEffect(
    placed,
    {
      timedKey: `zone:${placed.basicInfo.id}`,
      name: inline.zone.spellName,
      type: "buff",
      rounds: inline.zoneRounds ?? 99,
      stackable: false,
      source: { participantId: owner.basicInfo.id, name: owner.basicInfo.name, abilityName: inline.zone.spellName },
      anchoredZone: inline.zone,
      ...(req.concentrationOf && { concentrationOf: req.concentrationOf }),
    },
    opts.round ?? 1,
  );
}

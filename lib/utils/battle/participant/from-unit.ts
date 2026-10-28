import type { Prisma } from "@prisma/client";

import type { UnitFromPrisma } from "../types/participant";
import { loadUnitRace } from "./load-race";

import { AttackType, CombatStatus, ParticipantSide, ParticipantSourceType } from "@/lib/constants/battle";
import { UNIT_SPELL_SLOTS } from "@/lib/constants/battle-balance";
import { CONTROLLED_BY_DM } from "@/lib/constants/characters";
import type { WeaponTrait } from "@/lib/constants/weapon-traits";
import { bakePassives } from "@/lib/utils/abilities/build/bake";
import { collectUnitAbilities } from "@/lib/utils/abilities/build/collect";
import { immunityAbilities } from "@/lib/utils/abilities/build/immunities";
import { resolveLimitFormulas } from "@/lib/utils/abilities/build/limit-formulas";
import { getAbilityModifier } from "@/lib/utils/common/calculations";
import { logger } from "@/lib/utils/common/logger";
import { getUnitImmunities } from "@/lib/utils/races/race-effects";
import { DEFAULT_RULES, moraleCapFromRules, type Ruleset } from "@/lib/utils/rules";
import { bestMentalAbility, isMonster5e, monsterSenseAbilities, multiattackAbilities, readSaveProficiencies, unitXp } from "@/lib/utils/units/monster";
import type { BattleParticipant } from "@/types/battle";
import type { Unit } from "@/types/units";

export async function createBattleParticipantFromUnit(
  unit: UnitFromPrisma,
  battleId: string,
  side: ParticipantSide,
  instanceNumber: number,
  racesById?: Record<string, Prisma.RaceGetPayload<object> | null>,
  rules: Ruleset = DEFAULT_RULES,
): Promise<BattleParticipant> {
  const modifiers = {
    strength: getAbilityModifier(unit.strength),
    dexterity: getAbilityModifier(unit.dexterity),
    constitution: getAbilityModifier(unit.constitution),
    intelligence: getAbilityModifier(unit.intelligence),
    wisdom: getAbilityModifier(unit.wisdom),
    charisma: getAbilityModifier(unit.charisma),
  };

  const attacks =
    (unit.attacks as Array<{
      name: string;
      attackBonus: number;
      damageDice: string;
      damageType: string;
      type?: AttackType;
      range?: string;
      properties?: string;
      traits?: WeaponTrait[];
      versatileDice?: string;
    }>) || [];

  const battleAttacks = attacks.map((attack, index) => {
    const rawType = (attack as { type?: string }).type;

    const attackType: AttackType =
      rawType === AttackType.RANGED
        ? AttackType.RANGED
        : rawType === AttackType.MELEE
          ? AttackType.MELEE
          : attack.range && !/^5\s*(фт|ft)/i.test(attack.range)
            ? AttackType.RANGED
            : AttackType.MELEE;

    const a = attack as {
      targetType?: string;
      maxTargets?: number;
      damageDistribution?: number[];
      guaranteedDamage?: number;
    };

    return {
      id: (attack as { id?: string }).id || `${unit.id}-attack-${index}`,
      name: attack.name,
      type: attackType,
      attackBonus: attack.attackBonus,
      damageDice: attack.damageDice,
      damageType: attack.damageType,
      range: attack.range,
      properties: attack.properties,
      targetType:
        a.targetType === "aoe"
          ? ("aoe" as const)
          : a.targetType === "target"
            ? ("target" as const)
            : undefined,
      maxTargets: a.maxTargets,
      damageDistribution: a.damageDistribution,
      guaranteedDamage: a.guaranteedDamage,
      ...(attack.traits && { traits: attack.traits }),
      ...(attack.versatileDice && { versatileDice: attack.versatileDice }),
    };
  });

  let race: Awaited<ReturnType<typeof loadUnitRace>> = null;

  try {
    race = await loadUnitRace(unit.raceId, unit.campaignId, racesById ? (racesById[unit.raceId ?? ""] ?? null) : undefined);
  } catch (error) {
    logger.error("[battle/from-unit] load race failed", { unitId: unit.id, raceId: unit.raceId, campaignId: unit.campaignId }, error);
  }

  const monster = isMonster5e(unit);

  const xp = unitXp(unit);

  const saveProficiencies = monster ? readSaveProficiencies(unit.saveProficiencies) : [];

  const statblock = monster ? ((unit.statblock ?? {}) as NonNullable<Unit["statblock"]>) : {};

  const legendary =
    monster && (unit.legendaryActions > 0 || unit.legendaryResistances > 0 || (statblock.lairResistances ?? 0) > 0)
      ? { actions: unit.legendaryActions, actionsLeft: unit.legendaryActions, resistLeft: unit.legendaryResistances }
      : undefined;

  const spellcasting = monster ? ((unit.spellcasting ?? { spells: [] }) as unknown as NonNullable<Unit["spellcasting"]>) : { spells: [] };

  const configuredSpells = Array.isArray(spellcasting.spells) ? spellcasting.spells : [];

  const knownSpells = monster ? [...new Set([...(unit.knownSpells as string[] || []), ...configuredSpells.map((grant) => grant.spellId)])] : (unit.knownSpells as string[]) || [];

  const configured = new Set(configuredSpells.map((grant) => grant.spellId));

  const grants = [
    ...configuredSpells.map((grant) => ({
      spellId: grant.spellId,
      ...(grant.perBattle !== undefined && { pool: `pool:spell:${grant.spellId}`, cost: 1 }),
      ...(grant.castLevel !== undefined && { castLevel: grant.castLevel }),
      ...(grant.dc !== undefined && { dc: grant.dc }),
      ...(grant.attackBonus !== undefined && { attackBonus: grant.attackBonus }),
      ...(grant.legendaryOnly && { legendaryOnly: true as const }),
    })),
    ...knownSpells.filter((id) => !configured.has(id)).map((spellId) => ({ spellId })),
  ];

  const pools = Object.fromEntries(configuredSpells.flatMap((grant) => grant.perBattle === undefined ? [] : [[`pool:spell:${grant.spellId}`, { label: grant.spellId, max: grant.perBattle, rest: null, ...(grant.recharge !== undefined && { recharge: grant.recharge }) }]]));

  const participant: BattleParticipant = {
    basicInfo: {
      id: `${unit.id}-${instanceNumber}-${Date.now()}`,
      battleId,
      sourceId: unit.id,
      sourceType: ParticipantSourceType.UNIT,
      instanceNumber,
      instanceId: `${unit.id}-${instanceNumber - 1}`,
      name: `${unit.name} #${instanceNumber}`,
      avatar: unit.avatar || undefined,
      side,
      controlledBy: CONTROLLED_BY_DM,
      ...(xp !== null && { xp }),
    },
    abilities: {
      level: unit.level,
      initiative: unit.initiative,
      baseInitiative: unit.initiative,
      strength: unit.strength,
      dexterity: unit.dexterity,
      constitution: unit.constitution,
      intelligence: unit.intelligence,
      wisdom: unit.wisdom,
      charisma: unit.charisma,
      modifiers,
      proficiencyBonus: unit.proficiencyBonus,
      race: race?.name ?? "",
      raceId: race?.id,
      moraleCap: moraleCapFromRules(rules),
      ...(monster && { damageModel: "5e" as const }),
      ...(statblock.creatureType && { creatureType: statblock.creatureType }),
      ...(saveProficiencies.length > 0 && { saveProficiencies }),
    },
    combatStats: {
      maxHp: unit.maxHp,
      currentHp: unit.maxHp,
      tempHp: 0,
      armorClass: unit.armorClass,
      speed: unit.speed,
      gridSize: unit.gridSize ?? 1,
      morale: (unit as { morale?: number }).morale || 0,
      status: CombatStatus.ACTIVE,
      minTargets: unit.minTargets ?? 1,
      maxTargets: unit.maxTargets ?? 1,
    },
    spellcasting: {
      spellcastingAbility: monster ? (spellcasting.ability ?? bestMentalAbility(unit)) : undefined,
      // HOMM-юніт без заклинальної характеристики: СК росте з тіром (level = тір)
      spellSaveDC: monster ? (spellcasting.dc ?? rules.formulas.saveDcBase + unit.proficiencyBonus + modifiers[spellcasting.ability ?? bestMentalAbility(unit)]) : rules.formulas.saveDcBase + unit.proficiencyBonus + unit.level,
      spellAttackBonus: monster ? spellcasting.attackBonus : undefined,
      spellSlots: monster ? {} : { universal: { max: UNIT_SPELL_SLOTS, current: UNIT_SPELL_SLOTS } },
      knownSpells,
      ...(monster && grants.length > 0 && { grants }),
    },
    battleData: {
      attacks: battleAttacks,
      activeEffects: [],
      equippedArtifacts: [],
      resolvedAbilities: [
        ...collectUnitAbilities(unit, race),
        ...(monster ? multiattackAbilities(unit) : []),
        ...monsterSenseAbilities(unit, statblock.senses),
        ...immunityAbilities(getUnitImmunities(unit as unknown as Unit), { type: "unit", id: unit.id }),
      ],
      abilityUsage: {},
      pendingExtraActions: 0,
      ...(legendary && { legendary }),
      ...(monster && { lair: { active: false, baseResistances: unit.legendaryResistances, resistSpent: 0 } }),
      ...(statblock.lairResistances !== undefined && { lairResistances: statblock.lairResistances }),
      ...(Object.keys(pools).length > 0 && { pools }),
      ...(statblock.senses && { senses: statblock.senses }),
      ...(statblock.movement && { movement: statblock.movement }),
      ...(statblock.languages && { languages: statblock.languages }),
      ...(statblock.telepathy !== undefined && { telepathy: statblock.telepathy }),
    },
    actionFlags: {
      hasUsedAction: false,
      hasUsedBonusAction: false,
      hasUsedReaction: false,
      hasExtraTurn: false,
    },
  };

  return resolveLimitFormulas(bakePassives(participant));
}

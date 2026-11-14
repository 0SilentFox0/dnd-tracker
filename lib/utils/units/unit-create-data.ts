import type { Prisma } from '@prisma/client';
import type { z } from 'zod';

import type { createUnitSchema } from '@/lib/schemas/units';
import { abilitiesJson } from '@/lib/utils/abilities/read';
import { splitColumnView } from '@/lib/utils/rules/systems/column-view';
import type { RuleSystemDefinition } from '@/lib/utils/rules/systems/types';
import { resolveUnitProficiency } from '@/lib/utils/units/monster';

export type CreateUnitData = z.infer<typeof createUnitSchema>;

const columnsOf = (data: CreateUnitData, system?: RuleSystemDefinition) => {
    const columns = {
        strength: data.strength,
        dexterity: data.dexterity,
        constitution: data.constitution,
        intelligence: data.intelligence,
        wisdom: data.wisdom,
        charisma: data.charisma,
        armorClass: data.armorClass,
        initiative: data.initiative,
        speed: data.speed,
    };

    return system ? columns : columns;
};

export function unitCreateData(
    campaignId: string,
    data: CreateUnitData,
    system?: RuleSystemDefinition
): Prisma.UnitUncheckedCreateInput {
    const characteristics =
        (system && splitColumnView(data, system).characteristics) ??
        data.characteristics;

    return {
        campaignId,
        name: data.name,
        raceId: data.raceId ?? null,
        level: data.level,
        ...columnsOf(data, system),
        gridSize: data.gridSize,
        maxHp: data.maxHp,
        proficiencyBonus: resolveUnitProficiency(data),
        minTargets: data.minTargets,
        maxTargets: data.maxTargets,
        attacks: data.attacks as Prisma.InputJsonValue,
        ...(data.abilities && { abilities: abilitiesJson(data.abilities) }),
        immunities: data.immunities as Prisma.InputJsonValue,
        knownSpells: data.knownSpells,
        morale: data.morale,
        avatar: data.avatar ?? null,
        cr: data.cr ?? null,
        xp: data.xp ?? null,
        multiattack: data.multiattack,
        legendaryActions: data.legendaryActions,
        legendaryResistances: data.legendaryResistances,
        saveProficiencies: data.saveProficiencies as Prisma.InputJsonValue,
        ...(characteristics && {
            characteristics: characteristics as Prisma.InputJsonObject,
        }),
        ...(Object.keys(data.statblock).length > 0 && {
            statblock: data.statblock as Prisma.InputJsonValue,
        }),
        ...((data.spellcasting.spells.length > 0 ||
            data.spellcasting.ability !== undefined ||
            data.spellcasting.dc !== undefined ||
            data.spellcasting.attackBonus !== undefined) && {
            spellcasting: data.spellcasting as Prisma.InputJsonValue,
        }),
    };
}

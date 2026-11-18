import type { Prisma } from '@prisma/client';

import type {
    CharacterFromPrisma,
    ExtractedAttack,
} from '../types/participant';
import {
    type ArtifactModifier,
    ArtifactModifierType,
    DEFAULT_ARTIFACT_MODIFIERS,
    getModifierValue,
    getOptionalModifierValue,
} from './artifact-utils';

import { WEAPON_PROFICIENCY_KINDS } from '@/lib/constants/artifacts';
import { AttackType } from '@/lib/constants/battle';
import { parseWeaponTraits } from '@/lib/constants/weapon-traits';
import {
    isWeaponSlot,
    weaponCategoryFromText,
} from '@/lib/utils/artifacts/weapon-slot';
import { resolveItemRow } from '@/lib/utils/items/resolve';
import { type Ruleset } from '@/lib/utils/rules';
import { SECTION_DEFAULTS } from '@/lib/utils/rules/defaults';
import { moduleVocab } from '@/lib/utils/rules/systems/vocab';

const defaultAttacks = (
    names: Ruleset['defaultAttacks'],
    classMode: boolean
): ExtractedAttack[] => [
    {
        id: 'default-melee',
        name: names.meleeName,
        type: AttackType.MELEE as ExtractedAttack['type'],
        attackBonus: 0,
        damageDice: classMode ? '1' : '',
        damageType: 'physical',
    },
    {
        id: 'default-ranged',
        name: names.rangedName,
        type: AttackType.RANGED as ExtractedAttack['type'],
        attackBonus: 0,
        damageDice: '',
        damageType: 'physical',
    },
];

/** The structured modifier wins; the description prefix ("Martial Melee Weapon.") is the fallback for older rows. */
export const weaponCategoryOf = (
    modifiers: ArtifactModifier[],
    description: string | null | undefined
): ExtractedAttack['weaponCategory'] => {
    const field = getOptionalModifierValue(
        modifiers,
        ArtifactModifierType.WEAPON_CATEGORY
    );

    if (
        (WEAPON_PROFICIENCY_KINDS as readonly string[]).includes(
            field as string
        )
    )
        return field as 'simple' | 'martial';

    return weaponCategoryFromText(description);
};

export function extractAttacksFromCharacter(
    character: CharacterFromPrisma,
    artifactsById: Record<string, Prisma.ArtifactGetPayload<object>>,
    names: Ruleset['defaultAttacks'] = SECTION_DEFAULTS.defaultAttacks,
    opts: {
        classMode?: boolean;
        items?: { enabled: boolean; attuned: readonly string[] };
        attacksOf?: () => ExtractedAttack[];
    } = {}
): ExtractedAttack[] {
    const weapons = opts.attacksOf
        ? opts.attacksOf()
        : extractWeaponAttacks(
              character,
              artifactsById,
              !!opts.classMode,
              names,
              opts.items
          );

    return [
        ...weapons,
        ...defaultAttacks(names, !!opts.classMode).filter(
            (d) => !weapons.some((w) => w.type === d.type)
        ),
    ];
}

type Equipped = Record<string, string | Record<string, unknown>>;

type ItemRow = NonNullable<ReturnType<typeof resolveItemRow>>;

type ItemsOpt = { enabled: boolean; attuned: readonly string[] };

const SLOT_KEYS = [
    'mainHand',
    ...moduleVocab('equipSlots')
        .filter((s) => s.weapon)
        .map((s) => s.id),
    'weapon',
    'weapon1',
    'weapon2',
    'range_weapon',
];

function extractWeaponAttacks(
    character: CharacterFromPrisma,
    rowsById: Record<string, Prisma.ArtifactGetPayload<object>>,
    classMode: boolean,
    names: Ruleset['defaultAttacks'],
    items?: ItemsOpt
): ExtractedAttack[] {
    const attacks: ExtractedAttack[] = [];

    if (!character.inventory) return attacks;

    const equipped = (character.inventory.equipped as Equipped) || {};

    const entries: Array<{ ref: string; secondary: boolean }> = [];

    for (const key of SLOT_KEYS) {
        const val = equipped[key];

        if (!val) continue;

        if (typeof val === 'string') {
            entries.push({ ref: val, secondary: false });
        } else if (
            typeof val === 'object' &&
            val !== null &&
            'damageDice' in val
        ) {
            attacks.push(inlineAttack(key, val, names));
        }
    }

    const shieldRef =
        classMode && typeof equipped.shield === 'string'
            ? equipped.shield
            : null;

    if (shieldRef) entries.push({ ref: shieldRef, secondary: true });

    const shieldCellEmpty = !equipped.shield;

    for (const { ref, secondary } of entries) {
        const weapon = resolveItemRow(ref, rowsById, {
            itemsEnabled: !!items?.enabled,
            attuned: items?.attuned ?? [],
        });

        if (!weapon) continue;

        if (
            secondary
                ? weapon.slot !== 'weapon'
                : !isWeaponSlot(weapon.slot)
        )
            continue;

        attacks.push(
            attackFromItem(weapon, { ref, secondary, classMode, shieldCellEmpty })
        );
    }

    return attacks;
}

function inlineAttack(
    key: string,
    val: Record<string, unknown>,
    names: Ruleset['defaultAttacks']
): ExtractedAttack {
    const inv = val as {
        id?: string;
        name?: string;
        attackBonus?: number;
        damageDice?: string;
        damageType?: string;
        weaponType?: string;
        range?: string;
    };

    const isRanged =
        inv.weaponType?.toLowerCase() === AttackType.RANGED ||
        key === 'range_weapon' ||
        (typeof inv.range === 'string' &&
            inv.range.trim() !== '' &&
            inv.range !== '5 ft');

    return {
        id: inv.id ?? `inline-${key}`,
        name: (inv.name as string) ?? names.weaponName,
        type: (isRanged
            ? AttackType.RANGED
            : AttackType.MELEE) as ExtractedAttack['type'],
        attackBonus: typeof inv.attackBonus === 'number' ? inv.attackBonus : 0,
        damageDice: (inv.damageDice as string) ?? '1d6',
        damageType: (inv.damageType as string) ?? 'bludgeoning',
        range: typeof inv.range === 'string' ? inv.range : undefined,
    };
}

function attackFromItem(
    weapon: ItemRow,
    ctx: {
        ref: string;
        secondary: boolean;
        classMode: boolean;
        shieldCellEmpty: boolean;
    }
): ExtractedAttack {
    const { ref, secondary, classMode } = ctx;

    const modifiers = (weapon.modifiers as ArtifactModifier[]) || [];

    const bonuses = (weapon.bonuses as Record<string, number>) || {};

    const attackBonus = bonuses.attackBonus || bonuses.attack || 0;

    const damageDice =
        getOptionalModifierValue(modifiers, ArtifactModifierType.DAMAGE_DICE) ??
        '1d6';

    const damageType = getModifierValue(
        modifiers,
        ArtifactModifierType.DAMAGE_TYPE,
        DEFAULT_ARTIFACT_MODIFIERS.DAMAGE_TYPE
    );

    let attackType = getModifierValue(
        modifiers,
        ArtifactModifierType.ATTACK_TYPE,
        AttackType.MELEE
    );

    const rangeVal = getOptionalModifierValue(
        modifiers,
        ArtifactModifierType.RANGE
    );

    if (
        attackType !== AttackType.RANGED &&
        (attackType?.toLowerCase() === AttackType.RANGED ||
            weapon.slot === 'range_weapon' ||
            (rangeVal && rangeVal.trim() !== '' && rangeVal !== '5 ft'))
    ) {
        attackType = AttackType.RANGED;
    }

    const traits = classMode
        ? parseWeaponTraits(
              getOptionalModifierValue(modifiers, ArtifactModifierType.TRAITS)
          )
        : [];

    const versatileDice = classMode
        ? getOptionalModifierValue(
              modifiers,
              ArtifactModifierType.VERSATILE_DICE
          )
        : undefined;

    const thrownMelee = traits.includes('thrown');

    const useVersatile =
        classMode &&
        !secondary &&
        traits.includes('versatile') &&
        !!versatileDice &&
        ctx.shieldCellEmpty;

    const damageBonus =
        Number(
            getOptionalModifierValue(
                modifiers,
                ArtifactModifierType.DAMAGE_BONUS
            ) ?? 0
        ) || 0;

    const category = weaponCategoryOf(modifiers, weapon.description);

    return {
        id: secondary ? `${ref}:off` : ref,
        name: weapon.name,
        type: (attackType === AttackType.RANGED && !thrownMelee
            ? AttackType.RANGED
            : AttackType.MELEE) as ExtractedAttack['type'],
        attackBonus,
        damageDice: useVersatile ? versatileDice : damageDice,
        damageType,
        range: rangeVal,
        properties: getOptionalModifierValue(
            modifiers,
            ArtifactModifierType.PROPERTIES
        ),
        minTargets:
            parseInt(
                getModifierValue(
                    modifiers,
                    ArtifactModifierType.MIN_TARGETS,
                    '0'
                )
            ) || undefined,
        maxTargets:
            parseInt(
                getModifierValue(
                    modifiers,
                    ArtifactModifierType.MAX_TARGETS,
                    '0'
                )
            ) || undefined,
        ...(traits.length > 0 && { traits }),
        ...(versatileDice && { versatileDice }),
        ...(secondary && { hand: 'off' as const }),
        ...(damageBonus !== 0 && { damageBonus }),
        ...(classMode && category && { weaponCategory: category }),
    };
}

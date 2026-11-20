import { editionOf } from '../edition';
import { footGroupOf } from '../edition/group-use';
import { readStats } from '../equipment/guard';
import type { QualityRef } from '../equipment/qualities';
import {
    canonEngageCells,
    type WeaponProfile,
    weaponProfile,
} from '../equipment/weapon-profile';
import {
    ATTACK_SLOT,
    type WfrpAttackSlot as WfrpSlot,
    type WfrpHand,
} from '../slots';

import { ArtifactSlot } from '@/lib/constants/artifacts';
import { AttackType } from '@/lib/constants/battle';
import { isWeaponSlot } from '@/lib/utils/artifacts/weapon-slot';
import type { EquippedArtifactRow } from '@/lib/utils/battle/participant/extract-artifacts';
import type { ExtractedAttack } from '@/lib/utils/battle/types/participant';
import type { Ruleset } from '@/lib/utils/rules/schema';

const valueOf = (list: { key: string; value?: number }[], key: string) =>
    list.find((q) => q.key === key)?.value;

// Targets hit per cell of blast radius
const BLAST_TARGETS_PER_RADIUS_CELL = 4;

const GUNPOWDER_GROUPS = ['blackpowder', 'engineering', 'explosives'];

const YARDS_PER_CELL = 2;

/** Blackpowder, Engineering and Explosives weapons all have Blackpowder and Damaging (p303) */
function withGunpowder(
    group: string | undefined,
    qualities: QualityRef[]
): QualityRef[] {
    if (!group || !GUNPOWDER_GROUPS.includes(group)) return qualities;

    return (['blackpowder', 'damaging'] as const).reduce(
        (list, key) =>
            list.some((q) => q.key === key) ? list : [...list, { key }],
        qualities
    );
}

export function extractWfrpAttacks({
    rows,
    rules,
}: {
    rows: EquippedArtifactRow[];
    rules?: Ruleset;
}): ExtractedAttack[] {
    const canon = rules ? editionOf(rules).gearModel === 'canon' : false;

    const seen = new Set<string>();

    return rows.flatMap(({ row, slot, carried }) => {
        if (carried || !(isWeaponSlot(slot) || slot === ArtifactSlot.SHIELD))
            return [];

        const profile = weaponProfile(row.systemStats);

        if (!profile) return [];

        const stats = canon ? readStats(row.systemStats) : null;

        const reach =
            stats?.type === 'weapon' && stats.range === undefined
                ? (stats.reach ?? 'average')
                : undefined;

        const id = seen.has(row.id) ? `${row.id}:${slot}` : row.id;

        seen.add(row.id);

        return [
            wfrpAttackFromProfile(id, row.name, profile, {
                hand: slot === ArtifactSlot.SHIELD ? 'off' : 'main',
                ...(reach && { reach }),
                ...(canon && {
                    canon: true as const,
                    ...(profile.twoHanded && { twoHanded: true as const }),
                }),
            }),
        ];
    });
}

export function wfrpAttackFromProfile(
    id: string,
    name: string,
    profile: WeaponProfile,
    extra?: {
        magical?: true;
        free?: true;
        hand?: WfrpHand;
        reach?: NonNullable<WfrpSlot['reach']>;
        canon?: true;
        twoHanded?: true;
    }
): ExtractedAttack {
    const ranged = profile.range === 'ranged';

    const canon = extra?.canon === true;

    const qualities = canon
        ? withGunpowder(profile.group, profile.qualities)
        : profile.qualities;

    const group =
        canon && profile.group
            ? footGroupOf(profile.group, profile.twoHanded)
            : profile.group;

    const blast = valueOf(qualities, 'blast');

    const blastRadius =
        blast && canon ? Math.floor(blast / (2 * YARDS_PER_CELL)) : blast;

    const repeater = canon ? valueOf(profile.qualities, 'repeater') : undefined;

    const ammoCapacity = repeater ?? profile.ammoCapacity;

    const reload = valueOf(profile.flaws, 'reload');

    return {
        id,
        name,
        type: (ranged
            ? AttackType.RANGED
            : AttackType.MELEE) as ExtractedAttack['type'],
        attackBonus: 0,
        damageDice: '',
        damageBonus: profile.damageFlat,
        damageType: 'physical',
        ...(ranged && { range: `${profile.rangeFt} ft` }),
        ...(blast &&
            blastRadius && {
                targetType: 'aoe' as const,
                maxTargets: blastRadius * BLAST_TARGETS_PER_RADIUS_CELL,
                blastRadius,
            }),
        system: ATTACK_SLOT.write({
            qualities,
            flaws: profile.flaws,
            ...(group && { group }),
            ...(!profile.addSb && { noSb: true }),
            ...(extra?.magical && { magical: true as const }),
            ...(extra?.free && { free: true as const }),
            ...(extra?.hand && { hand: extra.hand }),
            ...(extra?.reach && { reach: extra.reach }),
            ...(extra?.twoHanded && { twoHanded: true as const }),
        }),
        noLevelDice: true,
        ...(ammoCapacity !== undefined && {
            ammo: { capacity: ammoCapacity, ...(reload && { reload }) },
        }),
        ...(!ranged &&
            profile.cells && {
                reachCells: extra?.reach
                    ? canonEngageCells(extra.reach)
                    : profile.cells,
            }),
        ...(qualities.some((q) => q.key === 'pistol') && {
            ignoresEngagement: true as const,
        }),
    };
}

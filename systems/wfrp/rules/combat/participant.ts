import { bonus, moveOf, value } from '../characteristics/derive';
import {
    type Characteristics,
    readCharacteristics,
} from '../characteristics/keys';
import { foldCorruption } from '../corruption/fold';
import { applyBurden, asBurdenTier } from '../equipment/burden';
import { burdenedMove, type BurdenTier } from '../equipment/encumbrance';
import { PARTICIPANT_SLOT } from '../slots';
import type { HitLocation } from './constants';
import { LOCATIONS } from './constants';

import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { TraitSize } from '@/systems/wfrp/rules/trait-kinds';
import type { BattleParticipant } from '@/types/battle';

export interface WfrpParticipantStats {
    sb: number;
    tb: number;
    ag: number;
    ap: Record<HitLocation, number>;
    flexible?: true;
    castAp?: number;
    size?: TraitSize;
    ward?: number;
    burden?: Exclude<BurdenTier, 0>;
    /** Shield rating (AP) carried; canon gear grants +1 SL on Dodge and Melee defence (p306) */
    shield?: number;
    /** AP worn off by Hack hits per location, canon gear only (p304) */
    armourDamage?: Partial<Record<HitLocation, number>>;
}

const NO_ARMOR = Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<
    HitLocation,
    number
>;

export interface WfrpGear {
    ap: Record<HitLocation, number>;
    flexible?: boolean;
    armourOnly?: Record<HitLocation, number>;
    burden?: number;
    shield?: number;
}

function castApOf(gear?: WfrpGear): { castAp?: number } {
    if (!gear?.armourOnly) return {};

    const armour = Math.max(gear.armourOnly.head, gear.armourOnly.body);

    return armour === Math.max(gear.ap.head, gear.ap.body)
        ? {}
        : { castAp: armour };
}

// The XP ledger and downtime are private and unused in battle; corruption is folded into base values.
export function wfrpAbilitiesOf(
    characteristics: Characteristics,
    gear?: WfrpGear
): { system: SystemSlot } {
    const { downtime: _downtime, ...folded } = foldCorruption(characteristics);

    const tier = asBurdenTier(gear?.burden);

    const rest = applyBurden(folded, tier);

    return {
        system: PARTICIPANT_SLOT.write({
            characteristics: { ...rest, ledger: [] },
            stats: {
                sb: bonus(rest, 's'),
                ag: value(rest, 'ag'),
                tb: bonus(rest, 't'),
                ap: { ...(gear?.ap ?? NO_ARMOR) },
                ...(gear?.flexible && { flexible: true as const }),
                ...castApOf(gear),
                ...(tier !== 0 && { burden: tier }),
                ...(gear?.shield && { shield: gear.shield }),
            },
        }),
    };
}

export const wfrpParticipantFields = (
    row: { characteristics?: unknown },
    gear?: WfrpGear
): SystemSlot => wfrpAbilitiesOf(readCharacteristics(row), gear).system;

export const participantStats = (
    p: BattleParticipant
): WfrpParticipantStats | undefined =>
    PARTICIPANT_SLOT.read(p.abilities.system)?.stats;

export const apAt = (
    stats: WfrpParticipantStats | undefined,
    location: HitLocation
): number =>
    Math.max(
        0,
        (stats?.ap[location] ?? 0) - (stats?.armourDamage?.[location] ?? 0)
    );

export function withArmourWear(
    p: BattleParticipant,
    location: HitLocation,
    amount: number
): BattleParticipant {
    const slot = PARTICIPANT_SLOT.read(p.abilities.system);

    if (!slot || amount <= 0) return p;

    const worn = slot.stats.armourDamage ?? {};

    return {
        ...p,
        abilities: {
            ...p.abilities,
            system: PARTICIPANT_SLOT.write(
                {
                    ...slot,
                    stats: {
                        ...slot.stats,
                        armourDamage: {
                            ...worn,
                            [location]: (worn[location] ?? 0) + amount,
                        },
                    },
                },
                p.abilities.system
            ),
        },
    };
}

export const participantChars = (p: BattleParticipant): Characteristics =>
    readCharacteristics({
        characteristics: PARTICIPANT_SLOT.read(p.abilities.system)
            ?.characteristics,
    });

export function wfrpBaseStats(
    row: { characteristics?: unknown },
    gear?: WfrpGear
): {
    initiative: number;
    speed: number;
} {
    const c = readCharacteristics(row);

    const move = burdenedMove(moveOf(c), asBurdenTier(gear?.burden));

    return { initiative: value(c, 'i'), speed: move * 2 * 3 };
}

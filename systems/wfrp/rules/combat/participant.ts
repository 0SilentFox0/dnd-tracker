import { bonus, value, walkYards } from '../characteristics/derive';
import {
    type Characteristics,
    readCharacteristics,
} from '../characteristics/keys';
import { foldCorruption } from '../corruption/fold';
import { editionOf } from '../edition/read';
import { PARTICIPANT_SLOT } from '../slots';
import type { HitLocation } from './constants';
import { LOCATIONS } from './constants';

import type { Ruleset } from '@/lib/utils/rules/schema';
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
    /** canon5e: best armour-only AP over all locations */
    castApAll?: number;
    size?: TraitSize;
    ward?: number;
}

const NO_ARMOR = Object.fromEntries(LOCATIONS.map((l) => [l, 0])) as Record<
    HitLocation,
    number
>;

export interface WfrpGear {
    ap: Record<HitLocation, number>;
    flexible?: boolean;
    armourOnly?: Record<HitLocation, number>;
}

function castApOf(
    gear?: WfrpGear,
    canon = false
): {
    castAp?: number;
    castApAll?: number;
} {
    if (!gear?.armourOnly) return {};

    const armour = Math.max(gear.armourOnly.head, gear.armourOnly.body);

    const all = Math.max(...Object.values(gear.armourOnly));

    return {
        ...(armour !== Math.max(gear.ap.head, gear.ap.body) && {
            castAp: armour,
        }),
        ...(canon &&
            all !== Math.max(...Object.values(gear.ap)) && {
                castApAll: all,
            }),
    };
}

// The XP ledger and downtime are private and unused in battle; corruption is folded into base values.
export function wfrpAbilitiesOf(
    characteristics: Characteristics,
    gear?: WfrpGear,
    rules?: Ruleset
): { system: SystemSlot } {
    const { downtime: _downtime, ...rest } = foldCorruption(characteristics);

    return {
        system: PARTICIPANT_SLOT.write({
            characteristics: { ...rest, ledger: [] },
            stats: {
                sb: bonus(rest, 's'),
                ag: value(rest, 'ag'),
                tb: bonus(rest, 't'),
                ap: { ...(gear?.ap ?? NO_ARMOR) },
                ...(gear?.flexible && { flexible: true as const }),
                ...castApOf(gear, editionOf(rules).magicModel === 'canon5e'),
            },
        }),
    };
}

export const wfrpParticipantFields = (
    row: { characteristics?: unknown },
    gear?: WfrpGear,
    rules?: Ruleset
): SystemSlot => wfrpAbilitiesOf(readCharacteristics(row), gear, rules).system;

export const participantStats = (
    p: BattleParticipant
): WfrpParticipantStats | undefined =>
    PARTICIPANT_SLOT.read(p.abilities.system)?.stats;

export const participantChars = (p: BattleParticipant): Characteristics =>
    readCharacteristics({
        characteristics: PARTICIPANT_SLOT.read(p.abilities.system)
            ?.characteristics,
    });

export function wfrpBaseStats(row: { characteristics?: unknown }): {
    initiative: number;
    speed: number;
} {
    const c = readCharacteristics(row);

    return { initiative: value(c, 'i'), speed: walkYards(c) * 3 };
}

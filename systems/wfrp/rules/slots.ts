import type { Characteristics } from './characteristics/keys';
import type { SheetWfrpBlock } from './characteristics/sheet-block';
import type { WfrpParticipantStats } from './combat/participant';
import { WEAPON_REACHES } from './equipment/constants';
import { qualityList } from './equipment/guard';
import type { QualityRef } from './equipment/qualities';
import type { WfrpWeaponStats } from './equipment/stats';
import type {
    PercentileAttackDetails,
    PercentileCastDetails,
} from './percentile/details';

import { isRecord } from '@/lib/utils/common/is-record';
import { defineSlot } from '@/lib/utils/rules/systems/slot';
import type { ParticipantSide } from '@/types/battle';

export type WfrpHand = 'main' | 'off';

type WeaponReach = NonNullable<WfrpWeaponStats['reach']>;

export interface WfrpAttackSlot {
    qualities: QualityRef[];
    flaws: QualityRef[];
    noSb?: boolean;
    magical?: true;
    /** Hand the weapon is held in; absent for trait, unarmed and spell attacks */
    hand?: WfrpHand;
    /** Weapon group, picks the Melee/Ranged skill speciality */
    group?: string;
    /** Needs both hands, canon gear only: unusable with either arm disabled (p164) */
    twoHanded?: true;
    /** Weapon reach, canon gear only (p300) */
    reach?: WeaponReach;
}

// Legacy rows stored `hand: true` (main) and `offHand: true` (off)
function handOf(raw: Record<string, unknown>): WfrpHand | undefined {
    if (raw.hand === 'main' || raw.hand === 'off') return raw.hand;

    if (raw.offHand === true) return 'off';

    return raw.hand === true ? 'main' : undefined;
}

export const ATTACK_SLOT = defineSlot<WfrpAttackSlot>('wfrp', (raw) => {
    if (!isRecord(raw)) return undefined;

    const qualities = qualityList(raw.qualities);

    const flaws = qualityList(raw.flaws);

    if (!qualities || !flaws) return undefined;

    return {
        qualities,
        flaws,
        ...(typeof raw.group === 'string' && { group: raw.group }),
        ...(typeof raw.reach === 'string' &&
            (WEAPON_REACHES as readonly string[]).includes(raw.reach) && {
                reach: raw.reach as WeaponReach,
            }),
        ...(raw.twoHanded === true && { twoHanded: true as const }),
        ...(raw.noSb === true && { noSb: true }),
        ...(raw.magical === true && { magical: true as const }),
        ...(handOf(raw) && { hand: handOf(raw) }),
    };
});

export interface WfrpParticipantSlot {
    characteristics: Characteristics;
    stats: WfrpParticipantStats;
}

export const PARTICIPANT_SLOT = defineSlot<WfrpParticipantSlot>(
    'wfrp',
    (raw) =>
        isRecord(raw) && isRecord(raw.characteristics) && isRecord(raw.stats)
            ? (raw as unknown as WfrpParticipantSlot)
            : undefined
);

export const SHEET_SLOT = defineSlot<SheetWfrpBlock>('wfrp', (raw) =>
    isRecord(raw) ? (raw as unknown as SheetWfrpBlock) : undefined
);

export interface WfrpActionSlot {
    attack?: PercentileAttackDetails;
    cast?: PercentileCastDetails;
}

export const ACTION_SLOT = defineSlot<WfrpActionSlot>('wfrp', (raw) => {
    if (!isRecord(raw)) return undefined;

    const attack = isRecord(raw.attack)
        ? (raw.attack as unknown as PercentileAttackDetails)
        : undefined;

    const cast = isRecord(raw.cast)
        ? (raw.cast as unknown as PercentileCastDetails)
        : undefined;

    return attack || cast
        ? { ...(attack && { attack }), ...(cast && { cast }) }
        : undefined;
});

export type SceneMomentum = Partial<Record<ParticipantSide, true>>;

export const SCENE_SLOT = defineSlot<SceneMomentum>('wfrp', (raw) => {
    if (!isRecord(raw)) return undefined;

    return Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v === true)
    ) as SceneMomentum;
});

export type WfrpMoveMode = 'run' | 'sprint' | 'charge';

export interface WfrpParticipantState {
    fortune?: number;
    /** Current Fate where Fate is its own pool (canon5e) */
    fate?: number;
    /** Personal Momentum, canon5e only (p168) */
    momentum?: true;
    /** Fled the fight alive through Fate "Not Today" (p133), canon5e */
    outOfFight?: true;
    /** Spent Momentum on the second weapon's attack this turn (p167) */
    momentumAttack?: true;
    /** Hand of the last weapon attack this turn, or `cast` after a spell (p167) */
    lastHand?: WfrpHand | 'cast';
    /** A melee attack hit this turn: the Parry weapon's second attack is then unopposed (p304), canon gear */
    meleeHit?: true;
    channelledSl?: number;
    /** Movement chosen this turn, canon5e (p163); a Charge limits attacks to melee */
    moveMode?: WfrpMoveMode;
    /** Critical Wounds taken this battle, canon5e (p172) */
    critWounds?: number;
    /** Rounds left before a critically wounded, unconscious fighter dies (p172) */
    dyingRounds?: number;
    sin?: number;
    conditionTests?: string[];
    psychologyTested?: Partial<Record<string, number>>;
    /** Unresolved Fear by source id, canon5e (p183): SL gathered so far toward `rating`, `round` of the last roll */
    fear?: Record<string, FearEntry>;
    /** In a Frenzy, canon5e (p184) */
    frenzy?: true;
    /** Hatred the fighter failed to master, canon5e (p184): must attack the group; `round` is when it took hold */
    compelled?: Record<string, CompelEntry>;
}

export interface CompelEntry {
    group: string;
    round: number;
}

export interface FearEntry {
    rating: number;
    sl: number;
    round: number;
}

const finite = (v: unknown): v is number =>
    typeof v === 'number' && Number.isFinite(v);

export const PARTICIPANT_STATE = defineSlot<WfrpParticipantState>(
    'wfrp',
    (raw) => {
        if (!isRecord(raw)) return undefined;

        const tested = isRecord(raw.psychologyTested)
            ? Object.fromEntries(
                  Object.entries(raw.psychologyTested).filter(([, v]) =>
                      finite(v)
                  )
              )
            : undefined;

        const fear = isRecord(raw.fear)
            ? Object.fromEntries(
                  Object.entries(raw.fear).flatMap(([id, e]) =>
                      isRecord(e) &&
                      finite(e.rating) &&
                      finite(e.sl) &&
                      finite(e.round)
                          ? [
                                [
                                    id,
                                    {
                                        rating: e.rating,
                                        sl: e.sl,
                                        round: e.round,
                                    },
                                ],
                            ]
                          : []
                  )
              )
            : undefined;

        const compelled = isRecord(raw.compelled)
            ? Object.fromEntries(
                  Object.entries(raw.compelled).flatMap(([k, e]) =>
                      isRecord(e) &&
                      typeof e.group === 'string' &&
                      finite(e.round)
                          ? [[k, { group: e.group, round: e.round }]]
                          : []
                  )
              )
            : undefined;

        return {
            ...(finite(raw.fortune) && { fortune: raw.fortune }),
            ...(finite(raw.fate) && { fate: raw.fate }),
            ...(raw.momentum === true && { momentum: true as const }),
            ...(raw.outOfFight === true && { outOfFight: true as const }),
            ...(raw.momentumAttack === true && {
                momentumAttack: true as const,
            }),
            ...((raw.lastHand === 'main' ||
                raw.lastHand === 'off' ||
                raw.lastHand === 'cast') && { lastHand: raw.lastHand }),
            ...(raw.meleeHit === true && { meleeHit: true as const }),
            ...(finite(raw.channelledSl) && { channelledSl: raw.channelledSl }),
            ...((raw.moveMode === 'run' ||
                raw.moveMode === 'sprint' ||
                raw.moveMode === 'charge') && { moveMode: raw.moveMode }),
            ...(finite(raw.critWounds) && { critWounds: raw.critWounds }),
            ...(finite(raw.dyingRounds) && { dyingRounds: raw.dyingRounds }),
            ...(finite(raw.sin) && { sin: raw.sin }),
            ...(Array.isArray(raw.conditionTests) && {
                conditionTests: raw.conditionTests.filter(
                    (k): k is string => typeof k === 'string'
                ),
            }),
            ...(raw.frenzy === true && { frenzy: true as const }),
            ...(fear && Object.keys(fear).length > 0 && { fear }),
            ...(compelled &&
                Object.keys(compelled).length > 0 && { compelled }),
            ...(tested && {
                psychologyTested: tested as Record<string, number>,
            }),
        };
    }
);

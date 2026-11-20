import type { Characteristics } from './characteristics/keys';
import type { SheetWfrpBlock } from './characteristics/sheet-block';
import type { WfrpParticipantStats } from './combat/participant';
import { qualityList } from './equipment/guard';
import type { QualityRef } from './equipment/qualities';
import type {
    PercentileAttackDetails,
    PercentileCastDetails,
} from './percentile/details';

import { isRecord } from '@/lib/utils/common/is-record';
import { defineSlot } from '@/lib/utils/rules/systems/slot';
import type { ParticipantSide } from '@/types/battle';

export type WfrpHand = 'main' | 'off';

export interface WfrpAttackSlot {
    qualities: QualityRef[];
    flaws: QualityRef[];
    noSb?: boolean;
    magical?: true;
    /** Hand the weapon is held in; absent for trait, unarmed and spell attacks */
    hand?: WfrpHand;
    /** Weapon group, picks the Melee/Ranged skill speciality */
    group?: string;
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
            ...(tested && {
                psychologyTested: tested as Record<string, number>,
            }),
        };
    }
);

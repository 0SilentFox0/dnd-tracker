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

export interface WfrpAttackSlot {
    qualities: QualityRef[];
    flaws: QualityRef[];
    noSb?: boolean;
    magical?: true;
}

export const ATTACK_SLOT = defineSlot<WfrpAttackSlot>('wfrp', (raw) => {
    if (!isRecord(raw)) return undefined;

    const qualities = qualityList(raw.qualities);

    const flaws = qualityList(raw.flaws);

    if (!qualities || !flaws) return undefined;

    return {
        qualities,
        flaws,
        ...(raw.noSb === true && { noSb: true }),
        ...(raw.magical === true && { magical: true as const }),
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

export interface WfrpParticipantState {
    fortune?: number;
    channelledSl?: number;
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
            ...(finite(raw.channelledSl) && { channelledSl: raw.channelledSl }),
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

import type { PercentileOutcome } from '../percentile/resolve';

import type { Coin } from '@/lib/constants/inventory';
import type { WfrpConditionKey } from '@/systems/wfrp/constants/conditions';
import type { LogLine } from '@/types/text';

export type AilmentKind = 'festering' | 'disease' | 'injury';

export type Ailment = {
    id: string;
    kind: AilmentKind;
    daysLeft: number;
    label: string;
};

export type EndeavourKind = 'earn' | 'train' | 'tend' | 'rest' | 'custom';

export type Endeavour =
    | {
          kind: 'earn';
          params: { skill: 'trade'; spec: string } | { skill: 'charm' };
      }
    | {
          kind: 'train';
          params: { kind: 'characteristic' | 'skill'; key: string };
      }
    | { kind: 'tend'; params: { patientId: string } }
    | { kind: 'rest'; params: Record<string, never> }
    | { kind: 'custom'; params: { text: string } };

export type TrainingCredit = {
    kind: 'characteristic' | 'skill';
    key: string;
    discount: number;
};

export type TestOutcome = {
    roll: number;
    target: number;
    sl: number;
    outcome: PercentileOutcome;
};

export type CoinAmount = { coin: Coin; amount: number };

export type PeriodSummary = {
    skipped?: 'dead' | 'incapacitated';
    healed: number;
    endeavour?: {
        kind: EndeavourKind;
        test?: TestOutcome;
        coins?: CoinAmount;
        discount?: number;
        patientId?: string;
        skipped?: 'patientAbsent';
    };
    ailments: {
        id: string;
        label: string;
        kind: AilmentKind;
        daysLeft: number;
        expired?: boolean;
        test?: TestOutcome;
        wounds?: number;
    }[];
    event?: {
        roll: number;
        index: number;
        text: LogLine;
        wounds?: number;
        conditions: { key: WfrpConditionKey; levels: number }[];
    };
};

export type PeriodSnapshot = {
    id: string;
    at: string;
    days: number;
    before: { hp?: number; ailments: Ailment[]; training?: TrainingCredit };
    after: { hp?: number; ailmentIds: string[]; training?: TrainingCredit };
    coins?: CoinAmount;
    summary: PeriodSummary;
};

export type DowntimeState = {
    endeavour?: Endeavour;
    ailments: Ailment[];
    training?: TrainingCredit;
    lastPeriod?: PeriodSnapshot;
};

export const AILMENTS_MAX = 20;

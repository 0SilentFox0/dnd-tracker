import type { EditionProfile } from '../../edition';
import type { WfrpAttackMods } from '../../percentile/fortune';

import type { ResolveAttackCtx } from '@/lib/utils/rules/systems/types';

export interface AttackModCtx {
    ctx: ResolveAttackCtx;
    edition: EditionProfile;
    kind: 'melee' | 'ranged';
    input?: WfrpAttackMods;
    distanceYd?: number;
}

export interface AttackMod {
    key: string;
    sl: number;
    advantage?: number;
    disadvantage?: number;
}

export type AttackModSource = (c: AttackModCtx) => AttackMod[];

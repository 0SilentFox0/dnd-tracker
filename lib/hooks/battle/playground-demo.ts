import { buildMockParticipants } from './mock-participants';

import { placeParticipants } from '@/lib/utils/battle/grid';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, SpellTemplate } from '@/types/battle-grid';

export type BattleMapPlaygroundMode =
    | 'move'
    | 'attack'
    | 'template'
    | 'maze-mark';

export type BattleMapPlaygroundLogKey =
    | 'mazeMark'
    | 'outOfRange'
    | 'template'
    | 'move'
    | 'hit'
    | 'turn';

export interface BattleMapPlaygroundLogEntry {
    key: BattleMapPlaygroundLogKey;
    params: Record<string, string | number>;
}

export interface BattleMapPlaygroundSnapshot {
    map?: BattleMapConfig;
    participants?: BattleParticipant[];
}

export const DEMO_DAMAGE = 7;

export const DEMO_TERRAIN: NonNullable<BattleMapConfig['terrain']> = {
    '9:3': { kind: 'wall' },
    '9:4': { kind: 'wall' },
    '9:5': { kind: 'wall' },
    '6:7': { kind: 'barrier', untilRound: 3 },
    '7:7': { kind: 'barrier', untilRound: 3 },
    '12:8': { kind: 'hazard', label: 'Fire wall' },
    '13:8': { kind: 'hazard', label: 'Fire wall' },
    '12:9': { kind: 'hazard', label: 'Fire wall' },
};

export const LOG_LIMIT = 6;

export const DEMO_TEMPLATE: SpellTemplate = { shape: 'circle', size: 20 };

export const DEMO_RANGE = 60;

export function initial(map: BattleMapConfig): BattleParticipant[] {
    return placeParticipants(map, buildMockParticipants());
}

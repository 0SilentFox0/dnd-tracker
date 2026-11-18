import type { Downed, Rng } from '@/lib/utils/abilities/engine/core/types';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export interface ManeuverInput {
    actorId: string;
    name: string;
    percentOfAttack: number;
    targetIds: string[];
    targetCell?: GridPoint;
    range?: number;
    maxTargets?: number;
    map?: BattleMapConfig | null;
    round: number;
    rng: Rng;
    rules: Ruleset;
}

export interface ManeuverResult {
    participants: BattleParticipant[];
    messages: LogLine[];
    downed: Downed[];
}

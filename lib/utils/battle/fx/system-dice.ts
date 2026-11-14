import type { DiceThrowSpec } from './dice/from-action';

import type { BattleParticipant } from '@/types/battle';

export interface SystemDice {
    /** Unique per throw; becomes the key of the queued FX */
    key: string;
    spec: DiceThrowSpec;
    actorId: string;
    /** Called when the throw has finished playing */
    onDone?(): void;
}

export interface SystemDiceEvent {
    round: number;
    turnIndex: number;
    participants: BattleParticipant[];
    scene: { pendingCheck: unknown };
    visible(participant: BattleParticipant): boolean;
}

export type SystemDiceSource = (event: SystemDiceEvent) => SystemDice | null;

/** Lists concatenate across modules in composition order */
export interface SystemFx {
    dice?: readonly SystemDiceSource[];
}

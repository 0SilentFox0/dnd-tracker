import type { QueryKey } from '@tanstack/react-query';

import type {
    BattleAudioCommand,
    BattleAudioSnapshot,
    BattleAudioState,
} from '@/types/audio';

export interface AudioHost {
    campaignId: string;
    isDM: boolean;
    silent?: boolean;
    queryKey: QueryKey;
    seed: BattleAudioState | null | undefined;
    fetch(): Promise<BattleAudioSnapshot>;
    send(cmd: BattleAudioCommand): Promise<BattleAudioSnapshot>;
    onFailure(message: string): void;
}

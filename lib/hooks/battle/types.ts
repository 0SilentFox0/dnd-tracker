import type { battleOps } from '@/lib/api/battle-ops';
import type { DialogState } from '@/lib/hooks/battle/useAwaitingDmDialog';
import type { BattleLogHistory } from '@/lib/hooks/battle/useBattleLogHistory';
import type { BattleToastApi } from '@/lib/hooks/battle/useBattleToast';
import type { PusherConnectionState } from '@/lib/hooks/battle/usePusherBattleSync';
import type { BattleOpMutation } from '@/lib/hooks/battles';
import type { AttackIntent, TurnGateOutcome } from '@/lib/utils/battle/flows';
import type { MapAim, MapPick } from '@/lib/utils/battle/grid';
import type { TileLayerChunks } from '@/lib/utils/battle/tiles/derive';
import type { DisplayEffect } from '@/lib/utils/battle/view';
import type { Viewer } from '@/lib/utils/battle/view/visibility';
import type { BattleScene } from '@/types/api';
import type {
    BattleLogPanel,
    BattleSceneResult,
    BattleSceneRoster,
    BattleSceneTurn,
    DmControl,
} from '@/types/battle-scene';

export interface TurnGateControls {
    /** Aborts when the whole player turn unmounts, not just the gate panel */
    readonly signal?: AbortSignal;
    resolve(outcome: TurnGateOutcome): void;
    skipTurn(): void;
}

export interface BattleSceneIntents {
    attack: AttackIntent | null;
    requestAttack(intent: AttackIntent): void;
    clearAttack(): void;
    spellBook: number | null;
    requestSpellBook(level: number): void;
    clearSpellBook(): void;
    mapAim: MapAim | null;
    setMapAim(aim: MapAim | null): void;
    mapPick: MapPick | null;
    setMapPick(pick: MapPick | null): void;
    attackReady: boolean;
    setAttackReady(heroId: string | null): void;
}

export type BattleSceneActions = {
    [K in keyof typeof battleOps]: BattleOpMutation<K>;
};

export interface BattleSceneData {
    campaignId: string;
    battleId: string;
    battle: BattleScene;
    viewer: Viewer;
    turn: BattleSceneTurn;
    roster: BattleSceneRoster;
    awaiting: 'victory' | 'defeat' | null;
    effects: Map<string, DisplayEffect[]>;
    dmControl: DmControl;
    select(id: string | null): void;
    clickParticipant(id: string): void;
    readBattle(): BattleScene | undefined;
}

export interface BattleSceneDialogs {
    awaitingDm: DialogState;
    resultScreen: DialogState;
}

export interface BattleSceneValue extends BattleSceneData {
    tileChunks?: TileLayerChunks;
    tileVersion?: number;
    dialogs: BattleSceneDialogs;
    connection: PusherConnectionState;
    playerView: { available: boolean; enabled: boolean; toggle(): void };
    selectedId: string | null;
    intents: BattleSceneIntents;
    toast: BattleToastApi;
    result: BattleSceneResult;
    log: BattleLogPanel;
    logHistory: BattleLogHistory;
    actions: BattleSceneActions;
    anyPending: boolean;
}

import type { CellMark, MoveStep, PathSearch } from '@/lib/utils/battle/grid';
import type {
    BattleSceneState,
    NewBattleEvent,
    ScenePatch,
} from '@/lib/utils/battle/store/types';
import type { BattleParticipant } from '@/types/battle';
import type { BattleAction } from '@/types/battle-actions';
import type { BattleMapConfig, GridKind, GridPoint } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export interface ModeView {
    cells: ReadonlySet<string> | null;
    visibleIds: ReadonlySet<string>;
    ownIds: ReadonlySet<string>;
    showDormant: boolean;
    dark: boolean;
    maskedIds?: ReadonlySet<string>;
}

export interface ModeMoveZone {
    steps: Map<string, MoveStep>;
    marks: Map<string, CellMark | number>;
    search?: PathSearch;
}

export interface ModeAwareOutcome {
    participants: BattleParticipant[];
    events?: NewBattleEvent[];
    scene?: ScenePatch;
}

export interface ModeServerHooks<C> {
    onStart?(args: {
        map: BattleMapConfig;
        config: C;
        order: BattleParticipant[];
    }): { participants: BattleParticipant[]; turnIndex: number };
    afterMutation?<T extends ModeAwareOutcome>(args: {
        map: BattleMapConfig;
        config: C;
        scene: { status: BattleSceneState['status']; round: number };
        result: T;
    }): T;
    afterSettle?<T extends ModeAwareOutcome>(args: {
        map: BattleMapConfig;
        config: C;
        scene: { status: BattleSceneState['status']; round: number };
        result: T;
    }): T;
    blockedText?(config: C): string | null;
    autoSkipText?(config: C): LogLine | null;
    placeAll?(args: {
        map: BattleMapConfig;
        config: C;
        participants: BattleParticipant[];
    }): BattleParticipant[];
    placeOne?(args: {
        map: BattleMapConfig;
        config: C;
        participants: BattleParticipant[];
        mover: BattleParticipant;
        to: GridPoint;
    }): BattleParticipant;
    placeRevived?(args: {
        map: BattleMapConfig;
        config: C;
        participants: BattleParticipant[];
        mover: BattleParticipant;
        from: GridPoint;
    }): GridPoint | null;
    onEnter?(args: {
        config: C;
        participant: BattleParticipant;
    }): BattleParticipant;
    onReset?(config: C): C;
    patchableFields?: readonly string[];
}

export interface ModeEngineHooks<C> {
    sees?(args: {
        config: C;
        map: BattleMapConfig;
        viewer: BattleParticipant;
        target: BattleParticipant;
    }): boolean;
    areHostile?(args: {
        config: C;
        map: BattleMapConfig;
        a: BattleParticipant;
        b: BattleParticipant;
    }): boolean | undefined;
    aimHiddenText?(args: {
        config: C;
        map: BattleMapConfig;
        caster: BattleParticipant;
        cell: GridPoint;
    }): LogLine | null;
    targetHiddenText?(args: {
        config: C;
        map: BattleMapConfig;
        caster: BattleParticipant;
        targets: BattleParticipant[];
    }): LogLine | null;
    meleeBlockedText?(args: {
        config: C;
        map: BattleMapConfig;
        attacker: BattleParticipant;
        target: BattleParticipant;
    }): LogLine | null;
    engages?(args: {
        config: C;
        map: BattleMapConfig;
        attacker: BattleParticipant;
        neighbour: BattleParticipant;
    }): boolean;
    walls?(args: { config: C; map: BattleMapConfig }): readonly string[];
    lineBlocked?(args: {
        config: C;
        map: BattleMapConfig;
        line: GridPoint[];
    }): boolean;
    moveZone?(args: {
        config: C;
        map: BattleMapConfig;
        seen: BattleParticipant[];
        mover: BattleParticipant;
        view: ModeView | null;
    }): ModeMoveZone | null;
}

export interface ModeClientHooks<C> {
    deltaOf?(
        before: C | null | undefined,
        after: C | null | undefined
    ): Partial<C> | null | undefined;
    mergeDelta?(cached: C, patch: Partial<C>): C;
    logVisible?(view: ModeView | null | undefined, e: BattleAction): boolean;
    fxVisible?(view: ModeView | null | undefined, e: BattleAction): boolean;
}

export interface MapModeDefinition<C = unknown> {
    key: string;
    grids?: GridKind[];
    configOf(map: BattleMapConfig | null | undefined): C | null;
    withConfig(map: BattleMapConfig, config: C | null): BattleMapConfig;
    emptyConfig?(): C;
    server: ModeServerHooks<C>;
    engine: ModeEngineHooks<C>;
    client: ModeClientHooks<C>;
}

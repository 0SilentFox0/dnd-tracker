import type { PusherMessage } from '@/lib/utils/battle/pipeline/battle-response';
import type { PipelineDeps } from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { applyScenePatch } from '@/lib/utils/battle/scene-state';
import type {
    BattleMeta,
    BattleSceneState,
    LoadedBattle,
    NewBattleEvent,
    StoredBattleEvent,
} from '@/lib/utils/battle/store';
import type { BattleParticipant } from '@/types/battle';

export type MemoryBattle = Omit<LoadedBattle, 'isDM'> & { isDM?: boolean };

export function memoryPipeline(initial: MemoryBattle) {
    let state: LoadedBattle = { isDM: true, ...initial };

    const events: StoredBattleEvent[] = [];

    const published: PusherMessage[] = [];

    const stored = (e: NewBattleEvent, seq: number): StoredBattleEvent => ({
        type: e.type,
        round: e.round,
        actorId: e.actorId ?? null,
        targets: e.targets ?? [],
        details: e.details ?? {},
        hpChanges: e.hpChanges ?? [],
        resultText: e.resultText,
        seq,
    });

    const deps: PipelineDeps = {
        getUserId: async () => 'dm',
        rateLimit: async () => ({ allowed: true }) as never,
        loadBattle: async () => ({ ...state, isMember: true }),
        recheckAccess: async () => ({ isMember: true, isDM: state.isDM }),
        loadRecentEvents: async () => [],
        async saveBattle(before, outcome) {
            const cleared = outcome.history && 'clear' in outcome.history;

            if (cleared) events.length = 0;

            const written = outcome.events.map((e, i) =>
                stored(e, state.scene.eventSeq + i + 1)
            );

            events.push(...written);

            const scene: BattleSceneState = {
                ...applyScenePatch(before.scene, outcome.scene ?? {}),
                version: before.scene.version + 1,
                eventSeq: written.at(-1)?.seq ?? before.scene.eventSeq,
            };

            const patch = outcome.scene;

            const meta: BattleMeta = {
                ...before.meta,
                ...(patch?.map !== undefined && { map: patch.map }),
                ...(patch?.rules && { rules: patch.rules }),
            };

            state = {
                ...state,
                scene,
                meta,
                participants: outcome.participants,
                pending: outcome.pending,
            };

            return {
                battleId: scene.id,
                version: scene.version,
                scene: {
                    status: scene.status,
                    round: scene.round,
                    turnIndex: scene.turnIndex,
                    pendingMoraleCheck: scene.pendingMoraleCheck,
                    pendingChoice: scene.pendingChoice,
                    turnStartedAt: null,
                },
                upserted: outcome.participants,
                fullIds: outcome.participants.map((p) => p.basicInfo.id),
                removed: [],
                events: written,
            };
        },
        publish: (messages) => {
            published.push(...messages);
        },
    };

    return {
        deps,
        events,
        published,
        get state() {
            return state;
        },
        participant: (id: string): BattleParticipant | undefined =>
            state.participants.find((p) => p.basicInfo.id === id),
    };
}

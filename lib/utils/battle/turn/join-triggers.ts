import { runTurnHooks } from './hooks';

import { runAbilities } from '@/lib/utils/abilities/engine/core/run-abilities';
import type { Rng } from '@/lib/utils/abilities/engine/core/types';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type {
    BattleAction,
    BattleMapConfig,
    BattleParticipant,
} from '@/types/battle';
import type { LogLine } from '@/types/text';

export interface JoinTriggersResult {
    participants: BattleParticipant[];
    messages: LogLine[];
    psychology: { lines: LogLine[]; targets: BattleAction['targets'] };
}

interface PsychologyCtx {
    round: number;
    rng: Rng;
    rules: Ruleset;
    map?: BattleMapConfig | null;
}

export function runPsychology(
    participants: BattleParticipant[],
    ctx: PsychologyCtx,
    newcomerIds?: readonly string[]
): {
    participants: BattleParticipant[];
    psychology: JoinTriggersResult['psychology'];
} {
    const hooks = ruleSystemOf(ctx.rules).combat.turn?.onJoin;

    if (!hooks) return { participants, psychology: { lines: [], targets: [] } };

    const tested = runTurnHooks(hooks, {
        participants,
        round: ctx.round,
        rng: ctx.rng,
        rules: ctx.rules,
        map: ctx.map,
        newcomerIds,
    });

    const targets = (tested.testerIds ?? []).flatMap((id) => {
        const p = tested.participants.find((x) => x.basicInfo.id === id);

        return p
            ? [{ participantId: id, participantName: p.basicInfo.name }]
            : [];
    });

    return {
        participants: tested.participants,
        psychology: { lines: tested.messages, targets },
    };
}

export function runJoinTriggers(
    order: BattleParticipant[],
    ctx: {
        round: number;
        rng: Rng;
        map: BattleMapConfig | null | undefined;
        rules: Ruleset;
    },
    newcomerIds?: readonly string[]
): JoinTriggersResult {
    const joined = runAbilities(
        order,
        {
            type: 'battleStart',
            ...(newcomerIds && { newcomerIds: [...newcomerIds] }),
        },
        ctx
    );

    return {
        ...runPsychology(joined.participants, ctx, newcomerIds),
        messages: joined.messages,
    };
}

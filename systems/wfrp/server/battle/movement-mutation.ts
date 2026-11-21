import { z } from 'zod';

import { skillTarget } from '../../rules/characteristics/derive';
import {
    engagedFoes,
    engagementJournal,
} from '../../rules/combat/engagement';
import {
    chargeBand,
    sprintYards,
    yardsToFeet,
} from '../../rules/combat/movement';
import {
    armourPenaltyFor,
    participantChars,
    participantStats,
} from '../../rules/combat/participant';
import {
    movementSlMod,
    selfModes,
    selfSlMod,
    selfTestMod,
} from '../../rules/conditions/test-mod';
import { editionOf } from '../../rules/edition';
import { asBurdenTier } from '../../rules/equipment/burden';
import { resolvePercentileTest } from '../../rules/percentile';
import { resolveModeSources } from '../../rules/percentile/advantage';
import { DIFFICULTY_SL } from '../../rules/percentile/difficulty';
import { wfrpState, withWfrpState } from '../../rules/state';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { textRef } from '@/lib/i18n/text-ref';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import { currentOf, requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
import { cellFeetOf } from '@/lib/utils/battle/grid/cell-feet';
import { cellDistance } from '@/lib/utils/battle/grid/geometry';
import { baseMovement } from '@/lib/utils/battle/grid/path';
import { logFields } from '@/lib/utils/battle/log/lines';
import { applyMainActionUsed } from '@/lib/utils/battle/participant/helpers';
import type {
    BattleMutationContext,
    MutationResult,
} from '@/lib/utils/battle/pipeline/run-battle-mutation';
import { battleActionToEvent, BattleRuleError } from '@/lib/utils/battle/store';
import { REJECT } from '@/lib/utils/battle/store/reject';
import { assertCanAct } from '@/lib/utils/battle/turn';
import { rngOf } from '@/lib/utils/common/rng';
import type { BattleParticipant } from '@/types/battle';

export const movementSchema = z.discriminatedUnion('kind', [
    z
        .object({
            kind: z.literal('run'),
            participantId: z.string().min(1),
            serverRoll: z.boolean().optional(),
        })
        .strict(),
    z
        .object({
            kind: z.literal('sprint'),
            participantId: z.string().min(1),
            roll: z.number().int().min(1).max(100).optional(),
            serverRoll: z.boolean().optional(),
        })
        .strict(),
    z
        .object({
            kind: z.literal('charge'),
            participantId: z.string().min(1),
            targetId: z.string().min(1),
            serverRoll: z.boolean().optional(),
        })
        .strict(),
]);

export type MovementBody = z.infer<typeof movementSchema>;

const reject = (message: string) =>
    new BattleRuleError('action_rejected', message);

const withExtraFeet = (
    p: BattleParticipant,
    feet: number
): BattleParticipant => ({
    ...p,
    battleData: {
        ...p.battleData,
        extraMovement: (p.battleData.extraMovement ?? 0) + feet,
    },
});

export function movementMutation(
    ctx: BattleMutationContext,
    body: MovementBody
): MutationResult {
    const { rules } = ctx.meta;

    const edition = editionOf(rules);

    if (edition.momentumModel !== 'participant')
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.MOMENTUM_UNSUPPORTED
        );

    const actor = requireActor(ctx, body.participantId, {
        missing: API_ERRORS.BATTLE_PARTICIPANT_NOT_IN_BATTLE,
        forbidden: API_ERRORS.FORBIDDEN,
        inactive: { code: 'action_rejected', message: API_ERRORS.ACTION_USED },
    });

    if (currentOf(ctx)?.basicInfo.id !== actor.basicInfo.id)
        throw reject(API_ERRORS.ACTION_USED);

    assertCanAct(ctx, actor.basicInfo.id);

    if (wfrpState(actor).moveMode) throw reject(API_ERRORS.MOVE_MODE_CHOSEN);

    const chars = participantChars(actor);

    const tier = asBurdenTier(participantStats(actor)?.burden);

    const walkFeet = baseMovement(actor, rules);

    const at = { battleId: ctx.scene.id, round: ctx.scene.round };

    const finish = (
        next: BattleParticipant,
        line: ReturnType<typeof textRef>
    ) => ({
        participants: ctx.participants.map((p) =>
            p.basicInfo.id === next.basicInfo.id ? next : p
        ),
        pending: ctx.pending,
        events: [
            battleActionToEvent(
                newBattleAction(
                    actor,
                    'ability',
                    { ...at, targets: [next] },
                    { actionDetails: {}, ...logFields(line) }
                )
            ),
        ],
    });

    if (body.kind === 'run')
        return finish(
            withWfrpState(withExtraFeet(actor, walkFeet), { moveMode: 'run' }),
            textRef('battleWfrp.log.runDeclared', {
                name: actor.basicInfo.name,
            })
        );

    if (body.kind === 'sprint') {
        if (actor.actionFlags.hasUsedAction)
            throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

        if (body.roll === undefined && !body.serverRoll)
            throw reject(REJECT.rollsRequired);

        const skill = skillTarget(chars, 'athletics');

        if (!skill) throw reject(API_ERRORS.MOVE_SKILL_MISSING);

        const mode = resolveModeSources(selfModes(actor, 'test', edition));

        const test = resolvePercentileTest({
            target: skill.target + selfTestMod(actor, 'test', edition),
            slModifier:
                selfSlMod(actor, edition) +
                movementSlMod(actor, edition) +
                armourPenaltyFor(actor, 'athletics') +
                mode.slMod +
                DIFFICULTY_SL.average,
            slModel: edition.slModel,
            mode: mode.mode,
            rng: rngOf(ctx),
            presetRoll: body.serverRoll ? undefined : body.roll,
        });

        const ok = test.outcome === 'success' || test.outcome === 'critical';

        const used = withWfrpState(applyMainActionUsed(actor), {
            moveMode: 'sprint',
        });

        if (!ok)
            return finish(
                used,
                textRef('battleWfrp.log.sprintFailed', {
                    name: actor.basicInfo.name,
                    sl: test.sl,
                })
            );

        const yards = sprintYards(chars, test.sl, tier);

        return finish(
            withExtraFeet(used, yardsToFeet(yards)),
            textRef('battleWfrp.log.sprintResult', {
                name: actor.basicInfo.name,
                sl: test.sl,
                yards,
            })
        );
    }

    const target = ctx.participants.find(
        (p) => p.basicInfo.id === body.targetId
    );

    if (
        !target ||
        !isActive(target) ||
        target.basicInfo.side === actor.basicInfo.side
    )
        throw new BattleRuleError(
            'invalid_target',
            API_ERRORS.ABILITY_TARGET_INVALID
        );

    if (actor.actionFlags.hasUsedAction)
        throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

    if (
        engagedFoes(
            actor,
            ctx.participants,
            ctx.meta.map,
            engagementJournal(rules)
        ).length > 0
    )
        throw reject(API_ERRORS.CHARGE_ENGAGED);

    if ((actor.battleData.movementUsed ?? 0) > 0)
        throw reject(API_ERRORS.CHARGE_AFTER_MOVE);

    const from = actor.battleData.position;

    const to = target.battleData.position;

    if (!from || !to) throw reject(API_ERRORS.CHARGE_TOO_FAR);

    const yards = Math.round(
        (cellDistance(from, to) * cellFeetOf(rules)) / yardsToFeet(1)
    );

    const band = chargeBand(chars, yards, tier);

    if (band === 'far') throw reject(API_ERRORS.CHARGE_TOO_FAR);

    const charging = withWfrpState(withExtraFeet(actor, walkFeet), {
        moveMode: 'charge',
    });

    const name = actor.basicInfo.name;

    return finish(
        charging,
        textRef('battleWfrp.log.chargeDeclared', {
            name,
            target: target.basicInfo.name,
        })
    );
}

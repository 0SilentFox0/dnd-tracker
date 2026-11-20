import { z } from 'zod';

import { skillTarget } from '../../rules/characteristics/derive';
import {
    engagedFoes,
    isOutnumbered,
    isSurrounded,
} from '../../rules/combat/engagement';
import {
    hasMomentum,
    loseMomentum,
    withMomentum,
} from '../../rules/combat/momentum';
import { participantChars } from '../../rules/combat/participant';
import { parryTargetOf } from '../../rules/combat/resolve-attack';
import {
    selfModes,
    selfSlMod,
    selfTestMod,
} from '../../rules/conditions/test-mod';
import { editionOf } from '../../rules/edition';
import { resolvePercentileTest } from '../../rules/percentile';
import { resolveModeSources } from '../../rules/percentile/advantage';

import { API_ERRORS } from '@/lib/constants/api-errors';
import { EffectMarker } from '@/lib/constants/battle';
import { textRef } from '@/lib/i18n/text-ref';
import { isActive } from '@/lib/utils/abilities/engine/core/participants';
import {
    coreTimedKey,
    type LabeledEffectInput,
    upsertLabeled,
} from '@/lib/utils/battle/actions/effects';
import { currentOf, requireActor } from '@/lib/utils/battle/common/control';
import { newBattleAction } from '@/lib/utils/battle/common/new-action';
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

export const disengageSchema = z
    .object({
        participantId: z.string().min(1),
        roll: z.number().int().min(1).max(100).optional(),
        serverRoll: z.boolean().optional(),
    })
    .strict();

export type DisengageBody = z.infer<typeof disengageSchema>;

const reject = (message: string) =>
    new BattleRuleError('action_rejected', message);

const disengagedEffect = (participantId: string): LabeledEffectInput => ({
    timedKey: coreTimedKey('disengage', participantId),
    name: 'Disengage',
    label: textRef('battleCommon.coreActions.disengage'),
    type: 'buff',
    rounds: 1,
    stackable: false,
    effects: [{ type: EffectMarker.DISENGAGED, value: 1 }],
    until: 'turnEnd',
});

export function disengageMutation(
    ctx: BattleMutationContext,
    body: DisengageBody
): MutationResult {
    const edition = editionOf(ctx.meta.rules);

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

    const map = ctx.meta.map;

    const foes = engagedFoes(actor, ctx.participants, map);

    if (foes.length === 0) throw reject(API_ERRORS.DISENGAGE_NOT_ENGAGED);

    if (isSurrounded(foes)) throw reject(API_ERRORS.DISENGAGE_SURROUNDED);

    const id = actor.basicInfo.id;

    const round = ctx.scene.round;

    const at = { battleId: ctx.scene.id, round };

    const replace = (
        participants: typeof ctx.participants,
        next: typeof actor
    ) => participants.map((p) => (p.basicInfo.id === id ? next : p));

    if (hasMomentum(actor)) {
        const free = upsertLabeled(
            loseMomentum(actor),
            disengagedEffect(id),
            round
        );

        return {
            participants: replace(ctx.participants, free),
            pending: ctx.pending,
            events: [
                battleActionToEvent(
                    newBattleAction(
                        actor,
                        'ability',
                        { ...at, targets: [free] },
                        {
                            actionDetails: {},
                            ...logFields(
                                textRef('battleWfrp.log.disengageMomentum', {
                                    name: actor.basicInfo.name,
                                })
                            ),
                        }
                    )
                ),
            ],
        };
    }

    if (actor.actionFlags.hasUsedAction)
        throw new BattleRuleError('action_used', API_ERRORS.ACTION_USED);

    if (body.roll === undefined && !body.serverRoll)
        throw reject(REJECT.rollsRequired);

    const chars = participantChars(actor);

    const targets = [
        skillTarget(chars, 'dodge'),
        skillTarget(chars, 'performance', 'acrobatics'),
    ].filter((s) => s !== null);

    if (targets.length === 0) throw reject(API_ERRORS.DISENGAGE_SKILL_MISSING);

    const base = Math.max(...targets.map((s) => s.target));

    const modes = selfModes(actor, 'test', edition);

    const mode = resolveModeSources({
        ...modes,
        disadvantage:
            (modes.disadvantage ?? 0) +
            (isOutnumbered(actor, foes, ctx.participants, map) ? 1 : 0),
    });

    const rng = rngOf(ctx);

    const own = resolvePercentileTest({
        target: base + selfTestMod(actor, 'test', edition),
        slModifier: selfSlMod(actor, edition) + mode.slMod,
        slModel: edition.slModel,
        mode: mode.mode,
        rng,
        presetRoll: body.serverRoll ? undefined : body.roll,
    });

    const best = foes.reduce((a, b) =>
        parryTargetOf(b, edition) > parryTargetOf(a, edition) ? b : a
    );

    const foe = resolvePercentileTest({
        target:
            parryTargetOf(best, edition) + selfTestMod(best, 'test', edition),
        slModifier: selfSlMod(best, edition),
        slModel: edition.slModel,
        mode: 'normal',
        rng,
    });

    const succeeded = own.outcome === 'success' || own.outcome === 'critical';

    const escaped =
        edition.opposedModel === 'higherSl'
            ? own.sl >= foe.sl
            : succeeded && own.sl > foe.sl;

    const used = applyMainActionUsed(actor);

    const next = escaped
        ? upsertLabeled(used, disengagedEffect(id), round)
        : used;

    const foeIds = new Set(foes.filter(isActive).map((f) => f.basicInfo.id));

    const participants = ctx.participants.map((p) => {
        if (p.basicInfo.id === id) return next;

        return !escaped && foeIds.has(p.basicInfo.id)
            ? withMomentum(p, true)
            : p;
    });

    const line = textRef(
        escaped
            ? 'battleWfrp.log.disengageSuccess'
            : 'battleWfrp.log.disengageFailed',
        { name: actor.basicInfo.name, sl: own.sl, foeSl: foe.sl }
    );

    return {
        participants,
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
    };
}

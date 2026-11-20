import { skillTarget, value } from '../characteristics/derive';
import { MIN_DAMAGE } from '../combat/constants';
import {
    clearDeathTimer,
    isOutOfFight,
    notToday,
    notTodayLine,
    tickDeathTimer,
} from '../combat/critical';
import { inflictWounds } from '../combat/direct-damage';
import { fateSpendsOn } from '../combat/fate';
import { participantChars, participantStats } from '../combat/participant';
import { editionOf } from '../edition';
import { resolvePercentileTest } from '../percentile';
import { withFireWounds } from '../traits/regeneration';
import { applyWfrpConditionTo, reduceWfrpCondition } from './apply';
import { BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL } from './catalog';
import { conditionLevel } from './levels';
import { selfSlMod } from './test-mod';

import { CombatStatus } from '@/lib/constants/battle';
import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import {
    findParticipant,
    isActive,
    replaceParticipant,
} from '@/lib/utils/abilities/engine/core/participants';
import { rollDie } from '@/lib/utils/common/dice';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules';
import type {
    ApplyDamageConsequences,
    SystemConditionResult,
} from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

const POISON_WOUNDS = 1;

const BLEED_OUT_ROLL = 10;

function endurancePasses(
    p: BattleParticipant,
    ctx: { rng: Rng; rules: Ruleset }
): boolean {
    const edition = editionOf(ctx.rules);

    const c = participantChars(p);

    const t = resolvePercentileTest({
        target: skillTarget(c, 'endurance')?.target ?? value(c, 't'),
        slModifier: selfSlMod(p, edition),
        slModel: edition.slModel,
        rng: ctx.rng,
    });

    return t.outcome === 'success' || t.outcome === 'critical';
}

export function wfrpConditionsTurnStart(
    ps: BattleParticipant[],
    id: string,
    ctx: {
        round: number;
        rng: Rng;
        rules: Ruleset;
        applyDamage: ApplyDamageConsequences;
    }
): SystemConditionResult & { downed: boolean } {
    const start = findParticipant(ps, id);

    if (!start || !isActive(start))
        return { participants: ps, messages: [], downed: false };

    const revived = clearDeathTimer(start);

    if (revived !== start) ps = replaceParticipant(ps, revived);

    let participants = ps;

    const messages: LogLine[] = [];

    const hurt = (amount: number, key: 'bleeding' | 'ablaze' | 'poisoned') => {
        const r = inflictWounds(participants, id, amount, ctx);

        if (r.name === undefined) return;

        participants = r.participants;

        messages.push(
            textRef(`battleWfrp.log.tick.${key}`, {
                name: r.name,
                damage: amount,
            }),
            ...r.messages
        );
    };

    const edition = editionOf(ctx.rules);

    const canon = edition.conditionModel === 'sl';

    const bleeding = conditionLevel(start, 'bleeding');

    if (bleeding > 0) {
        hurt(bleeding, 'bleeding');

        const now = findParticipant(participants, id)!;

        if (
            isActive(now) &&
            (canon
                ? now.combatStats.currentHp <= 0 && !endurancePasses(now, ctx)
                : ctx.rng() < BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL * bleeding)
        ) {
            const faint = applyWfrpConditionTo(now, {
                key: 'unconscious',
                levels: 1,
                round: ctx.round,
                sourceName: dynamicTextRef(
                    'battleWfrp.conditions.bleeding.label'
                ),
                edition,
            });

            participants = replaceParticipant(participants, faint.participant);

            messages.push(
                textRef('battleWfrp.log.tick.faint', {
                    name: now.basicInfo.name,
                })
            );
        }
    }

    const poisoned = conditionLevel(
        findParticipant(participants, id)!,
        'poisoned'
    );

    if (canon && poisoned > 0) hurt(POISON_WOUNDS, 'poisoned');

    const ablaze = conditionLevel(findParticipant(participants, id)!, 'ablaze');

    if (ablaze > 0) {
        const wfrp = participantStats(findParticipant(participants, id)!);

        const armour = canon
            ? Math.min(...Object.values(wfrp?.ap ?? { body: 0 }))
            : (wfrp?.ap.body ?? 0);

        const burn = Math.max(
            canon ? 0 : MIN_DAMAGE,
            rollDie(10, ctx.rng) + ablaze - 1 - (wfrp?.tb ?? 0) - armour
        );

        hurt(burn, 'ablaze');

        if (edition.traitModel === 'canon')
            participants = replaceParticipant(
                participants,
                withFireWounds(findParticipant(participants, id)!, burn)
            );
    }

    const after = findParticipant(participants, id);

    return { participants, messages, downed: !!after && !isActive(after) };
}

export function wfrpSkippedTurn(
    ps: BattleParticipant[],
    id: string,
    ctx: { round: number; rng: Rng; rules?: Ruleset }
): SystemConditionResult {
    const p = findParticipant(ps, id);

    if (
        !p ||
        p.combatStats.status !== CombatStatus.UNCONSCIOUS ||
        isOutOfFight(p)
    )
        return { participants: ps, messages: [] };

    const timer = tickDeathTimer(p);

    if (timer) {
        const saved = notTodayLine(p, timer.participant);

        return {
            participants: replaceParticipant(ps, timer.participant),
            messages: [
                saved ??
                    textRef(
                        timer.died
                            ? 'battleWfrp.log.diedOfWounds'
                            : 'battleWfrp.log.dying',
                        { name: p.basicInfo.name, rounds: timer.left }
                    ),
            ],
        };
    }

    const bleeding = conditionLevel(p, 'bleeding');

    if (bleeding === 0 || p.combatStats.currentHp > 0 || isOutOfFight(p))
        return { participants: ps, messages: [] };

    if (editionOf(ctx.rules).conditionModel === 'sl') {
        const roll = rollDie(10, ctx.rng);

        if (roll >= BLEED_OUT_ROLL && bleeding < BLEED_OUT_ROLL) {
            const { participant } = reduceWfrpCondition(p, 'bleeding', 1);

            return {
                participants: replaceParticipant(ps, participant),
                messages: [
                    textRef('battleWfrp.log.tick.bleedStops', {
                        name: p.basicInfo.name,
                    }),
                ],
            };
        }

        if (roll > bleeding) return { participants: ps, messages: [] };
    } else if (ctx.rng() >= BLEEDING_UNCONSCIOUS_CHANCE_PER_LEVEL * bleeding)
        return { participants: ps, messages: [] };

    const saved = fateSpendsOn(ctx.rules) ? notToday(p) : null;

    if (saved)
        return {
            participants: replaceParticipant(ps, saved),
            messages: [notTodayLine(p, saved)!],
        };

    const dead: BattleParticipant = {
        ...p,
        combatStats: {
            ...p.combatStats,
            currentHp: 0,
            status: CombatStatus.DEAD,
        },
    };

    return {
        participants: replaceParticipant(ps, dead),
        messages: [
            textRef('battleWfrp.log.tick.bleedOut', { name: p.basicInfo.name }),
        ],
    };
}

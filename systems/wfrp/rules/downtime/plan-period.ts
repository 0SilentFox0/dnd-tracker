import { bonus, skillTarget } from '../characteristics/derive';
import type { CareerState, Characteristics } from '../characteristics/keys';
import { editionOf } from '../edition/read';
import { tickAilments } from './ailments';
import {
    burdenOfPower,
    effectiveStatus,
    hardlyWorkingCoins,
    type PeriodCareer,
    regainStanding,
    statusText,
} from './career-duty';
import { CANON_ENDEAVOURS_MAX, REST_HEAL_MULTIPLIER } from './constants';
import type { EndeavourOutcome } from './endeavours';
import { resolveEndeavour, validateEndeavour } from './endeavours';
import { rollEvent } from './event';
import { healFumbleWounds, healWounds, rollDailyRecovery } from './heal';
import type {
    Ailment,
    CoinAmount,
    DowntimeState,
    Endeavour,
    EndeavourSummary,
    PeriodSnapshot,
    PeriodSummary,
} from './types';

import { currentHp, withHp } from '@/lib/utils/characters/resources/hp';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { CharacterResources } from '@/types/characters';

export type PeriodHero = {
    id: string;
    resources: CharacterResources;
    characteristics: Characteristics;
    maxHp: number;
    status?: string | null;
    career?: PeriodCareer;
};

export type PeriodPresets = {
    endeavour?: number;
    ailments?: number[];
    event?: number;
};

export type PeriodInput = {
    heroes: PeriodHero[];
    days: number;
    rules: Pick<Ruleset, 'tables'>;
    rng: Rng;
    periodId: string;
    now: string;
    presets?: Record<string, PeriodPresets>;
};

export type PlannedHero = {
    id: string;
    resources: CharacterResources;
    characteristics: Characteristics & { downtime: DowntimeState };
    coins?: CoinAmount;
    summary: PeriodSummary;
};

type Outcome = {
    summary?: EndeavourSummary;
    result: EndeavourOutcome;
};

function endeavoursOf(h: PeriodHero, canon: boolean): Endeavour[] {
    const d = h.characteristics.downtime;

    if (!canon) return d?.endeavour ? [d.endeavour] : [];

    return (d?.endeavours ?? (d?.endeavour ? [d.endeavour] : [])).slice(
        0,
        CANON_ENDEAVOURS_MAX
    );
}

function sumCoins(outcomes: Outcome[]): CoinAmount | undefined {
    const coins = outcomes.flatMap((o) => o.summary?.coins ?? []);

    return coins.length
        ? {
              coin: coins[0].coin,
              amount: coins.reduce((n, c) => n + c.amount, 0),
          }
        : undefined;
}

function runEndeavour(
    e: Endeavour,
    h: PeriodHero,
    input: PeriodInput,
    patientPresent: (id: string) => boolean,
    slot: number
): Outcome {
    if (e.kind === 'tend' && !patientPresent(e.params.patientId))
        return {
            summary: {
                kind: 'tend',
                patientId: e.params.patientId,
                skipped: 'patientAbsent',
            },
            result: {},
        };

    const edition = editionOf(input.rules);

    const canonIncome = edition.downtimeModel === 'canon5e';

    const earningSkill = canonIncome ? h.career?.earningSkill : undefined;

    if (validateEndeavour(e, h.characteristics, earningSkill))
        return { summary: { kind: e.kind }, result: {} };

    const result = resolveEndeavour(e, {
        characteristics: h.characteristics,
        status:
            canonIncome && h.career
                ? statusText(
                      effectiveStatus(h.status, h.career.state.standingLoss)
                  )
                : h.status,
        earningSkill,
        rng: input.rng,
        // a DM preset roll applies to the first endeavour slot only
        presetRoll: slot === 0 ? input.presets?.[h.id]?.endeavour : undefined,
        edition,
    });

    return {
        summary: {
            kind: e.kind,
            ...(result.test ? { test: result.test } : {}),
            ...(result.coins ? { coins: result.coins } : {}),
            ...(result.training ? { discount: result.training.discount } : {}),
            ...(e.kind === 'tend' ? { patientId: e.params.patientId } : {}),
            ...(result.tendFumble
                ? { fumbleWounds: result.tendFumble.wounds }
                : {}),
        },
        result,
    };
}

const markOf = ({ careerId, tier, ticks, standingLoss }: CareerState) => ({
    careerId,
    tier,
    ticks,
    ...(standingLoss ? { standingLoss } : {}),
});

type Duty = {
    career?: CareerState;
    coins?: CoinAmount;
    hardlyWorking?: boolean;
    burden?: PeriodSummary['burden'];
};

/** Income regains Standing; skipping it is Hardly Working, plus Burdens of Power at the top level (p196, p199) */
function careerDuty(
    h: PeriodHero,
    earned: number,
    input: PeriodInput,
    slModel: ReturnType<typeof editionOf>['slModel']
): Duty {
    if (!h.career && !h.status) return {};

    if (earned > 0 && h.career) {
        let state = h.career.state;

        for (let i = 0; i < earned; i++) state = regainStanding(state);

        return state === h.career.state ? {} : { career: state };
    }

    if (earned > 0) return {};

    const status = effectiveStatus(h.status, h.career?.state.standingLoss);

    const duty: Duty = {
        coins: hardlyWorkingCoins(status),
        hardlyWorking: true,
    };

    if (!h.career || h.career.state.tier !== 4) return duty;

    const burden = burdenOfPower(
        h.career,
        h.characteristics,
        input.rng,
        slModel
    );

    return { ...duty, career: burden.state, burden: burden.result };
}

function reduceNearest(ailments: Ailment[], days: number): Ailment[] {
    if (days <= 0 || ailments.length === 0) return ailments;

    const nearest = ailments.reduce((best, a) =>
        a.daysLeft < best.daysLeft ? a : best
    );

    return ailments.map((a) =>
        a === nearest ? { ...a, daysLeft: a.daysLeft - days } : a
    );
}

export function planPeriod(input: PeriodInput): PlannedHero[] {
    const { heroes, days } = input;

    const byId = new Map(heroes.map((h) => [h.id, h]));

    const patientPresent = (id: string) => {
        const p = byId.get(id);

        return !!p && !p.resources.dead;
    };

    const edition = editionOf(input.rules);

    const canon = edition.downtimeModel === 'canon5e';

    const outcomes = new Map<string, Outcome[]>();

    const tendBonus = new Map<string, { heal: number; days: number }>();

    const tendFumbles = new Map<string, number>();

    for (const h of heroes) {
        if (h.resources.dead || currentHp(h.resources, h.maxHp) === 0) continue;

        const list = endeavoursOf(h, canon).map((e, slot) =>
            runEndeavour(e, h, input, patientPresent, slot)
        );

        if (!list.length) continue;

        outcomes.set(h.id, list);

        for (const { result } of list) {
            const fumble = result.tendFumble;

            if (fumble)
                tendFumbles.set(
                    fumble.patientId,
                    (tendFumbles.get(fumble.patientId) ?? 0) + fumble.wounds
                );

            const tend = result.tend;

            if (!tend) continue;

            const prev = tendBonus.get(tend.patientId);

            if (canon && prev) continue;

            tendBonus.set(tend.patientId, {
                heal: (prev?.heal ?? 0) + tend.heal,
                days: (prev?.days ?? 0) + tend.days,
            });
        }
    }

    return heroes.map((h) => {
        const prev: DowntimeState = h.characteristics.downtime ?? {
            ailments: [],
        };

        const incapacitated = currentHp(h.resources, h.maxHp) === 0;

        const duty: Duty =
            canon && !h.resources.dead && !incapacitated
                ? careerDuty(
                      h,
                      (outcomes.get(h.id) ?? []).filter(
                          (o) => o.summary?.kind === 'earn' && o.summary.test
                      ).length,
                      input,
                      edition.slModel
                  )
                : {};

        const before = {
            ...(h.resources.hp !== undefined ? { hp: h.resources.hp } : {}),
            ailments: prev.ailments,
            ...(prev.training ? { training: prev.training } : {}),
            ...(duty.career && h.career
                ? { career: markOf(h.career.state) }
                : {}),
        };

        const finish = (
            resources: CharacterResources,
            ailments: Ailment[],
            summary: PeriodSummary
        ): PlannedHero => {
            const training =
                outcomes
                    .get(h.id)
                    ?.map((o) => o.result.training)
                    .findLast(Boolean) ?? prev.training;

            const coins = canon
                ? (sumCoins(outcomes.get(h.id) ?? []) ?? duty.coins)
                : summary.endeavour?.coins;

            const snapshot: PeriodSnapshot = {
                id: input.periodId,
                at: input.now,
                days,
                before,
                after: {
                    ...(resources.hp !== undefined ? { hp: resources.hp } : {}),
                    ailmentIds: ailments.map((a) => a.id),
                    ...(training ? { training } : {}),
                    ...(duty.career
                        ? {
                              career: {
                                  careerId: duty.career.careerId,
                                  tier: duty.career.tier,
                                  ...(duty.career.standingLoss
                                      ? {
                                            standingLoss:
                                                duty.career.standingLoss,
                                        }
                                      : {}),
                              },
                          }
                        : {}),
                },
                ...(coins ? { coins } : {}),
                summary,
            };

            const downtime: DowntimeState = {
                ...prev,
                ailments,
                ...(training ? { training } : {}),
                lastPeriod: snapshot,
            };

            return {
                id: h.id,
                resources,
                characteristics: {
                    ...h.characteristics,
                    downtime,
                    ...(duty.career ? { career: duty.career } : {}),
                },
                ...(coins ? { coins } : {}),
                summary,
            };
        };

        if (h.resources.dead)
            return finish(h.resources, prev.ailments, {
                skipped: 'dead',
                healed: 0,
                ailments: [],
            });

        const presets = input.presets?.[h.id];

        const outcome = outcomes.get(h.id);

        const first = outcome?.[0];

        const tend = tendBonus.get(h.id);

        const current = currentHp(h.resources, h.maxHp);

        const rest =
            h.characteristics.downtime?.endeavour?.kind === 'rest' &&
            !incapacitated;

        const restful = endeavoursOf(h, canon).some((e) => e.kind === 'rest');

        const healed = canon
            ? h.maxHp
            : healWounds({
                  current,
                  max: h.maxHp,
                  tb: bonus(h.characteristics, 't'),
                  days,
                  multiplier: rest ? REST_HEAL_MULTIPLIER : 1,
                  bonus: tend?.heal ?? 0,
              });

        const endurance =
            skillTarget(h.characteristics, 'endurance')?.target ?? 0;

        const ticked = tickAilments(
            reduceNearest(prev.ailments, tend?.days ?? 0),
            days,
            {
                endurance,
                rng: input.rng,
                presetRolls: presets?.ailments,
                slModel: edition.slModel,
            }
        );

        const event = rollEvent(input.rules, input.rng, presets?.event);

        const lossHp = Math.max(
            0,
            healed - ticked.wounds - (event.wounds ?? 0)
        );

        const fumbled = tendFumbles.get(h.id) ?? 0;

        const afterFumble = fumbled
            ? lossHp - healFumbleWounds(fumbled, lossHp)
            : lossHp;

        let hp = afterFumble;

        if (canon && hp < h.maxHp)
            for (let day = 0; day < days; day++)
                hp = Math.min(
                    h.maxHp,
                    hp +
                        rollDailyRecovery({
                            endurance,
                            tb: bonus(h.characteristics, 't'),
                            rested: restful,
                            rng: input.rng,
                        }).healed
                );

        const summary: PeriodSummary = {
            ...(incapacitated ? { skipped: 'incapacitated' as const } : {}),
            healed: healed - current,
            ...(hp > afterFumble ? { recovered: hp - afterFumble } : {}),
            ...(duty.hardlyWorking ? { hardlyWorking: true } : {}),
            ...(duty.burden ? { burden: duty.burden } : {}),
            ...(first?.summary ? { endeavour: first.summary } : {}),
            ...(canon && outcome
                ? {
                      endeavours: outcome.flatMap((o) => o.summary ?? []),
                  }
                : {}),
            ailments: ticked.report,
            event,
        };

        return finish(
            withHp(h.resources, hp, h.maxHp),
            ticked.ailments,
            summary
        );
    });
}

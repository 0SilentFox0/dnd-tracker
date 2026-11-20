import { applyWfrpCondition } from '../conditions/apply';
import { conditionLevel } from '../conditions/levels';
import { editionOf } from '../edition';
import { wfrpState, withWfrpState } from '../state';
import type { PassionKind } from '../trait-kinds';
import { isFrenzied } from './frenzy';
import { selfTest, willTarget } from './psych-test';
import { psychologyOf, traitEffects } from './read';

import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { findFlags } from '@/lib/utils/abilities/engine/core/collect-modifiers';
import {
    inPlay,
    resolvedAbilitiesOf,
} from '@/lib/utils/abilities/engine/core/participants';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { SystemConditionResult } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

export const HATRED_SL_BONUS = 1;

interface Passion {
    passion: PassionKind;
    group?: string;
}

export const passionsOf = (p: BattleParticipant): Passion[] =>
    traitEffects(resolvedAbilitiesOf(p)).flatMap((e) =>
        e.kind === 'wfrpPassion'
            ? [{ passion: e.passion, ...(e.group && { group: e.group }) }]
            : []
    );

const canonical = (word: string): string =>
    word
        .replace(/ves$/, 'f')
        .replace(/ies$/, 'y')
        .replace(/(ch|sh|x|z)es$/, '$1')
        .replace(/([^s])s$/, '$1');

const wordsOf = (s: string): string[] =>
    s
        .toLowerCase()
        .split(/[^\p{L}\p{N}]+/u)
        .filter(Boolean)
        .map(canonical);

const norm = (s: string) => wordsOf(s).join(' ');

/** A group names a race or creature type, singular or plural, matched by whole words (never the display name) */
export function inGroup(p: BattleParticipant, group: string): boolean {
    const g = wordsOf(group);

    return (
        g.length > 0 &&
        [p.abilities.race, p.abilities.creatureType].some((x) => {
            const w = x ? wordsOf(x) : [];

            return w.some((_, i) => g.every((gw, j) => w[i + j] === gw));
        })
    );
}

const groupsOf = (p: BattleParticipant, kind: PassionKind): string[] =>
    passionsOf(p).flatMap((x) =>
        x.passion === kind && x.group ? [x.group] : []
    );

/** Hatred: +1 SL on melee and ranged tests against the group (p184) */
export const hatesTarget = (
    attacker: BattleParticipant,
    target: BattleParticipant
): boolean => groupsOf(attacker, 'hatred').some((g) => inGroup(target, g));

export const isPsychImmune = (ps: BattleParticipant[], id: string): boolean =>
    findFlags(ps, id, 'conditionImmunity').some(
        (f) =>
            f.conditions === 'all' ||
            (f.conditions as string[]).includes('fear')
    );

const extendedOf = (rules?: Ruleset) =>
    editionOf(rules).psychologyModel === 'extended';

function frenzyEnds(
    ps: BattleParticipant[],
    p: BattleParticipant,
    ctx: { map?: BattleMapConfig | null }
): boolean {
    return (
        !inPlay(p) ||
        conditionLevel(p, 'stunned') > 0 ||
        !ps.some((o) => inPlay(o) && isHostile(ctx.map, p, o))
    );
}

/** Frenzy over (nobody left to fight, Stunned, down): the fighter becomes Fatigued (p184) */
function endFrenzy(
    ps: BattleParticipant[],
    id: string,
    ctx: { round: number; rules?: Ruleset }
): SystemConditionResult {
    const cleared = ps.map((p) =>
        p.basicInfo.id === id ? withWfrpState(p, { frenzy: undefined }) : p
    );

    const name = cleared.find((p) => p.basicInfo.id === id)?.basicInfo.name;

    const tired = applyWfrpCondition(cleared, id, {
        key: 'fatigued',
        levels: 1,
        round: ctx.round,
        sourceName: name ?? '',
        rules: ctx.rules,
    });

    return {
        participants: tired.participants,
        messages: [
            textRef('battleWfrp.log.frenzyEnd', { name: name ?? '' }),
            ...tired.messages,
        ],
    };
}

/** Round start: Frenzies whose reason is gone end for everyone */
export function wfrpFrenzyRoundStart(
    ps: BattleParticipant[],
    ctx: { round: number; rules?: Ruleset; map?: BattleMapConfig | null }
): SystemConditionResult {
    if (!extendedOf(ctx.rules)) return { participants: ps, messages: [] };

    let participants = ps;

    const messages: LogLine[] = [];

    for (const p of ps)
        if (wfrpState(p).frenzy && frenzyEnds(ps, p, ctx)) {
            const r = endFrenzy(participants, p.basicInfo.id, ctx);

            participants = r.participants;
            messages.push(...r.messages);
        }

    return { participants, messages };
}

/** Own turn start: an ended Frenzy is paid for, a Frenzy-trait holder tries to enter one with a Willpower test (p184) */
export function wfrpFrenzyTurnStart(
    ps: BattleParticipant[],
    id: string,
    ctx: {
        round: number;
        rng: Rng;
        rules?: Ruleset;
        map?: BattleMapConfig | null;
    }
): SystemConditionResult {
    const none = { participants: ps, messages: [] as LogLine[] };

    const me = ps.find((p) => p.basicInfo.id === id);

    if (!me || !extendedOf(ctx.rules)) return none;

    if (wfrpState(me).frenzy) {
        if (!frenzyEnds(ps, me, ctx)) return none;

        return endFrenzy(ps, id, ctx);
    }

    if (
        !inPlay(me) ||
        !passionsOf(me).some((x) => x.passion === 'frenzy') ||
        conditionLevel(me, 'stunned') > 0 ||
        !ps.some((o) => inPlay(o) && isHostile(ctx.map, me, o))
    )
        return none;

    const edition = editionOf(ctx.rules);

    const { t, target, passed } = selfTest(
        me,
        edition,
        ctx.rng,
        willTarget(me)
    );

    if (!passed) return none;

    return {
        participants: ps.map((p) =>
            p === me ? withWfrpState(p, { frenzy: true, fear: undefined }) : p
        ),
        messages: [
            textRef('battleWfrp.log.frenzyStart', {
                name: me.basicInfo.name,
                roll: t.roll,
                target,
            }),
        ],
    };
}

/** Meeting a hated or disliked group: one Psychology test per group and encounter (p183-184) */
export function wfrpPassionsJoin(
    ps: BattleParticipant[],
    ctx: {
        round: number;
        rng: Rng;
        rules?: Ruleset;
        map?: BattleMapConfig | null;
        newcomerIds?: readonly string[];
    }
): SystemConditionResult & { testerIds: string[] } {
    const result = { participants: ps, messages: [] as LogLine[] };

    const testerIds: string[] = [];

    if (!extendedOf(ctx.rules)) return { ...result, testerIds };

    const edition = editionOf(ctx.rules);

    const fresh = ctx.newcomerIds ? new Set(ctx.newcomerIds) : null;

    let participants = ps;

    for (const tester of ps) {
        const id = tester.basicInfo.id;

        if (!inPlay(tester) || isFrenzied(tester) || isPsychImmune(ps, id))
            continue;

        for (const { passion, group } of passionsOf(tester)) {
            if (!group || passion === 'frenzy') continue;

            const key = `${passion}:${norm(group)}`;

            const current = participants.find((p) => p.basicInfo.id === id)!;

            if (wfrpState(current).psychologyTested?.[key]) continue;

            const isNew = !fresh || fresh.has(id);

            const source = ps.find(
                (o) =>
                    o !== tester &&
                    inPlay(o) &&
                    isHostile(ctx.map, tester, o) &&
                    inGroup(o, group) &&
                    (isNew || !!fresh?.has(o.basicInfo.id)) &&
                    !(passion === 'animosity' && psychologyOf(o).length > 0)
            );

            if (!source) continue;

            const { t, target, passed } = selfTest(current, edition, ctx.rng);

            testerIds.push(id);
            result.messages.push(
                textRef(
                    passed
                        ? 'battleWfrp.log.passionPass'
                        : 'battleWfrp.log.passionFail',
                    {
                        name: tester.basicInfo.name,
                        passion: dynamicTextRef(
                            `battleWfrp.passion.${passion}`
                        ),
                        group,
                        source: source.basicInfo.name,
                        roll: t.roll,
                        target,
                        sl: t.sl,
                    }
                )
            );

            participants = participants.map((p) =>
                p.basicInfo.id === id
                    ? withWfrpState(p, {
                          psychologyTested: {
                              ...wfrpState(p).psychologyTested,
                              [key]: 1,
                          },
                          ...(!passed &&
                              passion === 'hatred' && {
                                  compelled: {
                                      ...wfrpState(p).compelled,
                                      [key]: { group, round: ctx.round },
                                  },
                              }),
                      })
                    : p
            );
        }
    }

    return { ...result, participants, testerIds };
}

/** Hated group members still on the field */
export const compelTargets = (
    ps: BattleParticipant[],
    actor: BattleParticipant,
    group: string,
    map?: BattleMapConfig | null
): BattleParticipant[] =>
    ps.filter(
        (o) =>
            o !== actor &&
            inPlay(o) &&
            isHostile(map, actor, o) &&
            inGroup(o, group)
    );

/** Round start: a fighter still in the grip of Hatred may restrain itself with a new test at the end of each round after the first, i.e. from the start of the round after next (p184) */
export function wfrpPassionsRoundStart(
    ps: BattleParticipant[],
    ctx: {
        round: number;
        rng: Rng;
        rules?: Ruleset;
        map?: BattleMapConfig | null;
    }
): SystemConditionResult {
    const messages: LogLine[] = [];

    if (!extendedOf(ctx.rules)) return { participants: ps, messages };

    const edition = editionOf(ctx.rules);

    let participants = ps;

    for (const p of ps) {
        const entries = Object.entries(wfrpState(p).compelled ?? {});

        if (entries.length === 0) continue;

        const id = p.basicInfo.id;

        const kept = { ...wfrpState(p).compelled };

        for (const [key, entry] of entries) {
            if (compelTargets(ps, p, entry.group, ctx.map).length === 0) {
                delete kept[key];
                continue;
            }

            if (ctx.round < entry.round + 2) continue;

            const current = participants.find((o) => o.basicInfo.id === id)!;

            const {
                t,
                target,
                passed: calmed,
            } = selfTest(current, edition, ctx.rng);

            if (calmed) delete kept[key];

            messages.push(
                textRef(
                    calmed
                        ? 'battleWfrp.log.passionCalm'
                        : 'battleWfrp.log.passionRage',
                    {
                        name: p.basicInfo.name,
                        passion: dynamicTextRef('battleWfrp.passion.hatred'),
                        group: entry.group,
                        roll: t.roll,
                        target,
                        sl: t.sl,
                    }
                )
            );
        }

        participants = participants.map((o) =>
            o.basicInfo.id === id
                ? withWfrpState(o, {
                      compelled: Object.keys(kept).length ? kept : undefined,
                  })
                : o
        );
    }

    return { participants, messages };
}

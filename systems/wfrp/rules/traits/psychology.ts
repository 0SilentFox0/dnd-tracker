import { applyWfrpCondition } from '../conditions/apply';
import { selfSlMod, selfTestMod } from '../conditions/test-mod';
import { EDITION_PROFILES, editionOf, type EditionProfile } from '../edition';
import { resolvePercentileTest } from '../percentile';
import type { FearEntry } from '../slots';
import { wfrpState, withWfrpState } from '../state';
import { PSYCHOLOGY_PASS_SL } from './constants';
import { isFrenzied } from './frenzy';
import { hatesTarget, isPsychImmune } from './passions';
import { coolTarget, isSuccess, selfTest } from './psych-test';
import { psychologyOf } from './read';

import { dynamicTextRef, textRef } from '@/lib/i18n/text-ref';
import { inPlay } from '@/lib/utils/abilities/engine/core/participants';
import { isHostile } from '@/lib/utils/battle/modes/engine';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { SystemConditionResult } from '@/lib/utils/rules/systems/types';
import type { PsychologyKind } from '@/systems/wfrp/rules/trait-kinds';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

interface Threat {
    kind: PsychologyKind;
    value: number;
    source: BattleParticipant;
}

function threatOf(source: BattleParticipant): Threat | null {
    const all = psychologyOf(source);

    const kind: PsychologyKind | null = all.some((x) => x.kind === 'terror')
        ? 'terror'
        : all.length > 0
          ? 'fear'
          : null;

    return kind
        ? {
              kind,
              value: Math.max(
                  ...all.filter((x) => x.kind === kind).map((x) => x.value)
              ),
              source,
          }
        : null;
}

const stronger = (a: Threat, b: Threat | null) =>
    !b ||
    (a.kind === 'terror'
        ? b.kind !== 'terror' || a.value > b.value
        : b.kind !== 'terror' && a.value > b.value);

export function wfrpPsychology(
    ps: BattleParticipant[],
    ctx: {
        round: number;
        rng: Rng;
        rules?: Ruleset;
        map?: BattleMapConfig | null;
        newcomerIds?: readonly string[];
    }
): SystemConditionResult & { testerIds: string[] } {
    const edition = editionOf(ctx.rules);

    const extended = edition.psychologyModel === 'extended';

    const fresh = ctx.newcomerIds ? new Set(ctx.newcomerIds) : null;

    const threats = ps.filter(inPlay).flatMap((p) => threatOf(p) ?? []);

    let participants = ps;

    const messages: LogLine[] = [];

    const testerIds: string[] = [];

    for (const tester of ps) {
        if (
            !inPlay(tester) ||
            psychologyOf(tester).length > 0 ||
            isFrenzied(tester) ||
            isPsychImmune(ps, tester.basicInfo.id, ctx.rules)
        )
            continue;

        const isNew = !fresh || fresh.has(tester.basicInfo.id);

        const eligible = threats.filter(
            (t) =>
                isHostile(ctx.map, t.source, tester) &&
                !(
                    extended &&
                    t.kind === 'fear' &&
                    hatesTarget(tester, t.source)
                ) &&
                (isNew || !!fresh?.has(t.source.basicInfo.id))
        );

        const top = eligible.reduce<Threat | null>(
            (best, t) => (stronger(t, best) ? t : best),
            null
        );

        const done = wfrpState(tester).psychologyTested ?? {};

        if (!top) continue;

        const pending = extended
            ? eligible.filter(
                  (t) =>
                      !hatesTarget(tester, t.source) &&
                      !done[`fear:${t.source.basicInfo.id}`]
              )
            : [];

        const rollTerror =
            top.kind === 'terror' && top.value > (done.terror ?? 0);

        if (
            extended
                ? !rollTerror && pending.length === 0
                : top.value <= (done[top.kind] ?? 0)
        )
            continue;

        testerIds.push(tester.basicInfo.id);

        const base = coolTarget(tester);

        const run = (
            kind: PsychologyKind
        ): { passed: boolean; sl: number; roll: number } => {
            const current = participants.find(
                (p) => p.basicInfo.id === tester.basicInfo.id
            );

            const model = extended ? edition : EDITION_PROFILES.legacy;

            const target = base + selfTestMod(current, 'test', model);

            const t = resolvePercentileTest({
                target,
                rng: ctx.rng,
                ...(extended && {
                    slModel: model.slModel,
                    slModifier: selfSlMod(current, model),
                }),
            });

            const succeeded = isSuccess(t.outcome);

            const passed = extended
                ? succeeded
                : succeeded && t.sl >= PSYCHOLOGY_PASS_SL(top.value);

            messages.push(
                textRef(
                    passed
                        ? 'battleWfrp.log.psychologyPass'
                        : 'battleWfrp.log.psychologyFail',
                    {
                        name: tester.basicInfo.name,
                        source: top.source.basicInfo.name,
                        kind: dynamicTextRef(`battleWfrp.psychology.${kind}`),
                        value: top.value,
                        roll: t.roll,
                        target,
                        sl: t.sl,
                    }
                )
            );

            return { passed, sl: t.sl, roll: t.roll };
        };

        const breakBy = (levels: number) => {
            const r = applyWfrpCondition(participants, tester.basicInfo.id, {
                key: 'broken',
                levels,
                round: ctx.round,
                sourceName: top.source.basicInfo.name,
                rules: ctx.rules,
            });

            participants = r.participants;
            messages.push(...r.messages);
        };

        if (extended) {
            if (rollTerror) {
                const terror = run('terror');

                if (!terror.passed)
                    breakBy(top.value + Math.max(0, -terror.sl - 1));
            }

            participants = fearRound(
                participants,
                tester.basicInfo.id,
                { round: ctx.round, rng: ctx.rng, edition, messages },
                pending.map((t) => ({
                    id: t.source.basicInfo.id,
                    rating: t.value,
                }))
            );
        } else if (top.kind === 'terror') {
            const terror = run('terror');

            if (!terror.passed) breakBy(1 + Math.max(0, -terror.sl));

            if (!run('fear').passed) breakBy(1);
        } else if (!run('fear').passed) breakBy(1);

        const tested = {
            ...done,
            [top.kind]: Math.max(done[top.kind] ?? 0, top.value),
            ...(top.kind === 'terror' && {
                fear: Math.max(done.fear ?? 0, top.value),
            }),
            ...Object.fromEntries(
                pending.map((t) => [`fear:${t.source.basicInfo.id}`, 1])
            ),
        };

        participants = participants.map((p) =>
            p.basicInfo.id === tester.basicInfo.id
                ? withWfrpState(p, { psychologyTested: tested })
                : p
        );
    }

    return { participants, messages, testerIds };
}

interface FearRoundCtx {
    round: number;
    rng: Rng;
    edition: EditionProfile;
    messages: LogLine[];
}

/** Extended Test progress (p266): a success adds at least 1, a failure takes at least 1, a critical adds 5+, a fumble takes 5+ */
export const extendedStep = (
    outcome: 'critical' | 'success' | 'failure' | 'fumble',
    sl: number
): number =>
    outcome === 'critical'
        ? Math.max(5, sl)
        : outcome === 'success'
          ? Math.max(1, sl)
          : outcome === 'fumble'
            ? Math.min(-5, sl)
            : Math.min(-1, sl);

/** One Extended Psychology Test roll per round against the strongest unresolved Fear; the SL counts toward every source (p183) */
function fearRound(
    ps: BattleParticipant[],
    testerId: string,
    ctx: FearRoundCtx,
    added: { id: string; rating: number }[] = []
): BattleParticipant[] {
    const tester = ps.find((p) => p.basicInfo.id === testerId);

    if (!tester) return ps;

    const entries: Record<string, FearEntry> = { ...wfrpState(tester).fear };

    const rolledNow = Object.values(entries).some((e) => e.round >= ctx.round);

    for (const a of added)
        entries[a.id] ??= {
            rating: a.rating,
            sl: 0,
            round: rolledNow ? ctx.round : 0,
        };

    const due = Object.keys(entries).filter(
        (id) => entries[id].round < ctx.round
    );

    if (due.length === 0)
        return added.length
            ? ps.map((p) =>
                  p === tester ? withWfrpState(p, { fear: entries }) : p
              )
            : ps;

    const topId = due.reduce((a, b) =>
        entries[b].rating > entries[a].rating ? b : a
    );

    const { t } = selfTest(tester, ctx.edition, ctx.rng);

    const gain = extendedStep(t.outcome, t.sl);

    const next: Record<string, FearEntry> = {
        ...entries,
        ...Object.fromEntries(
            due.map((id) => [
                id,
                {
                    ...entries[id],
                    sl: Math.max(0, entries[id].sl + gain),
                    round: ctx.round,
                },
            ])
        ),
    };

    const name = (id: string) =>
        ps.find((p) => p.basicInfo.id === id)?.basicInfo.name ?? id;

    const top = next[topId];

    ctx.messages.push(
        textRef(
            top.sl >= top.rating
                ? 'battleWfrp.log.fearOvercome'
                : 'battleWfrp.log.fearProgress',
            {
                name: tester.basicInfo.name,
                source: name(topId),
                value: top.rating,
                roll: t.roll,
                sl: t.sl,
                total: top.sl,
            }
        )
    );

    const left = Object.fromEntries(
        Object.entries(next).filter(([, e]) => e.sl < e.rating)
    );

    return ps.map((p) =>
        p === tester
            ? withWfrpState(p, {
                  fear: Object.keys(left).length ? left : undefined,
              })
            : p
    );
}

/** Round start (canon5e): every afraid fighter rolls its Fear test again; gone sources stop counting */
export function wfrpFearRound(
    ps: BattleParticipant[],
    ctx: { round: number; rng: Rng; rules?: Ruleset }
): SystemConditionResult {
    const edition = editionOf(ctx.rules);

    if (edition.psychologyModel !== 'extended')
        return { participants: ps, messages: [] };

    const messages: LogLine[] = [];

    const live = new Set(ps.filter(inPlay).map((p) => p.basicInfo.id));

    let participants = ps;

    for (const p of ps) {
        const fear = wfrpState(p).fear;

        if (!fear || isFrenzied(p)) continue;

        const id = p.basicInfo.id;

        const kept = Object.fromEntries(
            Object.entries(fear).filter(([src]) => live.has(src))
        );

        const cleared =
            !live.has(id) ||
            isPsychImmune(ps, id, ctx.rules) ||
            Object.keys(kept).length === 0;

        const cut = cleared ? undefined : kept;

        participants = participants.map((x) =>
            x === p ? withWfrpState(x, { fear: cut }) : x
        );

        if (cut)
            participants = fearRound(participants, id, {
                round: ctx.round,
                rng: ctx.rng,
                edition,
                messages,
            });
    }

    return { participants, messages };
}

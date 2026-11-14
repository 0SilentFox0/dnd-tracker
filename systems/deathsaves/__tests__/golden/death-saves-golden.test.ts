import { describe, expect, it } from 'vitest';

import {
    CombatStatus,
    ParticipantSourceType,
    type ParticipantSourceTypeValue,
} from '@/lib/constants/battle';
import { applyRawDamage } from '@/lib/utils/abilities/engine/effects/hp';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { runTurnHooks } from '@/lib/utils/battle/turn/hooks';
import { initialRules } from '@/lib/utils/rules/initial-rules';
import { parseRules, type Ruleset } from '@/lib/utils/rules/schema';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import { beginConcentration } from '@/systems/d20/rules/concentration/sustain';
import { withD20State } from '@/systems/d20/rules/state';
import { startDying } from '@/systems/deathsaves/rules/start';
import { deathSavesOf } from '@/systems/deathsaves/rules/state';
import type { BattleParticipant } from '@/types/battle';

const rulesOf = (key: string, enabled: boolean): Ruleset => {
    const base = parseRules(initialRules({ key }));

    return {
        ...base,
        deathSaves: { ...base.deathSaves, enabled, unitsDieAtZero: true },
        concentration: { ...base.concentration, enabled: true },
    };
};

const mock = (
    kind: ParticipantSourceTypeValue,
    hp: number,
    opts: { dying?: boolean; stable?: boolean; concentrating?: boolean } = {}
): BattleParticipant => {
    const base = createMockParticipant();

    let p: BattleParticipant = createMockParticipant({
        basicInfo: { ...base.basicInfo, sourceType: kind },
        combatStats: { ...base.combatStats, currentHp: hp, maxHp: 20, tempHp: 0 },
    });

    if (opts.dying) {
        p = startDying(p, rulesOf('dnd5e', true));

        if (opts.stable)
            p = withD20State(p, {
                deathSaves: { successes: 3, failures: 0, stable: true },
            });
    }

    if (opts.concentrating)
        p = beginConcentration([p], p.basicInfo.id, 'c:sp@1#0', 'Sp', 3)
            .participants[0];

    return p;
};

const summary = (p: BattleParticipant | undefined) =>
    p && {
        hp: p.combatStats.currentHp,
        status: p.combatStats.status,
        saves: deathSavesOf(p) ?? null,
        dying: p.battleData.dying ?? null,
        effects: p.battleData.activeEffects.map((e) => e.abilityKey ?? e.name),
        concentrating: p.battleData.activeEffects.some((e) => e.concentration),
    };

const outcome = (r: {
    participant: BattleParticipant;
    participants: BattleParticipant[];
    messages: unknown[];
}) => ({
    participant: summary(r.participant),
    participants: r.participants.map((p) => summary(p)),
    messages: r.messages,
});

interface ZeroCase {
    name: string;
    manual: boolean;
    stateful: boolean;
    before: BattleParticipant;
    after: BattleParticipant;
    amount: number;
    crit?: boolean;
}

const kinds = [
    ['hero', ParticipantSourceType.CHARACTER],
    ['unit', ParticipantSourceType.UNIT],
] as const;

function zeroCases(): ZeroCase[] {
    const out: ZeroCase[] = [];

    for (const [label, kind] of kinds) {
        for (const concentrating of [false, true]) {
            const c = concentrating ? 'conc' : 'plain';

            const hit = (
                name: string,
                before: BattleParticipant,
                amount: number,
                crit = false,
                stateful = false
            ) =>
                out.push({
                    name: `${label}/${c}/auto/${name}`,
                    manual: false,
                    stateful,
                    before,
                    after: applyRawDamage(before, amount),
                    amount,
                    crit,
                });

            const alive = mock(kind, 5, { concentrating });

            hit('drop', alive, 6);
            hit('drop-crit', alive, 6, true);
            hit('exact', alive, 5);
            hit('massive', alive, 30);
            hit('no-drop', mock(kind, 15, { concentrating }), 3);

            const down = mock(kind, 0, { dying: true, concentrating });

            hit('at0-hit', down, 3, false, true);
            hit('at0-crit', down, 3, true, true);
            hit('at0-massive', down, 20, false, true);

            hit(
                'at0-stable-hit',
                mock(kind, 0, { dying: true, stable: true, concentrating }),
                3,
                false,
                true
            );

            const dead = {
                ...mock(kind, 0, { concentrating }),
                combatStats: {
                    ...mock(kind, 0).combatStats,
                    status: CombatStatus.DEAD,
                },
            };

            hit('already-dead', dead, 4);

            const manualOf = (
                name: string,
                before: BattleParticipant,
                after: BattleParticipant,
                stateful = false
            ) =>
                out.push({
                    name: `${label}/${c}/manual/${name}`,
                    manual: true,
                    stateful,
                    before,
                    after,
                    amount: 0,
                });

            manualOf('down', alive, {
                ...alive,
                combatStats: {
                    ...alive.combatStats,
                    currentHp: 0,
                    status: CombatStatus.UNCONSCIOUS,
                },
            });
            manualOf('dead', alive, {
                ...alive,
                combatStats: {
                    ...alive.combatStats,
                    currentHp: 0,
                    status: CombatStatus.DEAD,
                },
            });
            manualOf('unchanged', alive, alive);
            manualOf(
                'healed',
                down,
                {
                    ...down,
                    combatStats: {
                        ...down.combatStats,
                        currentHp: 5,
                        status: CombatStatus.ACTIVE,
                    },
                },
                true
            );
            manualOf('still-down', down, down, true);
        }
    }

    return out;
}

const zeroTable = (rules: Ruleset, skipStateful: boolean) => {
    const { onZeroHp } = ruleSystemOf(rules).combat;

    return Object.fromEntries(
        zeroCases()
            .filter((c) => !(skipStateful && c.stateful))
            .map((c) => [
                c.name,
                outcome(
                    onZeroHp({
                        before: c.before,
                        after: c.after,
                        amount: c.amount,
                        crit: c.crit,
                        manual: c.manual,
                        rules,
                        rng: () => 0.5,
                        participants: [c.before],
                    })
                ),
            ])
    );
};

const skipTable = (rules: Ruleset) => {
    const hooks = ruleSystemOf(rules).combat.turn?.onSkippedTurn ?? [];

    const subjects: Record<string, BattleParticipant> = {
        dying: mock(ParticipantSourceType.CHARACTER, 0, { dying: true }),
        stable: mock(ParticipantSourceType.CHARACTER, 0, {
            dying: true,
            stable: true,
        }),
        alive: mock(ParticipantSourceType.CHARACTER, 5),
        unit: mock(ParticipantSourceType.UNIT, 5),
    };

    const out: Record<string, unknown> = {};

    for (const [name, p] of Object.entries(subjects))
        for (const roll of [1, 9, 10, 20])
            out[`${name}/d${roll}`] = (() => {
                const r = runTurnHooks(hooks, {
                    participants: [p],
                    id: p.basicInfo.id,
                    round: 2,
                    rng: () => (roll - 1) / 20 + 0.001,
                    rules,
                });

                return {
                    skip: r.skipTurn ?? false,
                    participants: r.participants.map((x) => summary(x)),
                    messages: r.messages,
                };
            })();

    return out;
};

const holdsTable = (rules: Ruleset) => {
    const { holdsOn, onRevived } = ruleSystemOf(rules).combat;

    const dying = mock(ParticipantSourceType.CHARACTER, 0, { dying: true });

    const stable = mock(ParticipantSourceType.CHARACTER, 0, {
        dying: true,
        stable: true,
    });

    const alive = mock(ParticipantSourceType.CHARACTER, 5);

    return {
        holdsDying: holdsOn?.(dying) ?? null,
        holdsStable: holdsOn?.(stable) ?? null,
        holdsAlive: holdsOn?.(alive) ?? null,
        revivedDying: summary(onRevived?.(dying) ?? dying),
        revivedAlive: summary(onRevived?.(alive) ?? alive),
    };
};

const full = (rules: Ruleset) => ({
    zero: zeroTable(rules, false),
    skip: skipTable(rules),
    holds: holdsTable(rules),
});

describe('death saves golden (behaviour before the module split)', () => {
    it.each([true, false])('dnd5e composition, enabled %s', (enabled) => {
        expect(full(rulesOf('dnd5e', enabled))).toMatchSnapshot();
    });

    it('homm composition (death saves off)', () => {
        expect(full(rulesOf('homm', false))).toMatchSnapshot();
    });

    it('bare d20 behaves like the disabled golden (without dying state)', () => {
        const bare = rulesOf('d20', false);

        const disabled = rulesOf('dnd5e', false);

        expect(zeroTable(bare, true)).toEqual(zeroTable(disabled, true));
    });
});

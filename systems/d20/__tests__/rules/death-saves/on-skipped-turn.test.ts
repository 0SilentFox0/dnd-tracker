import { describe, expect, it } from 'vitest';

import { CombatStatus } from '@/lib/constants/battle';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { runTurnHooks } from '@/lib/utils/battle/turn/hooks';
import { DEFAULT_RULES, type Ruleset } from '@/lib/utils/rules';
import { d20DeathSaveOnSkip } from '@/systems/d20/rules/death-saves/on-skipped-turn';
import { startDying } from '@/systems/d20/rules/death-saves/start';
import { deathSavesOf } from '@/systems/d20/rules/death-saves/state';
import { withD20State } from '@/systems/d20/rules/state';

const on: Ruleset = {
    ...DEFAULT_RULES,
    deathSaves: { ...DEFAULT_RULES.deathSaves, enabled: true },
};

const dying = () => {
    const base = createMockParticipant();

    return startDying(
        { ...base, combatStats: { ...base.combatStats, currentHp: 0 } },
        on
    );
};

const run = (rules: Ruleset, roll: number, p = dying()) =>
    runTurnHooks([d20DeathSaveOnSkip], {
        participants: [p],
        id: p.basicInfo.id,
        round: 2,
        rng: () => (roll - 1) / 20 + 0.001,
        rules,
    });

describe('d20DeathSaveOnSkip', () => {
    it('a dying participant rolls a death save and the turn is skipped', () => {
        const r = run(on, 12);

        expect(r.skipTurn).toBe(true);
        expect(deathSavesOf(r.participants[0])).toMatchObject({
            successes: 1,
            failures: 0,
        });
        expect(r.messages).toHaveLength(1);
    });

    it('three failures kill', () => {
        const failed = withD20State(dying(), {
            deathSaves: { successes: 0, failures: 2, stable: false },
        });

        expect(run(on, 5, failed).participants[0].combatStats.status).toBe(
            CombatStatus.DEAD
        );
    });

    it('death saves off: nothing happens', () => {
        const r = run(
            { ...on, deathSaves: { ...on.deathSaves, enabled: false } },
            12
        );

        expect(r.skipTurn).toBeUndefined();
        expect(r.messages).toEqual([]);
    });

    it('a stable or active participant is not rolled for', () => {
        const base = createMockParticipant();

        expect(run(on, 12, base).skipTurn).toBeUndefined();

        const stable = withD20State(dying(), {
            deathSaves: { successes: 0, failures: 0, stable: true },
        });

        expect(run(on, 12, stable).skipTurn).toBeUndefined();
    });
});

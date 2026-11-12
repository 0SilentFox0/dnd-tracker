import { describe, expect, it, vi } from 'vitest';

import { conditionLevel } from '../../conditions/levels';
import { wfrpMiscast } from '../miscast';

import { CombatStatus } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyDamageConsequences } from '@/lib/utils/battle/damage/consequences';
import { mulberry32 } from '@/lib/utils/common/rng';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';
import { DEFAULT_TABLES } from '@/systems/wfrp/rules/tables/defaults';

const rng = mulberry32(1);

const TABLE = {
    minor: DEFAULT_TABLES.miscastMinor,
    major: DEFAULT_TABLES.miscastMajor,
};

const cond = (r: (typeof TABLE)['minor'][number]) =>
    r.effects.find((e) => e.type === 'condition');

const woundsOf = (r: (typeof TABLE)['minor'][number]) =>
    r.effects.reduce(
        (sum, e) => (e.type === 'wounds' ? sum + e.amount : sum),
        0
    );

const rowAt = (
    kind: 'minor' | 'major',
    pred: (r: (typeof TABLE)['minor'][number]) => boolean
) => {
    const i = TABLE[kind].findIndex(pred);

    return { n: i + 1, preset: TABLE[kind][i].max };
};

const run = (
    kind: 'minor' | 'major',
    presetRoll: number,
    hp = 20,
    applyDamage = applyDamageConsequences
) => {
    const caster = makeParticipant({ id: 'c', hp, maxHp: 20 });

    return wfrpMiscast([caster], 'c', kind, {
        round: 1,
        rng,
        rules: WFRP_RULES,
        applyDamage,
        presetRoll,
    });
};

describe('wfrpMiscast', () => {
    it('condition row applies the condition and logs the row text', () => {
        const { n, preset } = rowAt('minor', (r) => !!cond(r) && !woundsOf(r));

        const r = run('minor', preset);

        expect(
            conditionLevel(
                r.participants[0],
                (cond(TABLE.minor[n - 1]) as { key: 'fatigued' }).key
            )
        ).toBeGreaterThan(0);
        expect(r.messages[0]).toMatchObject({
            message: 'wfrpMagic.log.miscast',
            params: { effect: { message: `wfrpMagic.miscast.minor.${n}` } },
        });
    });

    it('wounds row lowers Wounds through applyDamage', () => {
        const { n, preset } = rowAt(
            'minor',
            (r) => woundsOf(r) > 0 && !cond(r)
        );

        const spy = vi.fn(applyDamageConsequences);

        const r = run('minor', preset, 20, spy);

        expect(spy).toHaveBeenCalledOnce();
        expect(r.participants[0].combatStats.currentHp).toBe(
            20 - woundsOf(TABLE.minor[n - 1])
        );
    });

    it('0 Wounds goes through wfrpOnZeroHp', () => {
        const { preset } = rowAt('major', (r) => woundsOf(r) >= 5);

        const r = run('major', preset, 3);

        expect(r.participants[0].combatStats.currentHp).toBe(0);
        expect(r.participants[0].combatStats.status).toBe(
            CombatStatus.UNCONSCIOUS
        );
        expect(
            r.messages.some(
                (m) =>
                    typeof m === 'object' &&
                    m.message === 'battleWfrp.log.unconscious'
            )
        ).toBe(true);
    });

    it('major wounds are never weaker than minor', () => {
        const max = (kind: 'minor' | 'major') =>
            Math.max(...TABLE[kind].map(woundsOf));

        expect(max('major')).toBeGreaterThanOrEqual(max('minor'));
    });

    it('unknown caster is a no-op', () => {
        const r = wfrpMiscast([], 'x', 'minor', {
            round: 1,
            rng,
            rules: WFRP_RULES,
            applyDamage: applyDamageConsequences,
        });

        expect(r.messages).toEqual([]);
    });
});

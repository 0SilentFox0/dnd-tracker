import { describe, expect, it, vi } from 'vitest';

import { buildCopyPlan } from '@/lib/server/content/copy/plan';
import { emptyBundle } from '@/lib/server/templates/bundle';
import type { Actor } from '@/lib/utils/api/actor';

const inactive = new Set<string>();

vi.mock('@/lib/server/content/kind-active', () => ({
    isKindActive: async (kind: string) => !inactive.has(kind),
}));

const id = (c: string) => 'c' + c.repeat(24);

const [U, R, TR, TU, S, TS] = ['a', 'b', 'c', 'd', 'e', 'f'].map(id);

const actor = {} as Actor;

function source() {
    const b = emptyBundle();

    b.units.push({ id: U, name: 'Orc', abilities: { race: R, spell: S } });
    b.races.push({ id: R, name: 'Giant' });
    b.spells.push({ id: S, name: 'Bolt' });

    return b;
}

const selected = [{ kind: 'units', ids: [U] }];

describe('buildCopyPlan', () => {
    it('skips a selected row that already exists in the target', async () => {
        const target = emptyBundle();

        target.units.push({ id: TU, name: ' orc ' });

        const plan = await buildCopyPlan({
            source: source(),
            target,
            targetActor: actor,
            selected,
        });

        expect(plan.skipped).toEqual([
            { kind: 'units', name: 'Orc', reason: 'exists' },
        ]);
        expect(plan.toCreate).toEqual([]);
    });

    it('reuses a dependency existing under another case', async () => {
        const target = emptyBundle();

        target.races.push({ id: TR, name: 'GIANT' });

        const plan = await buildCopyPlan({
            source: source(),
            target,
            targetActor: actor,
            selected,
        });

        expect(plan.reuse.get(R)).toBe(TR);
        expect(plan.reused).toEqual([{ kind: 'races', id: R, name: 'Giant' }]);
        expect(plan.toCreate.map((r) => r.row.id).sort()).toEqual([U, S].sort());
        expect(plan.bundle.races).toEqual([]);
    });

    it('skips dependencies of a kind the target does not support', async () => {
        inactive.add('spells');

        const plan = await buildCopyPlan({
            source: source(),
            target: emptyBundle(),
            targetActor: actor,
            selected,
        });

        inactive.clear();

        expect(plan.skipped).toEqual([
            { kind: 'spells', name: 'Bolt', reason: 'kind-unsupported' },
        ]);
        expect(plan.toCreate.map((r) => r.row.id).sort()).toEqual([U, R].sort());
    });

    it('yields an empty plan when re-planned against a copied target', async () => {
        const target = emptyBundle();

        target.units.push({ id: TU, name: 'Orc' });
        target.races.push({ id: TR, name: 'Giant' });
        target.spells.push({ id: TS, name: 'Bolt' });

        const plan = await buildCopyPlan({
            source: source(),
            target,
            targetActor: actor,
            selected,
        });

        expect(plan.toCreate).toEqual([]);
    });
});

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
        expect(plan.toCreate.map((r) => r.row.id).sort()).toEqual(
            [U, S].sort()
        );
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
        expect(plan.toCreate.map((r) => r.row.id).sort()).toEqual(
            [U, R].sort()
        );
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
    it('warns when a created row references a skipped unsupported dependency', async () => {
        inactive.add('spells');

        const plan = await buildCopyPlan({
            source: source(),
            target: emptyBundle(),
            targetActor: actor,
            selected,
        });

        inactive.clear();

        expect(plan.warnings).toEqual(['units Orc: spells dependency skipped']);
    });

    it('handles reuse and an unsupported kind together', async () => {
        inactive.add('spells');

        const target = emptyBundle();

        target.races.push({ id: TR, name: 'Giant' });

        const plan = await buildCopyPlan({
            source: source(),
            target,
            targetActor: actor,
            selected,
        });

        inactive.clear();

        expect(plan.reuse.get(R)).toBe(TR);
        expect(plan.skipped).toEqual([
            { kind: 'spells', name: 'Bolt', reason: 'kind-unsupported' },
        ]);
        expect(plan.toCreate.map((r) => r.row.id)).toEqual([U]);
        expect(plan.warnings).toHaveLength(1);
    });

    it('terminates on a cycle through a reused row', async () => {
        const b = emptyBundle();

        b.spells.push({ id: S, name: 'Bolt', summon: U });
        b.units.push({ id: U, name: 'Orc', abilities: { spell: S } });

        const target = emptyBundle();

        target.units.push({ id: TU, name: 'orc' });

        const plan = await buildCopyPlan({
            source: b,
            target,
            targetActor: actor,
            selected: [{ kind: 'spells', ids: [S] }],
        });

        expect(plan.toCreate.map((r) => r.row.id)).toEqual([S]);
        expect(plan.reuse.get(U)).toBe(TU);
    });

    it('drops same-name duplicates and remaps references to the winner', async () => {
        const [S2, U3] = ['g', 'h'].map(id);

        const b = emptyBundle();

        b.spells.push({ id: S, name: 'Bolt' }, { id: S2, name: ' bolt ' });
        b.units.push(
            { id: U, name: 'Orc', abilities: { spell: S } },
            { id: U3, name: 'Ogre', abilities: { spell: S2 } }
        );

        const plan = await buildCopyPlan({
            source: b,
            target: emptyBundle(),
            targetActor: actor,
            selected: [{ kind: 'units', ids: [U, U3] }],
        });

        const ids = new Set(plan.toCreate.map((r) => r.row.id));

        expect(ids).toEqual(new Set([U, U3, S]));
        expect(plan.skipped).toEqual([
            { kind: 'spells', name: ' bolt ', reason: 'duplicate-name' },
        ]);
        expect(JSON.stringify(plan.toCreate)).not.toContain(S2);
        expect(plan.bundle.spells).toHaveLength(1);
        expect(plan.bundle.units.find((r) => r.id === U3)?.abilities).toEqual({
            spell: S,
        });
    });

    it('reports a missing id and an unknown kind', async () => {
        const plan = await buildCopyPlan({
            source: source(),
            target: emptyBundle(),
            targetActor: actor,
            selected: [
                { kind: 'units', ids: [TS] },
                { kind: 'bogus', ids: [U] },
            ],
        });

        expect(plan.skipped).toEqual([
            { kind: 'units', name: TS, reason: 'not-found' },
            { kind: 'bogus', name: 'bogus', reason: 'unknown-kind' },
        ]);
    });

    it('falls back to title when name is not a string', async () => {
        const b = emptyBundle();

        b.units.push({ id: U, name: null, title: 'Orc' });

        const target = emptyBundle();

        target.units.push({ id: TU, title: 'ORC' });

        const plan = await buildCopyPlan({
            source: b,
            target,
            targetActor: actor,
            selected,
        });

        expect(plan.skipped).toEqual([
            { kind: 'units', name: 'Orc', reason: 'exists' },
        ]);
    });
});

import { describe, expect, it } from 'vitest';

import { assertMatrixCase } from './helpers/composition-matrix';
import { realCompose } from './helpers/real-compose';

import { kindOf, moduleMetaOf } from '@/lib/utils/rules/systems/catalog';
import { validateComposition } from '@/lib/utils/rules/systems/compose';
import { SYSTEM_META, type SystemMeta } from '@/lib/utils/rules/systems/meta';

const METAS: readonly SystemMeta[] = SYSTEM_META;

const isBase = (id: string) => {
    const meta = moduleMetaOf(id, METAS);

    return !!meta && kindOf(meta) === 'base';
};

const addonsOn = (base: string) =>
    METAS.filter((m) => kindOf(m) === 'addon')
        .filter((m) => {
            const bases = (m.requires ?? []).filter(isBase);

            return bases.length === 0 || bases.includes(base);
        })
        .map((m) => m.module)
        .sort();

const subsetOf = (ids: readonly string[], mask: number) =>
    ids.filter((_, i) => mask & (1 << i));

describe('N-module subsets of the real composition', () => {
    const d20Key = 'd20';

    const ids = addonsOn('d20');

    const valid = (modules: string[]) =>
        validateComposition({ key: d20Key, modules }, METAS).length === 0;

    it('there are enough independent modules to make the matrix meaningful', () =>
        expect(ids.length).toBeGreaterThanOrEqual(8));

    const pairs = ids.flatMap((a, i) => ids.slice(i + 1).map((b) => [a, b]));

    it('every valid pair composes and keeps the contract', () => {
        const composed = pairs.filter(valid);

        expect(composed.length).toBeGreaterThan(0);

        for (const modules of composed)
            assertMatrixCase(
                METAS,
                {
                    label: modules.join('+'),
                    key: d20Key,
                    base: 'd20',
                    modules,
                },
                realCompose
            );
    });

    it('every module dropped from the full valid set still composes', () => {
        const full = ids.filter((id) => valid([id]));

        for (const drop of full) {
            const modules = full.filter((id) => id !== drop);

            if (!valid(modules)) continue;

            assertMatrixCase(
                METAS,
                {
                    label: `all but ${drop}`,
                    key: d20Key,
                    base: 'd20',
                    modules,
                },
                realCompose
            );
        }
    });

    it('every bit-mask of the module list that validates composes without throwing', () => {
        let composed = 0;

        for (let mask = 0; mask < 1 << ids.length; mask++) {
            const modules = subsetOf(ids, mask);

            if (!valid(modules)) continue;

            composed++;
            expect(() => realCompose(d20Key, modules)).not.toThrow();
        }

        expect(composed).toBeGreaterThan(ids.length);
    }, 30_000);
});

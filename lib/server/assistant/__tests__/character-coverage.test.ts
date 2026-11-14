import { readFileSync } from 'node:fs';
import { expect, it } from 'vitest';

import {
    ASSISTANT_ROUTE_COVERAGE,
    exportedHttpMethods,
} from '@/lib/server/assistant/__tests__/helpers/coverage';
import { characterActionCoverage } from '@/lib/server/assistant/actions/character-coverage';
import { CHARACTER_PROGRESSION_ACTIONS } from '@/lib/server/assistant/actions/character-progression';
import { CHARACTER_ACTIONS } from '@/lib/server/assistant/actions/characters';
import { createActionCatalog } from '@/lib/server/assistant/catalog';
it('every character route method has one implemented action and test owner', () => {
    const catalog = createActionCatalog([
        ...CHARACTER_ACTIONS,
        ...CHARACTER_PROGRESSION_ACTIONS,
    ]);

    const expected = ASSISTANT_ROUTE_COVERAGE.filter(
        (row) => row.adapter === 'characters'
    )
        .flatMap((row) => row.methods.map((method) => `${method} ${row.route}`))
        .sort();

    expect(
        [
            ...new Set(
                characterActionCoverage().map(
                    (row) => `${row.method} ${row.route}`
                )
            ),
        ].sort()
    ).toEqual([...new Set(expected)]);
    for (const row of characterActionCoverage()) {
        expect(
            exportedHttpMethods(
                readFileSync(`app/api/${row.route}/route.ts`, 'utf8')
            )
        ).toContain(row.method);
        expect(catalog.getAction(row.actionId)).toBeDefined();
        expect(row.testId.length).toBeGreaterThan(0);
    }
});

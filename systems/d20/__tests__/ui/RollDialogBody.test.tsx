// @vitest-environment happy-dom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { RollDialogBody } from '@/systems/d20/ui/RollDialogBody';
import type { SheetRollResult } from '@/types/characters';

const check = (
    over: Partial<Extract<SheetRollResult, { kind: 'check' }>> = {}
) =>
    ({
        kind: 'check',
        label: 'x',
        rolls: [14, 3],
        roll: 14,
        mod: 2,
        bonus: 1,
        total: 17,
        mode: 'advantage',
        autoFail: false,
        inspirationUsed: false,
        ...over,
    }) as SheetRollResult;

const body = (result: SheetRollResult | null) =>
    render(
        <RollDialogBody
            request={{
                label: 'x',
                subject: { kind: 'check', skill: 'stealth' },
            }}
            result={result}
            difficulty=""
            setDifficulty={() => {}}
        />
    );

describe('d20 RollDialogBody', () => {
    afterEach(cleanup);

    it('renders nothing without a result', () => {
        expect(body(null).container).toBeEmptyDOMElement();
    });

    it('renders nothing for a non-d20 result', () => {
        expect(
            body({ kind: 'percentile' } as SheetRollResult).container
        ).toBeEmptyDOMElement();
    });

    it('shows total and roll breakdown with the combined bonus', () => {
        const { container } = body(check());

        expect(container.textContent).toContain('17');
        expect(container.textContent).toContain('"rolls":"14 / 3"');
        expect(container.textContent).toContain('"mode":"advantage"');
        expect(container.textContent).toContain('"bonus":"+3"');
    });

    it('shows a cross and the auto-fail note on auto-fail', () => {
        const { container } = body(check({ autoFail: true, total: 0 }));

        expect(container.textContent).toContain('✕');
        expect(container.textContent).toContain('rest.sheetRoll.autoFail');
        expect(container.textContent).not.toContain('"rolls"');
    });
});

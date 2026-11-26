// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { compendiumStep, compendiumUnlocked } from '../CompendiumSteps';

import { StepIndicator } from '@/components/common/shell/StepIndicator';
import type { CompendiumImportController } from '@/lib/hooks/compendium-import';

type State = CompendiumImportController['state'];

const state = (patch: Partial<State>) =>
    ({
        root: null,
        preview: null,
        rights: false,
        result: null,
        ...patch,
    }) as State;

afterEach(cleanup);

describe('compendiumStep', () => {
    it('derives the reached step from the screen state', () => {
        expect(compendiumStep(state({}))).toBe(0);
        expect(compendiumStep(state({ root: {} }))).toBe(1);
        expect(
            compendiumStep(state({ root: {}, preview: {} as State['preview'] }))
        ).toBe(2);
        expect(compendiumStep(state({ result: {} as State['result'] }))).toBe(
            4
        );
    });

    it('unlocks the confirm step as soon as a preview exists', () => {
        expect(compendiumUnlocked(state({ root: {} }))).toBe(2);
        expect(
            compendiumUnlocked(state({ preview: {} as State['preview'] }))
        ).toBe(4);
        expect(
            compendiumUnlocked(state({ result: {} as State['result'] }))
        ).toBe(5);
    });
});

describe('StepIndicator', () => {
    it('усі кроки виконані, коли current дорівнює довжині', () => {
        render(<StepIndicator label="l" steps={['a', 'b']} current={2} />);

        expect(
            screen
                .getAllByRole('listitem')
                .every((li) => li.getAttribute('data-state') === 'done')
        ).toBe(true);
    });
});

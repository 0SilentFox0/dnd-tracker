// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CompendiumSummary } from '../layout/CompendiumSummary';

import type {
    CompendiumImportController,
    PreviewExpiry,
    WizardView,
} from '@/lib/hooks/compendium-import';

afterEach(cleanup);

const preview = {
    token: 't',
    report: { readyToImport: true, counts: { errors: 0 }, media: { queued: 2 } },
};

const setup = (
    step: number,
    state: Record<string, unknown> = {},
    expired = false
) => {
    const actions = {
        runPreview: vi.fn(),
        confirm: vi.fn(),
        close: vi.fn(),
    };

    const setStep = vi.fn();

    render(
        <CompendiumSummary
            wizard={
                {
                    state: {
                        root: {},
                        file: { name: 'a.json', size: 10 },
                        categories: ['spell'],
                        excludedChapters: [],
                        preview,
                        rights: false,
                        busy: false,
                        ...state,
                    },
                    actions,
                } as unknown as CompendiumImportController
            }
            view={{ step, maxStep: 3, setStep } as unknown as WizardView}
            expiry={
                {
                    expiresAt: '2026-01-01T10:00:00.000Z',
                    expired,
                } as PreviewExpiry
            }
        />
    );

    return { actions, setStep };
};

const primary = () =>
    screen.getAllByRole('button').at(-1) as HTMLButtonElement;

describe('CompendiumSummary', () => {
    it('labels the primary action per step', () => {
        setup(0);
        expect(primary().textContent).toBe('compendium.summary.next');
        cleanup();
        setup(1);
        expect(primary().textContent).toBe('compendium.categoriesStep.preview');
        cleanup();
        setup(2);
        expect(primary().textContent).toBe('compendium.summary.next');
        cleanup();
        setup(3);
        expect(primary().textContent).toBe('compendium.import.confirm');
        cleanup();
        setup(4);
        expect(primary().textContent).toBe('compendium.summary.new');
    });

    it('disables import without rights and enables it with rights', () => {
        setup(3);
        expect(primary().disabled).toBe(true);
        cleanup();

        const { actions } = setup(3, { rights: true });

        expect(primary().disabled).toBe(false);
        fireEvent.click(primary());
        expect(actions.confirm).toHaveBeenCalled();
    });

    it('offers a re-check when the preview expired', () => {
        const { actions } = setup(3, { rights: true }, true);

        expect(primary().textContent).toBe('compendium.confirm.recheck');
        fireEvent.click(primary());
        expect(actions.runPreview).toHaveBeenCalled();
        expect(screen.queryByRole('alert')).toBeNull();
    });

    it('advances the view with Next', () => {
        const { setStep } = setup(2);

        fireEvent.click(primary());
        expect(setStep).toHaveBeenCalledWith(3);
    });
});

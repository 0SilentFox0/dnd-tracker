// @vitest-environment happy-dom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { compendiumStep } from '../compendium-step';
import type { CompendiumImportController } from '../useCompendiumImport';
import { useCompendiumWizardView } from '../useCompendiumWizardView';
import { usePreviewExpiry } from '../usePreviewExpiry';

import { COMPENDIUM_PREVIEW_TTL_MS } from '@/lib/constants/compendium-import';

type State = CompendiumImportController['state'];

const state = (patch: Partial<State>) =>
    ({
        root: null,
        preview: null,
        rights: false,
        result: null,
        phase: 'idle',
        ...patch,
    }) as State;

const preview = {} as State['preview'];

afterEach(cleanup);

describe('compendiumStep', () => {
    it('derives the furthest reachable step', () => {
        expect(compendiumStep(state({}))).toBe(0);
        expect(compendiumStep(state({ root: {} }))).toBe(1);
        expect(compendiumStep(state({ root: {}, preview }))).toBe(3);
        expect(compendiumStep(state({ result: {} as State['result'] }))).toBe(
            4
        );
    });
});

describe('useCompendiumWizardView', () => {
    it('follows the flow: file -> categories -> check', () => {
        const { result, rerender } = renderHook(
            (s: State) => useCompendiumWizardView(s),
            { initialProps: state({}) }
        );

        expect(result.current.step).toBe(0);

        rerender(state({ root: {} }));
        expect(result.current.step).toBe(1);

        rerender(state({ root: {}, preview }));
        expect(result.current.step).toBe(2);
        expect(result.current.maxStep).toBe(3);
    });

    it('clamps setStep to the reachable step and allows going back', () => {
        const { result } = renderHook(() =>
            useCompendiumWizardView(state({ root: {} }))
        );

        act(() => result.current.setStep(4));
        expect(result.current.step).toBe(1);

        act(() => result.current.setStep(0));
        expect(result.current.step).toBe(0);
    });

    it('keeps the viewed step while a re-check is running', () => {
        const { result, rerender } = renderHook(
            (s: State) => useCompendiumWizardView(s),
            { initialProps: state({ root: {}, preview }) }
        );

        act(() => result.current.setStep(3));
        rerender(state({ root: {}, phase: 'previewing' }));
        expect(result.current.step).toBe(3);

        rerender(state({ root: {}, preview }));
        expect(result.current.step).toBe(3);
    });

    it('returns to categories when the check fails', () => {
        const { result, rerender } = renderHook(
            (s: State) => useCompendiumWizardView(s),
            { initialProps: state({ root: {}, preview }) }
        );

        rerender(state({ root: {}, phase: 'previewing' }));
        rerender(state({ root: {} }));
        expect(result.current.step).toBe(1);
    });
});

describe('usePreviewExpiry', () => {
    beforeEach(() => vi.useFakeTimers());
    afterEach(() => vi.useRealTimers());

    it('expires 15 minutes after the preview arrives', () => {
        const { result, rerender } = renderHook(
            (p: unknown) => usePreviewExpiry(p),
            { initialProps: null as unknown }
        );

        expect(result.current).toEqual({ expiresAt: null, expired: false });

        rerender({ token: 't' });
        expect(result.current.expiresAt).not.toBeNull();
        expect(result.current.expired).toBe(false);

        act(() => {
            vi.advanceTimersByTime(COMPENDIUM_PREVIEW_TTL_MS + 1000);
        });
        expect(result.current.expired).toBe(true);
    });

    it('restamps on a new preview', () => {
        const { result, rerender } = renderHook(
            (p: unknown) => usePreviewExpiry(p),
            { initialProps: { token: 'a' } as unknown }
        );

        act(() => {
            vi.advanceTimersByTime(COMPENDIUM_PREVIEW_TTL_MS + 1000);
        });
        expect(result.current.expired).toBe(true);

        rerender({ token: 'b' });
        expect(result.current.expired).toBe(false);
    });
});

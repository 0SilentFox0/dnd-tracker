// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
    type CompendiumStepId,
    useCompendiumWizardView,
} from '../useCompendiumWizardView';

const setup = (progress: CompendiumStepId, unlocked?: CompendiumStepId) =>
    renderHook(
        (props: { p: CompendiumStepId; u?: CompendiumStepId }) =>
            useCompendiumWizardView(props.p, props.u),
        { initialProps: { p: progress, u: unlocked } }
    );

describe('useCompendiumWizardView', () => {
    it('follows progress forward', () => {
        const { result, rerender } = setup(2);

        expect(result.current.step).toBe(2);
        rerender({ p: 3, u: undefined });
        expect(result.current.step).toBe(3);
        expect(result.current.maxStep).toBe(3);
    });

    it('ignores steps beyond the unlocked one', () => {
        const { result } = setup(3);

        act(() => result.current.setStep(4));
        expect(result.current.step).toBe(3);
        act(() => result.current.setStep(2));
        expect(result.current.step).toBe(2);
    });

    it('keeps a viewed earlier step while progress is unchanged and clamps on reset', () => {
        const { result, rerender } = setup(3);

        act(() => result.current.setStep(2));
        expect(result.current.step).toBe(2);
        rerender({ p: 1, u: undefined });
        expect(result.current.step).toBe(1);
    });

    it('lets progress land below the unlocked step', () => {
        const { result, rerender } = setup(2);

        rerender({ p: 3, u: 4 });
        expect(result.current.step).toBe(3);
        act(() => result.current.setStep(4));
        expect(result.current.step).toBe(4);
    });
});

// @vitest-environment happy-dom
import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
    useWfrpDraftRolls,
    type WfrpDraftRollsOptions,
} from '../useWfrpDraftRolls';

import { mulberry32 } from '@/lib/utils/common/rng';
import { CHARACTERISTIC_KEYS } from '@/systems/wfrp/rules/characteristics/keys';
import type { SpeciesProfile } from '@/systems/wfrp/rules/creation';

const profile: SpeciesProfile = {
    mods: {},
    move: 4,
    fate: 2,
    extraWounds: 0,
    talents: [],
    randomTalentCount: 2,
    randomTalents: [
        { max: 50, featId: 'f1' },
        { max: 100, featId: 'f2' },
    ],
    careerTable: [
        { max: 50, careerId: 'ca' },
        { max: 100, careerId: 'cb' },
    ],
};

function setup(over: Partial<WfrpDraftRollsOptions> = {}) {
    const start = vi.fn();

    const opts = {
        career: {
            mode: 'rolled' as const,
            rolls: [] as { careerId: string; roll: number }[],
            setRolls: vi.fn(),
            setId: vi.fn(),
        },
        stats: {
            rolls: [] as number[],
            setRolls: vi.fn(),
            setArranged: vi.fn(),
        },
        talents: { rolled: [] as string[], set: vi.fn() },
        reveal: { start } as unknown as WfrpDraftRollsOptions['reveal'],
        rng: mulberry32(7),
        profile,
        enabled: true,
        names: {
            career: (id: string) => `C:${id}`,
            feat: (id: string) => `F:${id}`,
        },
        ...over,
    } satisfies WfrpDraftRollsOptions;

    const { result } = renderHook(() => useWfrpDraftRolls(opts));

    return { result, opts, start };
}

describe('useWfrpDraftRolls', () => {
    it('rolls two careers, preselects the first in rolled mode and starts a reveal', () => {
        const { result, opts, start } = setup();

        act(() => result.current.careerRoll());

        const rolls = vi.mocked(opts.career.setRolls).mock.calls[0][0];

        expect(rolls).toHaveLength(2);
        expect(opts.career.setId).toHaveBeenCalledWith(rolls[0].careerId);

        const steps = start.mock.calls[0][0];

        expect(steps.map((s: { key: string }) => s.key)).toEqual([
            'career0',
            'career1',
        ]);
        expect(steps[0].final).toBe(`C:${rolls[0].careerId}`);
        expect(['C:ca', 'C:cb']).toContain(steps[0].pool());
    });

    it('does not preselect a career outside rolled mode', () => {
        const { result, opts } = setup({
            career: {
                mode: 'choice',
                rolls: [],
                setRolls: vi.fn(),
                setId: vi.fn(),
            },
        });

        act(() => result.current.careerRoll());
        expect(opts.career.setId).toHaveBeenCalledWith(undefined);
    });

    it('rolls one value per characteristic and mirrors them to the arranged list', () => {
        const { result, opts, start } = setup();

        act(() => result.current.statsRoll());

        const rolled = vi.mocked(opts.stats.setRolls).mock.calls[0][0];

        expect(rolled).toHaveLength(CHARACTERISTIC_KEYS.length);
        expect(rolled.every((v: number) => v >= 2 && v <= 20)).toBe(true);
        expect(opts.stats.setArranged).toHaveBeenCalledWith(rolled);
        expect(
            start.mock.calls[0][0].map((s: { final: number }) => s.final)
        ).toEqual(rolled);
    });

    it('rolls the configured number of random talents', () => {
        const { result, opts, start } = setup();

        act(() => result.current.talentsRoll());

        const picked = vi.mocked(opts.talents.set).mock.calls[0][0];

        expect(picked).toHaveLength(2);
        expect(start.mock.calls[0][0][0].final).toBe(`F:${picked[0]}`);
    });

    it('is idempotent once a result exists', () => {
        const { result, opts, start } = setup({
            career: {
                mode: 'rolled',
                rolls: [{ careerId: 'ca', roll: 3 }],
                setRolls: vi.fn(),
                setId: vi.fn(),
            },
            stats: { rolls: [1], setRolls: vi.fn(), setArranged: vi.fn() },
            talents: { rolled: ['f1'], set: vi.fn() },
        });

        act(() => {
            result.current.careerRoll();
            result.current.statsRoll();
            result.current.talentsRoll();
        });
        expect(start).not.toHaveBeenCalled();
        expect(opts.career.setRolls).not.toHaveBeenCalled();
        expect(opts.stats.setRolls).not.toHaveBeenCalled();
        expect(opts.talents.set).not.toHaveBeenCalled();
    });

    it.each([
        ['no profile', { profile: undefined }],
        ['disabled', { enabled: false }],
    ])('does nothing with %s', (_n, over) => {
        const { result, opts, start } = setup(over);

        act(() => {
            result.current.careerRoll();
            result.current.statsRoll();
            result.current.talentsRoll();
        });
        expect(start).not.toHaveBeenCalled();
        expect(opts.stats.setRolls).not.toHaveBeenCalled();
    });
});

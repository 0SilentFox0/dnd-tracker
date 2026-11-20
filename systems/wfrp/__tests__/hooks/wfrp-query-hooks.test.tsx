// @vitest-environment happy-dom
import type { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { raceProfileKeys } from '@/lib/hooks/races';
import {
    careerKeys,
    useCareers,
    useCreateCareer,
    useDeleteCareer,
    useUpdateCareer,
} from '@/systems/wfrp/hooks/careers';
import {
    useRaceProfiles,
    useSaveRaceProfile,
} from '@/systems/wfrp/hooks/useRaceProfiles';
import { useWfrpSpecies } from '@/systems/wfrp/hooks/useWfrpSpecies';

const api = vi.hoisted(() => ({
    getCareers: vi.fn(),
    createCareer: vi.fn(),
    updateCareer: vi.fn(),
    deleteCareer: vi.fn(),
    getRaceProfiles: vi.fn(),
    saveRaceProfile: vi.fn(),
}));

vi.mock('@/systems/wfrp/api/careers', () => ({
    getCareers: api.getCareers,
    createCareer: api.createCareer,
    updateCareer: api.updateCareer,
    deleteCareer: api.deleteCareer,
}));
vi.mock('@/systems/wfrp/api/races', () => ({
    getRaceProfiles: api.getRaceProfiles,
    saveRaceProfile: api.saveRaceProfile,
}));

afterEach(() => vi.clearAllMocks());

function setup() {
    const client = new QueryClient({
        defaultOptions: { queries: { retry: false } },
    });

    const spy = vi.spyOn(client, 'invalidateQueries');

    const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );

    return { client, spy, wrapper };
}

const invalidated = (spy: ReturnType<typeof setup>['spy']) =>
    spy.mock.calls.map((c) => (c[0] as { queryKey: unknown }).queryKey);

describe('career hooks', () => {
    it('useCareers loads the campaign list under the key factory', async () => {
        const { client, wrapper } = setup();

        api.getCareers.mockResolvedValue([{ id: 'c1' }]);

        const { result } = renderHook(() => useCareers('camp'), { wrapper });

        await waitFor(() =>
            expect(result.current.data).toEqual([{ id: 'c1' }])
        );

        expect(api.getCareers).toHaveBeenCalledWith('camp');
        expect(client.getQueryData(careerKeys.list('camp'))).toEqual([
            { id: 'c1' },
        ]);
    });

    it('useCareers stays idle when disabled', () => {
        const { wrapper } = setup();

        renderHook(() => useCareers('camp', { enabled: false }), { wrapper });

        expect(api.getCareers).not.toHaveBeenCalled();
    });

    it('create invalidates only the career list', async () => {
        const { spy, wrapper } = setup();

        api.createCareer.mockResolvedValue({ id: 'n' });

        const { result } = renderHook(() => useCreateCareer('camp'), {
            wrapper,
        });

        await act(() => result.current.mutateAsync({ name: 'X' } as never));

        expect(api.createCareer).toHaveBeenCalledWith('camp', { name: 'X' });
        expect(invalidated(spy)).toEqual([careerKeys.list('camp')]);
    });

    it('update and delete also invalidate character sheets', async () => {
        const { spy, wrapper } = setup();

        api.updateCareer.mockResolvedValue({});
        api.deleteCareer.mockResolvedValue({ ok: true });

        const update = renderHook(() => useUpdateCareer('camp'), { wrapper });

        await act(() =>
            update.result.current.mutateAsync({
                careerId: 'c1',
                data: { name: 'Y' },
            })
        );

        expect(api.updateCareer).toHaveBeenCalledWith('camp', 'c1', {
            name: 'Y',
        });
        expect(invalidated(spy)).toHaveLength(2);
        expect(invalidated(spy)).toContainEqual(careerKeys.list('camp'));

        spy.mockClear();

        const del = renderHook(() => useDeleteCareer('camp'), { wrapper });

        await act(() => del.result.current.mutateAsync('c1'));

        expect(api.deleteCareer).toHaveBeenCalledWith('camp', 'c1');
        expect(invalidated(spy)).toHaveLength(2);
    });

    it('a failing create does not invalidate', async () => {
        const { spy, wrapper } = setup();

        api.createCareer.mockRejectedValue(new Error('boom'));

        const { result } = renderHook(() => useCreateCareer('camp'), {
            wrapper,
        });

        await act(async () => {
            await result.current.mutateAsync({} as never).catch(() => {});
        });

        expect(spy).not.toHaveBeenCalled();
    });
});

describe('race profile hooks', () => {
    it('loads profiles and saves one, refreshing the list', async () => {
        const { spy, wrapper } = setup();

        api.getRaceProfiles.mockResolvedValue([{ raceId: 'r1' }]);
        api.saveRaceProfile.mockResolvedValue({});

        const list = renderHook(() => useRaceProfiles('camp'), { wrapper });

        await waitFor(() =>
            expect(list.result.current.data).toEqual([{ raceId: 'r1' }])
        );

        const save = renderHook(() => useSaveRaceProfile('camp'), { wrapper });

        await act(() =>
            save.result.current.mutateAsync({
                raceId: 'r1',
                profile: { move: 4 } as never,
            })
        );

        expect(api.saveRaceProfile).toHaveBeenCalledWith('camp', 'r1', {
            move: 4,
        });
        expect(invalidated(spy)).toEqual([raceProfileKeys.list('camp')]);
    });
});

describe('useWfrpSpecies', () => {
    const races = [
        { id: 'r1', name: 'Людина' },
        { id: 'r2', name: 'Ельф' },
        { id: 'r3', name: 'Гном' },
    ] as never;

    const profiles = [
        { raceId: 'r1', profile: { careerTable: [{ max: 100, id: 'c' }] } },
        { raceId: 'r2', profile: { careerTable: [] } },
    ] as never;

    it('returns only races with a usable profile', () => {
        const { result } = renderHook(() =>
            useWfrpSpecies({ enabled: true, profiles, races })
        );

        expect(result.current.map((s) => s.race.id)).toEqual(['r1']);
    });

    it('is empty when disabled or data is missing', () => {
        expect(
            renderHook(() =>
                useWfrpSpecies({ enabled: false, profiles, races })
            ).result.current
        ).toEqual([]);
        expect(
            renderHook(() => useWfrpSpecies({ enabled: true })).result.current
        ).toEqual([]);
    });
});

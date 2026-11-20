// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { useCounterWindow } from '../use-counter-window';

import type { CounterOffer } from '@/lib/utils/battle/counter/types';

const mutate = vi.fn();

const offer: CounterOffer = {
    reactorId: 'h',
    dm: false,
    slotLevels: [],
    system: { label: 'wfrpMagic.dispel.react' },
};

vi.mock('../useBattleScene', () => ({
    useBattleScene: () => ({
        campaignId: 'c',
        battleId: 'b',
        actions: { counterWindow: { mutate, isPending: false } },
        viewer: { readOnly: false, isDM: false, userId: 'u1' },
        battle: {
            initiativeOrder: [
                { basicInfo: { id: 'h', name: 'Hero', controlledBy: 'u1' } },
                { basicInfo: { id: 'm', name: 'Mage', controlledBy: 'dm' } },
            ],
            pendingChoice: {
                kind: 'counter',
                windowId: 'w1',
                actorId: 'm',
                deadline: new Date(Date.now() + 10_000).toISOString(),
                offers: [offer],
            },
        },
    }),
}));

vi.mock('@/lib/hooks/battles', () => ({
    useCounterWindowOp: () => ({ mutate }),
}));

describe('useCounterWindow react', () => {
    it('sends a react answer for the offer reactor', () => {
        const { result } = renderHook(() => useCounterWindow());

        expect(result.current.offers).toHaveLength(1);

        result.current.react(offer);

        expect(mutate).toHaveBeenCalledWith({
            action: 'react',
            reactorId: 'h',
            windowId: 'w1',
        });
    });
});

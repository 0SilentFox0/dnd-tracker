// @vitest-environment happy-dom
import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useFxImpacts } from '../useFxImpacts';

import { AttackType } from '@/lib/constants/battle';
import { action } from '@/lib/utils/battle/fx/__tests__/action-fixture';
import type { BattleAction } from '@/types/battle-actions';

const h = vi.hoisted(() => ({
    log: [] as BattleAction[],
    morale: null as unknown,
    hidden: false,
    redacted: undefined as true | undefined,
    order: [] as unknown[],
}));

vi.mock('../useBattleScene', () => ({
    useBattleSceneData: () => ({
        battle: {
            battleLog: h.log,
            system: h.morale,
            initiativeOrder: h.order,
            redacted: h.redacted,
        },
    }),
}));
vi.mock('../useFxEnabled', () => ({ useFxEnabled: () => ({ enabled: true }) }));
vi.mock('@/lib/hooks/common', () => ({ usePageHidden: () => h.hidden }));

const melee = { attackKind: AttackType.MELEE, isHit: true };

const attack = action({
    id: 'atk',
    actionIndex: 1,
    actorId: 'a',
    targets: [{ participantId: 'd', participantName: 'D' }],
    actionType: 'attack',
    actionDetails: melee,
});

const retaliation = action({
    id: 'ret',
    actionIndex: 2,
    actorId: 'd',
    targets: [{ participantId: 'a', participantName: 'A' }],
    actionType: 'retaliation',
    actionDetails: melee,
});

beforeEach(() => {
    h.log = [attack, retaliation];
    h.morale = null;
    h.hidden = false;
    h.redacted = undefined;
    h.order = [];
});

describe('useFxImpacts', () => {
    it('redacted: ворог отримує delta з hpChanges, союзник — ні', () => {
        h.redacted = true;
        h.order = [
            { basicInfo: { id: 'd', side: 'enemy' } },
            { basicInfo: { id: 'a', side: 'ally' } },
        ];
        h.log = [
            {
                ...attack,
                hpChanges: [
                    {
                        participantId: 'd',
                        participantName: 'D',
                        oldHp: 75,
                        newHp: 75,
                        change: 4,
                    },
                ],
            },
            {
                ...retaliation,
                hpChanges: [
                    {
                        participantId: 'a',
                        participantName: 'A',
                        oldHp: 20,
                        newHp: 17,
                        change: 3,
                    },
                ],
            },
        ];

        const { result } = renderHook(() => useFxImpacts());

        expect(result.current('d')?.delta).toBe(-4);
        expect(result.current('a')?.delta).toBeUndefined();
    });

    it('атака + відповідний удар в одній дельті: кожен отримує свою дію', () => {
        const { result } = renderHook(() => useFxImpacts());

        expect(result.current('d')?.actionId).toBe('atk');
        expect(result.current('a')?.actionId).toBe('ret');
    });

    it('waitMs росте з кількістю дій у черзі', () => {
        const { result } = renderHook(() => useFxImpacts());

        const first = result.current('d')?.waitMs ?? 0;

        const last = result.current('a')?.waitMs ?? 0;

        expect(first).toBeGreaterThan(last);
    });

    it('кубик системи в черзі збільшує запобіжник; без слота — ні', () => {
        const fx = {
            dice: [
                (e: { scene: { system: unknown } }) =>
                    e.scene.system
                        ? {
                              key: 'k',
                              actorId: 'a',
                              spec: { seed: 1, groups: [] },
                          }
                        : null,
            ],
        };

        const waitOf = (slot?: typeof fx) =>
            renderHook(() => useFxImpacts(slot)).result.current('a')?.waitMs ??
            0;

        const base = waitOf(fx);

        h.morale = { participantId: 'a' };

        expect(waitOf(fx)).toBeGreaterThan(base);
        expect(waitOf()).toBe(base);
    });

    it('прихована сторінка — вплив без actionId', () => {
        h.hidden = true;

        const impact = renderHook(() => useFxImpacts()).result.current('d');

        expect(impact).not.toBeNull();
        expect(impact?.actionId).toBeUndefined();
    });

    it('вторинна жертва отримує вплив тієї ж дії', () => {
        h.log = [
            action({
                id: 'fw',
                actionIndex: 1,
                actionType: 'attack',
                targets: [{ participantId: 't', participantName: 'T' }],
                actionDetails: { attackKind: AttackType.RANGED, isHit: true },
                hpChanges: [
                    {
                        participantId: 't',
                        participantName: 'T',
                        oldHp: 50,
                        newHp: 42,
                        change: 8,
                    },
                    {
                        participantId: 's',
                        participantName: 'S',
                        oldHp: 50,
                        newHp: 46,
                        change: 4,
                    },
                ],
            }),
        ];

        const { result } = renderHook(() => useFxImpacts());

        expect(result.current('s')?.actionId).toBe('fw');
        expect(result.current('s')?.actionId).toBe(
            result.current('t')?.actionId
        );
    });
});

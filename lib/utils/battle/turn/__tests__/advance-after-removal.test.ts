import { describe, expect, it, vi } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import {
    makeParticipant,
    resolved,
} from '@/lib/utils/abilities/__tests__/fixtures';
import { hpOf } from '@/lib/utils/battle/__tests__/fixtures/placed';
import { applyScenePatch } from '@/lib/utils/battle/scene-state';
import type { BattleSceneState } from '@/lib/utils/battle/store';
import { advanceAfterRemoval, advanceTurn } from '@/lib/utils/battle/turn';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import { withDeathSaves } from '@/systems/deathsaves/rules/state';
import { pendingSlot } from '@/systems/morale/__tests__/pending';
import { pendingMoraleOf } from '@/systems/morale/rules/state';

const scene: BattleSceneState = {
    id: 'b1',
    campaignId: 'c1',
    status: 'active',
    round: 1,
    turnIndex: 1,
    version: 1,
    eventSeq: 0,
    pendingChoice: null,
    startedAt: null,
    completedAt: null,
};

const burn = resolved({
    trigger: { event: 'turnEnd' },
    effects: [{ kind: 'dealDamage', amount: 3, target: 'self' }],
});

describe('advanceAfterRemoval', () => {
    const prev = makeParticipant({
        id: 'prev',
        side: ParticipantSide.ALLY,
        hp: 20,
        maxHp: 20,
        abilities: [burn],
    });

    const next = makeParticipant({ id: 'next', side: ParticipantSide.ENEMY });

    it('хід переходить до наступного після прибраного', () => {
        const out = advanceAfterRemoval({
            rules: DEFAULT_RULES,
            participants: [prev, next],
            pending: [],
            scene,
            before: 1,
        });

        expect(out.scene.turnIndex).toBe(1);
    });

    it('кінець ходу попереднього не спрацьовує вдруге', () => {
        const out = advanceAfterRemoval({
            rules: DEFAULT_RULES,
            participants: [prev, next],
            pending: [],
            scene,
            before: 1,
        });

        expect(hpOf(out.participants, 'prev')).toBe(20);

        const plain = advanceTurn({
            rules: DEFAULT_RULES,
            participants: [prev, next],
            pending: [],
            scene: { ...scene, turnIndex: 0 },
        });

        expect(hpOf(plain.participants, 'prev')).toBe(17);
    });

    it('прибраний був першим у черзі — ходить новий перший', () => {
        const out = advanceAfterRemoval({
            rules: DEFAULT_RULES,
            participants: [prev, next],
            pending: [],
            scene: { ...scene, turnIndex: 0 },
            before: 0,
        });

        expect(out.scene.turnIndex).toBe(0);
        expect(hpOf(out.participants, 'prev')).toBe(20);
    });
});

it('removal зберігає death-save event, participants, turn/round і єдиний RNG call', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-10-27T12:00:00Z'));

    try {
        const prev = makeParticipant({ id: 'prev' });

        const base = makeParticipant({
            id: 'dying',
            side: ParticipantSide.ENEMY,
        });

        const dying = withDeathSaves(
            {
                ...base,
                combatStats: {
                    ...base.combatStats,
                    currentHp: 0,
                    status: 'unconscious' as const,
                },
            },
            { successes: 0, failures: 0, stable: false }
        );

        const rng = vi.fn(() => 0.99);

        const result = advanceAfterRemoval({
            participants: [prev, dying],
            pending: [],
            scene,
            before: 1,
            rules: {
                ...DEFAULT_RULES,
                deathSaves: { enabled: true, unitsDieAtZero: true },
            },
            rng,
        });

        expect(rng).toHaveBeenCalledTimes(1);
        expect({
            result,
            rngCalls: rng.mock.results.map((r) => r.value),
        }).toMatchSnapshot();
        expect(result.scene).toMatchObject({ round: 1, turnIndex: 1 });
    } finally {
        vi.useRealTimers();
    }
});

it('removal з відкладеною мораллю скидає слот у патчі сцени', () => {
    const rules = {
        ...DEFAULT_RULES,
        system: { key: 'dnd5e', modules: ['morale'] },
        morale: { enabled: true, cap: 4 },
    } as typeof DEFAULT_RULES;

    const sceneState = pendingSlot({
        participantId: 'ghost',
        d10Roll: 1,
        moraleResult: {
            shouldSkipTurn: false,
            hasExtraTurn: false,
            moralePositive: true,
            message: '',
        },
    });

    const scene0 = { ...scene, sceneState };

    const out = advanceAfterRemoval({
        rules,
        participants: [
            makeParticipant({ id: 'a' }),
            makeParticipant({ id: 'b' }),
        ],
        pending: [],
        scene: scene0,
        before: 1,
    });

    expect(
        pendingMoraleOf(applyScenePatch(scene0, out.scene).sceneState)
    ).toBeNull();
});

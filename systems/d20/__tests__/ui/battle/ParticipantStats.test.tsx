// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { ParticipantStats } from '@/systems/d20/ui/battle/ParticipantStats';

const scene = vi.hoisted(() => ({ battle: {} as Record<string, unknown> }));

vi.mock('@/lib/hooks/battle', () => ({
    useBattleSceneData: () => scene,
}));

const target = () => {
    const p = createMockParticipant();

    return {
        ...p,
        basicInfo: { ...p.basicInfo, id: 'goblin' },
        combatStats: { ...p.combatStats, armorClass: 15 },
    };
};

const attack = (total: number, hit: boolean, round: number) => ({
    type: 'attack',
    round,
    actorName: 'Hero',
    targets: [{ participantId: 'goblin' }],
    actionDetails: { attackRoll: { total, hit } },
});

describe('d20 ParticipantStats', () => {
    afterEach(cleanup);

    it('exact: shows the effective armor class and no evidence', () => {
        scene.battle = { initiativeOrder: [], battleLog: [], knowledge: {} };

        render(<ParticipantStats participant={target()} exact />);

        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText('battle.details.ac')).toBeInTheDocument();
        expect(screen.queryByText(/evidence/)).toBeNull();
    });

    it('hidden: unknown armor class renders a question mark', () => {
        scene.battle = { initiativeOrder: [], battleLog: [], knowledge: {} };

        render(<ParticipantStats participant={target()} exact={false} />);

        expect(screen.getByText('?')).toBeInTheDocument();
        expect(
            screen.getByText('battle.details.acBetween')
        ).toBeInTheDocument();
    });

    it('hidden: shows remembered knowledge bounds and evidence lines', () => {
        scene.battle = {
            initiativeOrder: [],
            battleLog: [],
            knowledge: {
                goblin: {
                    ac: {
                        min: 12,
                        max: 14,
                        evidence: [
                            {
                                actorName: 'Hero',
                                total: 13,
                                hit: true,
                                round: 2,
                            },
                            {
                                actorName: 'Mage',
                                total: 11,
                                hit: false,
                                round: 3,
                            },
                        ],
                    },
                    traits: [],
                },
            },
        };

        render(<ParticipantStats participant={target()} exact={false} />);

        expect(screen.getByText('12–14')).toBeInTheDocument();
        expect(screen.getAllByText(/battle\.details\.evidence/)).toHaveLength(
            2
        );
        expect(
            screen.getByText(/"hit":"miss","total":11,"actor":"Mage","round":3/)
        ).toBeInTheDocument();
    });

    it('exact: never lists evidence even when knowledge exists', () => {
        scene.battle = {
            initiativeOrder: [],
            battleLog: [attack(10, true, 1)],
            knowledge: {
                goblin: {
                    ac: {
                        min: 10,
                        evidence: [
                            { actorName: 'H', total: 10, hit: true, round: 1 },
                        ],
                    },
                    traits: [],
                },
            },
        };

        render(<ParticipantStats participant={target()} exact />);

        expect(screen.queryByText(/evidence/)).toBeNull();
    });
});

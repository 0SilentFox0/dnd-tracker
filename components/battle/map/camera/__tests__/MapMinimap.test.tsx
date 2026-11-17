// @vitest-environment happy-dom
import { cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapMinimap } from '../MapMinimap';

import { CombatStatus, ParticipantSide } from '@/lib/constants/battle';
import { render } from '@/lib/i18n/test/render-uk';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

afterEach(() => {
    cleanup();
    localStorage.clear();
});

vi.unmock('next-intl');

const map: BattleMapConfig = {
    cols: 10,
    rows: 5,
    background: null,
    opacity: 0.3,
    blocked: ['2:1'],
};

const participant = (
    id: string,
    side: ParticipantSide,
    x: number
): BattleParticipant => {
    const base = createMockParticipant();

    return {
        ...base,
        basicInfo: { ...base.basicInfo, id, side },
        battleData: { ...base.battleData, position: { x, y: 2 } },
        combatStats: { ...base.combatStats, status: CombatStatus.ACTIVE },
    };
};

describe('MapMinimap', () => {
    it('maps pointer position to normalized coordinates and renders participants and fog', () => {
        const onPick = vi.fn();

        const people = [
            participant('ally', ParticipantSide.ALLY, 1),
            participant('enemy', ParticipantSide.ENEMY, 8),
        ];

        const { container } = render(
            <MapMinimap
                map={map}
                win={{ x: 0, y: 0, cols: 10, rows: 5 }}
                participants={people}
                viewport={{ x: 0.1, y: 0.1, w: 0.4, h: 0.5 }}
                onPick={onPick}
                hiddenCells={['3:2']}
                phone={false}
            />
        );

        const svg = container.querySelector(
            'svg[data-map-minimap]'
        ) as SVGSVGElement;

        vi.spyOn(svg, 'getBoundingClientRect').mockReturnValue({
            left: 20,
            top: 30,
            width: 160,
            height: 80,
            right: 180,
            bottom: 110,
            x: 20,
            y: 30,
            toJSON: () => ({}),
        });
        expect(
            container.querySelectorAll('[data-minimap-participant]')
        ).toHaveLength(2);
        expect(container.querySelector('[data-minimap-fog]')).not.toBeNull();
        expect(svg.querySelectorAll('path')).toHaveLength(2);

        const event = new PointerEvent('pointerdown', {
            bubbles: true,
            pointerId: 1,
        });

        Object.defineProperties(event, {
            clientX: { value: 100 },
            clientY: { value: 70 },
        });
        fireEvent(svg, event);
        expect(onPick).toHaveBeenCalledWith(0.5, 0.5);
    });

    it('starts collapsed on phones', () => {
        const { getByRole, queryByRole } = render(
            <MapMinimap
                map={map}
                win={{ x: 0, y: 0, cols: 10, rows: 5 }}
                participants={[]}
                viewport={{ x: 0, y: 0, w: 1, h: 1 }}
                onPick={vi.fn()}
                phone
            />
        );

        expect(getByRole('button', { name: 'Показати мінімапу' })).toBeTruthy();
        expect(queryByRole('img', { name: 'Мінімапа' })).toBeNull();
    });
});

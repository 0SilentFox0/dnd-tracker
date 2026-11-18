// @vitest-environment happy-dom
import { cleanup, fireEvent } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapStage, type MapStageProps } from '../MapStage';

import { render } from '@/lib/i18n/test/render-uk';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig } from '@/types/battle-grid';

vi.unmock('next-intl');

afterEach(cleanup);

const base = createMockParticipant();

const at = (id: string, x: number, y: number): BattleParticipant => ({
    ...base,
    basicInfo: { ...base.basicInfo, id, name: id, avatar: undefined },
    battleData: { ...base.battleData, position: { x, y }, reserved: false },
});

const map: BattleMapConfig = { cols: 4, rows: 3, background: null, opacity: 0.3 };

const props = (overrides: Partial<MapStageProps> = {}): MapStageProps => ({
    map,
    participants: [at('hero', 0, 0), at('orc', 3, 2)],
    editing: { mode: null },
    layout: {
        win: { x: 0, y: 0 },
        size: { width: 400, height: 300 },
        pxPerUnit: 1,
        rotated: false,
        phone: false,
        window: null,
    },
    interaction: {
        painting: false,
        preview: new Set<string>(),
        svgRef: { current: null },
        onStrokeStart: vi.fn(),
        wasDragged: () => false,
    },
    ...overrides,
});

describe('MapStage', () => {
    it('renders the grid and one token per placed participant', () => {
        const { container } = render(<MapStage {...props()} />);

        expect(container.querySelector('svg[data-fx-grid]')).not.toBeNull();
        expect(container.querySelector('[data-fx-participant="hero"]')).not.toBeNull();
        expect(container.querySelector('[data-fx-participant="orc"]')).not.toBeNull();
    });

    it('leaves out reserve participants', () => {
        const reserve = at('bench', 1, 1);

        reserve.battleData.reserved = true;

        const { container } = render(
            <MapStage {...props({ participants: [at('hero', 0, 0), reserve] })} />
        );

        expect(container.querySelector('[data-fx-participant="bench"]')).toBeNull();
    });

    it('forwards a token click unless the pointer was dragged', () => {
        const onTokenClick = vi.fn();

        const first = render(
            <MapStage {...props({ actions: { onTokenClick } })} />
        );

        fireEvent.click(
            first.container.querySelector('[data-fx-participant="hero"]') as Element
        );
        expect(onTokenClick).toHaveBeenCalledWith('hero');

        cleanup();
        onTokenClick.mockClear();

        const dragged = props({ actions: { onTokenClick } });

        dragged.interaction.wasDragged = () => true;

        const second = render(<MapStage {...dragged} />);

        fireEvent.click(
            second.container.querySelector('[data-fx-participant="hero"]') as Element
        );
        expect(onTokenClick).not.toHaveBeenCalled();
    });

    it('mounts the edge editor only while an edge tool is active', () => {
        const idle = render(<MapStage {...props()} />);

        expect(idle.container.querySelector('[data-edge-editor]')).toBeNull();

        cleanup();

        const editing = render(
            <MapStage
                {...props({
                    editing: {
                        mode: null,
                        edges: { existing: new Set(), onCommit: vi.fn() },
                    },
                })}
            />
        );

        expect(editing.container.querySelector('[data-edge-editor]')).not.toBeNull();
    });

    it('is wrapped in React.memo', () => {
        expect((MapStage as unknown as { $$typeof: symbol }).$$typeof).toBe(
            Symbol.for('react.memo')
        );
    });
});

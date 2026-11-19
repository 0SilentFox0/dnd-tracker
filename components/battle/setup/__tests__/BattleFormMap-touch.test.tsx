// @vitest-environment happy-dom
import { useEffect } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { BattleFormMap } from '@/components/battle/setup/form/BattleFormMap';
import { ConfirmProvider } from '@/components/ui/confirm-dialog';
import { useBattleMapEditor } from '@/lib/hooks/battles/setup/useBattleMapEditor';

vi.mock('next/image', () => ({
    default: ({ src }: { src: string }) => <i data-bg={src} />,
}));

const touch = vi.hoisted(() => ({ value: false }));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useCoarsePointer: () => touch.value,
    useImageSize: (src: string | null) =>
        src ? { width: 1980, height: 1200 } : null,
}));
vi.stubGlobal(
    'ResizeObserver',
    class {
        constructor(
            private cb: (
                e: { contentRect: { width: number; height: number } }[]
            ) => void
        ) {}
        observe() {
            this.cb([{ contentRect: { width: 800, height: 600 } }]);
        }
        disconnect() {}
        unobserve() {}
    }
);

const seen = vi.hoisted(() => ({
    editor: null as unknown as ReturnType<
        typeof import('@/lib/hooks/battles/setup/useBattleMapEditor').useBattleMapEditor
    >,
}));

function Harness() {
    const editor = useBattleMapEditor(null);

    useEffect(() => {
        seen.editor = editor;
    });

    return (
        <ConfirmProvider>
            <BattleFormMap editor={editor} />
        </ConfirmProvider>
    );
}

afterEach(cleanup);

afterEach(cleanup);

describe('палітра ребер у формі карти', () => {
    const enable = () =>
        fireEvent.click(
            screen.getByRole('switch', { name: 'battleSetup.map.enabled' })
        );

    it('на десктопі є кнопки ребер і немає підказки', () => {
        touch.value = false;
        render(<Harness />);
        enable();

        expect(screen.getByText('battleSetup.map.edgeDrawing')).toBeTruthy();
        expect(
            screen.queryByText('battleSetup.map.edgesDesktopOnly')
        ).toBeNull();
    });

    it("на дотику замість ребер — підказка про комп'ютер", () => {
        touch.value = true;
        render(<Harness />);
        enable();

        expect(screen.queryByText('battleSetup.map.edgeDrawing')).toBeNull();
        expect(
            screen.getByText('battleSetup.map.edgesDesktopOnly')
        ).toBeTruthy();
    });
});

// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapEditorScreen } from '../MapEditorScreen';

const touch = vi.hoisted(() => ({ value: false }));

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<object>()),
    useCoarsePointer: () => touch.value,
    useUnsavedChangesGuard: () => undefined,
}));
vi.mock('@/lib/hooks/battle-maps', () => ({
    useBattleMap: () => ({ isPending: true, isError: false }),
}));
vi.mock('next/link', () => ({
    default: ({
        children,
        href,
    }: {
        children: React.ReactNode;
        href: string;
    }) => <a href={href}>{children}</a>,
}));

afterEach(cleanup);

describe('MapEditorScreen', () => {
    it('on touch devices shows the desktop-only notice instead of the editor', () => {
        touch.value = true;
        render(<MapEditorScreen campaignId="c1" mapId="m1" />);

        expect(screen.getByText('maps.editor.desktopOnly')).toBeTruthy();
        expect(
            screen.getByRole('link', { name: /maps.editor.back/ })
        ).toBeTruthy();
    });

    it('on desktop does not show the notice', () => {
        touch.value = false;
        render(<MapEditorScreen campaignId="c1" mapId="m1" />);

        expect(screen.queryByText('maps.editor.desktopOnly')).toBeNull();
    });
});

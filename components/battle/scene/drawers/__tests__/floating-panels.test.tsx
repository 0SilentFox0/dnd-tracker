// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/hooks/common', async (orig) => ({
    ...(await orig<typeof import('@/lib/hooks/common')>()),
    useMediaQuery: () => true,
}));

import { BattleDrawer } from '../BattleDrawer';
import { DrawerRail } from '../DrawerRail';

import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';

vi.unmock('next-intl');

afterEach(cleanup);

describe('floating panels', () => {
    it('collapse button closes the panel', () => {
        const onOpenChange = vi.fn();

        render(
            <BattleDrawer
                drawer="log"
                open
                onOpenChange={onOpenChange}
                title="Журнал"
            >
                <p>body</p>
            </BattleDrawer>
        );

        fireEvent.click(screen.getByRole('button', { name: 'Згорнути' }));
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('Escape inside the panel closes it', () => {
        const onOpenChange = vi.fn();

        render(
            <BattleDrawer
                drawer="log"
                open
                onOpenChange={onOpenChange}
                title="Журнал"
            >
                <p>body</p>
            </BattleDrawer>
        );

        fireEvent.keyDown(screen.getByText('body'), { key: 'Escape' });
        expect(onOpenChange).toHaveBeenCalledWith(false);
    });

    it('a collapsed log leaves no panel and the rail button brings it back', () => {
        const onToggle = vi.fn();

        const { wrapper } = fakeScene({});

        render(
            <>
                <BattleDrawer
                    drawer="log"
                    open={false}
                    onOpenChange={vi.fn()}
                    title="Журнал"
                >
                    <p>body</p>
                </BattleDrawer>
                <DrawerRail active={null} onToggle={onToggle} />
            </>,
            { wrapper }
        );

        expect(screen.queryByText('body')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Журнал' }));
        expect(onToggle).toHaveBeenCalledWith('log');
    });

    it('keepMounted keeps a closed panel hidden in the DOM', () => {
        render(
            <BattleDrawer
                drawer="tools"
                open={false}
                onOpenChange={vi.fn()}
                title="Інструменти"
                keepMounted
            >
                <p>body</p>
            </BattleDrawer>
        );

        expect(screen.getByText('body').closest('section')?.hidden).toBe(true);
    });
});

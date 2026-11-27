// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { HudShellHeader } from '@/components/hud/shell/HudShellHeader';

afterEach(cleanup);

describe('HudShellHeader', () => {
    it('renders breadcrumb and actions in one row without a menu by default', () => {
        render(
            <HudShellHeader
                breadcrumb={<nav>crumbs</nav>}
                actions={<span>acts</span>}
            />
        );

        expect(screen.getByText('crumbs')).toBeTruthy();
        expect(screen.getByText('acts')).toBeTruthy();
        expect(screen.queryByRole('button')).toBeNull();
        expect(
            screen.getByRole('banner').firstElementChild?.className
        ).toContain('h-14');
    });

    it('renders the menu trigger with its label', () => {
        render(
            <HudShellHeader
                menu={{ label: 'menu', content: <div>items</div> }}
                breadcrumb={null}
                actions={null}
            />
        );

        expect(screen.getByRole('button', { name: 'menu' })).toBeTruthy();
    });

    it('gives the menu trigger a fixed id so SSR and client agree', () => {
        render(
            <HudShellHeader
                menu={{ label: 'menu', content: <div>items</div> }}
                breadcrumb={null}
                actions={null}
            />
        );

        expect(screen.getByRole('button', { name: 'menu' }).id).toBe(
            'hud-shell-menu-trigger'
        );
    });
});

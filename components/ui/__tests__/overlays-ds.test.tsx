// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { mockMatchMedia } from './match-media';

import { ResponsiveDialog } from '@/components/ui/responsive-dialog';

describe('overlays', () => {
    afterEach(cleanup);

    it('desktop ResponsiveDialog has a dialog role and a labelled close button', () => {
        mockMatchMedia(false);
        render(
            <ResponsiveDialog open onOpenChange={vi.fn()} title="Title">
                body
            </ResponsiveDialog>
        );

        expect(screen.getByRole('dialog')).toBeInTheDocument();
        expect(
            screen.getByRole('button', { name: 'common.ui.close' })
        ).toBeInTheDocument();
    });
});

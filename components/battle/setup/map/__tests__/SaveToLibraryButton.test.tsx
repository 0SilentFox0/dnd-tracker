// @vitest-environment happy-dom
import {
    cleanup,
    fireEvent,
    render,
    screen,
    waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { SaveToLibraryButton } from '../SaveToLibraryButton';

import type { BattleMapEditor } from '@/lib/hooks/battles';

const save = vi.hoisted(() => vi.fn());

const notify = vi.hoisted(() => vi.fn());

vi.mock('next-intl', () => ({
    useTranslations: (ns?: string) => (key: string) => `${ns}.${key}`,
}));

vi.mock('@/lib/hooks/battle-maps', () => ({
    useSaveMapToLibrary: () => ({ save, isPending: false }),
}));

vi.mock('@/lib/hooks/common', () => ({ useNotify: () => notify }));

vi.mock('@/components/ui/responsive-dialog', () => ({
    ResponsiveDialog: ({
        open,
        children,
        footer,
    }: {
        open: boolean;
        children: React.ReactNode;
        footer: React.ReactNode;
    }) =>
        open ? (
            <div>
                {children}
                {footer}
            </div>
        ) : null,
}));

const MAP = { cols: 20, rows: 12, background: null, opacity: 0.35 };

const editor = { state: { value: MAP } } as unknown as BattleMapEditor;

afterEach(() => {
    cleanup();
    vi.clearAllMocks();
});

const open = () =>
    fireEvent.click(
        screen.getByRole('button', {
            name: /battleSetup.map.saveToLibrary.button/,
        })
    );

describe('SaveToLibraryButton', () => {
    it('creates the library map with the entered name', async () => {
        save.mockResolvedValue({ id: 'm1' });

        render(<SaveToLibraryButton campaignId="c1" editor={editor} />);

        open();

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Cave' },
        });
        fireEvent.click(
            screen.getByRole('button', {
                name: 'battleSetup.map.saveToLibrary.submit',
            })
        );

        await waitFor(() => expect(save).toHaveBeenCalledWith(MAP, 'Cave'));
        await waitFor(() => expect(notify).toHaveBeenCalled());
    });

    it('shows the server error inside the dialog', async () => {
        save.mockRejectedValue(new Error('terrain is runtime only'));

        render(<SaveToLibraryButton campaignId="c1" editor={editor} />);

        open();

        fireEvent.change(screen.getByRole('textbox'), {
            target: { value: 'Cave' },
        });
        fireEvent.submit(
            screen.getByRole('textbox').closest('form') as HTMLFormElement
        );

        expect((await screen.findByRole('alert')).textContent).toBe(
            'terrain is runtime only'
        );
        expect(notify).not.toHaveBeenCalled();
    });

    it('is disabled without a map', () => {
        render(
            <SaveToLibraryButton
                campaignId="c1"
                editor={
                    { state: { value: null } } as unknown as BattleMapEditor
                }
            />
        );

        expect(
            screen
                .getByRole('button', {
                    name: /battleSetup.map.saveToLibrary.button/,
                })
                .hasAttribute('disabled')
        ).toBe(true);
    });
});

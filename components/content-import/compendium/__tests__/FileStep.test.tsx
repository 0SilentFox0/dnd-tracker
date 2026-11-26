// @vitest-environment happy-dom
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { FileStep } from '../steps/FileStep';

import type { CompendiumImportController } from '@/lib/hooks/compendium-import';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

vi.unmock('next-intl');
afterEach(cleanup);

const wizard = (selectFile = vi.fn(), error = '') =>
    ({
        state: { busy: false, error, root: null, phase: 'idle' },
        actions: { selectFile, openRun: vi.fn() },
    }) as unknown as CompendiumImportController;

const render = (ui: React.ReactElement) =>
    renderWithIntl(
        <QueryClientProvider client={new QueryClient()}>
            {ui}
        </QueryClientProvider>,
        { locale: 'uk', namespaces: ['common', 'validation', 'compendium'] }
    );

const DROP = 'Перетягніть JSON сюди або виберіть файл';

describe('FileStep', () => {
    it('selects a dropped JSON file and reports it to the owner', async () => {
        const selectFile = vi.fn();

        const onFile = vi.fn();

        await render(
            <FileStep wizard={wizard(selectFile)} file={null} onFile={onFile} />
        );

        const file = new File(['{}'], 'a.json', { type: 'application/json' });

        fireEvent.drop(screen.getByTestId('file-drop-zone'), {
            dataTransfer: { files: [file] },
        });
        expect(selectFile).toHaveBeenCalledWith(file);
        expect(onFile).toHaveBeenCalledWith(file);
    });

    it('shows the file card and clears it on Replace', async () => {
        const onFile = vi.fn();

        await render(
            <FileStep
                wizard={wizard()}
                file={new File(['{}'], 'srd.json')}
                onFile={onFile}
            />
        );
        expect(screen.getByText('srd.json')).toBeTruthy();
        expect(screen.queryByLabelText(DROP)).toBeNull();
        fireEvent.click(screen.getByRole('button', { name: 'Замінити' }));
        expect(onFile).toHaveBeenCalledWith(null);
    });

    it('shows a read error under the zone', async () => {
        await render(
            <FileStep
                wizard={wizard(vi.fn(), 'Bad file')}
                file={null}
                onFile={vi.fn()}
            />
        );
        expect((await screen.findByRole('alert')).textContent).toBe('Bad file');
    });
});

// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { CheckStep } from '../steps/CheckStep';

import type { CompendiumImportController } from '@/lib/hooks/compendium-import';
import { renderWithIntl } from '@/lib/i18n/test/render-with-intl';

vi.unmock('next-intl');
afterEach(cleanup);

const report = (blocked: boolean) => ({
    adapterVersion: '1',
    counts: { created: 1, updated: 0, unchanged: 0, errors: 0 },
    rows: [],
    sources: [],
    editionSummary: {},
    countsByCategory: {},
    issueCounts: {},
    omittedIssues: 0,
    nextActions: blocked
        ? [
              {
                  code: 'UNRESOLVED_REF',
                  severity: 'error',
                  path: 'spell[0]',
                  action: 'Зіставте залежність',
              },
          ]
        : [],
    readyToImport: !blocked,
    readyToPlay: true,
});

const render = (blocked: boolean, phase = 'idle') =>
    renderWithIntl(
        <CheckStep
            campaignId="c"
            wizard={
                {
                    state: {
                        preview: {
                            token: 't',
                            report: report(blocked),
                            graph: [],
                        },
                        options: {},
                        targets: { local: [], templates: [] },
                        busy: false,
                        phase,
                    },
                    actions: {},
                } as unknown as CompendiumImportController
            }
        />,
        { locale: 'uk', namespaces: ['common', 'validation', 'compendium'] }
    );

const tab = (name: RegExp) =>
    screen.getByRole('button', { name }) as HTMLButtonElement;

describe('CheckStep', () => {
    it('opens the dependencies tab when there are blockers', async () => {
        await render(true);
        expect(tab(/^Залежності/).getAttribute('aria-pressed')).toBe('true');
        expect(tab(/^Записи/).getAttribute('aria-pressed')).toBe('false');
    });

    it('opens the records tab when the check is clean', async () => {
        await render(false);
        expect(tab(/^Записи/).getAttribute('aria-pressed')).toBe('true');
    });

    it('switches to dependencies from the blocker link', async () => {
        await render(true);
        fireEvent.click(tab(/^Записи/));
        expect(tab(/^Записи/).getAttribute('aria-pressed')).toBe('true');
        fireEvent.click(
            screen.getByRole('button', { name: 'Перейти до зіставлення' })
        );
        expect(tab(/^Залежності/).getAttribute('aria-pressed')).toBe('true');
    });

    it('shows a skeleton instead of the report while previewing', async () => {
        await render(false, 'previewing');
        expect(screen.queryByText('Можна імпортувати')).toBeNull();
    });
});

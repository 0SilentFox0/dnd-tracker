// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Items, Picks, STATE_CLASS } from '../ProgressionRowView';

import { render } from '@/lib/i18n/test/render-uk';
import type { ProgressionItem, ProgressionRow } from '@/types/classes';

vi.unmock('next-intl');

const item = (over: Partial<ProgressionItem> = {}): ProgressionItem => ({
    key: 'k',
    name: 'Second Wind',
    summary: '',
    ...over,
});

const row = (picks: ProgressionRow['picks']): ProgressionRow => ({
    level: 3,
    state: 'current',
    base: [],
    bySubclass: {},
    picks,
});

describe('progression Items', () => {
    afterEach(cleanup);

    it('shows a dash when there are no items', () => {
        render(<Items items={[]} />);
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('a plain item shows name and summary without an expander', () => {
        render(<Items items={[item({ summary: 'heal 1d10' })]} />);
        expect(screen.getByText('Second Wind')).toBeInTheDocument();
        expect(screen.getByText('heal 1d10')).toBeInTheDocument();
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('an item with a description reveals it on demand', () => {
        render(<Items items={[item({ description: 'Regain HP.' })]} />);

        const trigger = screen.getByRole('button');

        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        fireEvent.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Regain HP.')).toBeInTheDocument();
    });
});

describe('progression Picks', () => {
    afterEach(cleanup);

    it('shows a dash without picks', () => {
        render(<Picks row={row([])} />);
        expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('labels subclass picks by the localized word and appends a count above one', () => {
        render(
            <Picks
                row={row([
                    {
                        key: 'a',
                        kind: 'subclass',
                        label: 'ignored',
                        required: 1,
                        done: null,
                        status: 'open',
                    },
                    {
                        key: 'b',
                        kind: 'skill',
                        label: 'Skills',
                        required: 2,
                        done: 0,
                        status: 'open',
                    } as ProgressionRow['picks'][number],
                ])}
            />
        );
        expect(screen.getByText('Підклас')).toBeInTheDocument();
        expect(screen.queryByText('ignored')).toBeNull();
        expect(screen.getByText('Skills (2)')).toBeInTheDocument();
    });
});

describe('STATE_CLASS', () => {
    it('dims only future levels and rings the current one', () => {
        expect(STATE_CLASS.future).toContain('opacity-50');
        expect(STATE_CLASS.current).toContain('ring-1');
        expect(STATE_CLASS.reached).toBe('');
    });
});

// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { HudForm } from '@/components/hud/form';
import { findInvalidTab } from '@/components/hud/form/reveal-invalid-tab';
import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { Button } from '@/components/ui/button';

afterEach(cleanup);

describe('HudForm', () => {
    it('switches to the tab that holds the first invalid field on submit', () => {
        const onSubmit = vi.fn((e) => e.preventDefault());

        render(
            <HudForm
                id="t-form"
                onSubmit={onSubmit}
                tabs={[
                    {
                        id: 'a',
                        label: 'Основне',
                        content: <input aria-label="ім'я" defaultValue="x" />,
                    },
                    {
                        id: 'b',
                        label: 'Бій',
                        content: (
                            <input aria-label="AC" required defaultValue="" />
                        ),
                    },
                ]}
                actions={<Button type="submit">Зберегти</Button>}
            />
        );

        expect(
            screen
                .getByRole('tab', { name: 'Основне' })
                .getAttribute('data-state')
        ).toBe('active');
        fireEvent.invalid(screen.getByLabelText('AC'));
        expect(
            screen.getByRole('tab', { name: 'Бій' }).getAttribute('data-state')
        ).toBe('active');
    });

    it('keeps the active tab when it already has an invalid field', () => {
        render(
            <HudForm
                id="t-form"
                onSubmit={() => {}}
                tabs={[
                    {
                        id: 'a',
                        label: 'Основне',
                        content: (
                            <input aria-label="ім'я" required defaultValue="" />
                        ),
                    },
                    {
                        id: 'b',
                        label: 'Бій',
                        content: (
                            <input aria-label="AC" required defaultValue="" />
                        ),
                    },
                ]}
                actions={<Button type="submit">Зберегти</Button>}
            />
        );

        fireEvent.invalid(screen.getByLabelText('AC'));
        expect(
            screen
                .getByRole('tab', { name: 'Основне' })
                .getAttribute('data-state')
        ).toBe('active');
    });

    it('lands on the first invalid tab when several tabs are invalid', () => {
        render(
            <HudForm
                id="t-form"
                onSubmit={() => {}}
                tabs={[
                    {
                        id: 'a',
                        label: 'Основне',
                        content: <input aria-label="ім'я" defaultValue="x" />,
                    },
                    {
                        id: 'b',
                        label: 'Бій',
                        content: (
                            <input aria-label="AC" required defaultValue="" />
                        ),
                    },
                    {
                        id: 'c',
                        label: 'Магія',
                        content: (
                            <input aria-label="СЛ" required defaultValue="" />
                        ),
                    },
                ]}
                actions={<Button type="submit">Зберегти</Button>}
            />
        );

        fireEvent.invalid(screen.getByLabelText('AC'));
        fireEvent.invalid(screen.getByLabelText('СЛ'));
        expect(
            screen.getByRole('tab', { name: 'Бій' }).getAttribute('data-state')
        ).toBe('active');
    });

    it('renders actions inside the form', () => {
        render(
            <HudForm
                id="t-form"
                onSubmit={() => {}}
                actions={<Button type="submit">Зберегти</Button>}
            >
                поля
            </HudForm>
        );

        expect(
            screen.getByRole('button', { name: 'Зберегти' }).closest('form')?.id
        ).toBe('t-form');
    });
});

describe('findInvalidTab', () => {
    const build = () => {
        const root = document.createElement('div');

        root.innerHTML =
            '<div data-tab-id="a"><input id="x" value="ok" /></div><div data-tab-id="b"><input id="y" required value="" /></div><div data-tab-id="c"><input id="z" required value="" /></div>';

        return root;
    };

    it("returns the first invalid control's tab in DOM order when the active tab is valid", () => {
        const found = findInvalidTab(build(), 'a');

        expect(found?.owner).toBe('b');
        expect(found?.control.id).toBe('y');
    });

    it('returns null when the active tab has an invalid field', () => {
        expect(findInvalidTab(build(), 'c')).toBeNull();
    });

    it('returns null when everything is valid', () => {
        const root = build();

        root.querySelectorAll('[required]').forEach(
            (el) => ((el as HTMLInputElement).value = 'v')
        );

        expect(findInvalidTab(root, 'a')).toBeNull();
    });
});

describe('HudForm rail and layout', () => {
    beforeEach(() => mockMatchMedia(false));

    const tabs = [
        {
            id: 'a',
            label: 'One',
            content: <input aria-label="name" defaultValue="x" />,
        },
        {
            id: 'b',
            label: 'Two',
            wide: true,
            content: <input aria-label="ac" required defaultValue="" />,
        },
    ];

    it('without actions renders no action bar and shows the error before the tablist', () => {
        const { container } = render(
            <HudForm id="f" onSubmit={() => {}} tabs={tabs} error="boom" />
        );

        expect(container.querySelector('[data-slot="action-bar"]')).toBeNull();

        const alert = screen.getByRole('alert');

        expect(alert.textContent).toBe('boom');
        expect(alert).toHaveAttribute('data-notice');
        expect(
            alert.compareDocumentPosition(screen.getByRole('tablist')) &
                Node.DOCUMENT_POSITION_FOLLOWING
        ).toBeTruthy();
    });

    it('marks the form when the active tab is wide', () => {
        const { container } = render(
            <HudForm id="f" onSubmit={() => {}} tabs={tabs} />
        );

        const form = container.querySelector('form');

        expect(form?.getAttribute('data-wide-tab')).toBeNull();
        fireEvent.invalid(screen.getByLabelText('ac'));
        expect(form?.getAttribute('data-wide-tab')).toBe('true');
    });

    it('reveals the tab of an invalid field under the rail variant', () => {
        render(
            <HudForm
                id="f"
                onSubmit={() => {}}
                tabs={tabs}
                tabStyles={{ variant: 'rail' }}
            />
        );

        fireEvent.invalid(screen.getByLabelText('ac'));
        expect(
            screen.getByRole('tab', { name: 'Two' }).getAttribute('data-state')
        ).toBe('active');
    });

    it('reveals a tab whose trigger is hidden', () => {
        render(
            <HudForm
                id="f"
                onSubmit={() => {}}
                tabs={tabs.map((tab) => ({ ...tab, hidden: tab.id === 'b' }))}
                tabStyles={{ variant: 'rail' }}
            />
        );

        expect(screen.queryByRole('tab', { name: 'Two' })).toBeNull();
        fireEvent.invalid(screen.getByLabelText('ac'));
        expect(
            screen
                .getByLabelText('ac')
                .closest('[data-tab-id]')
                ?.getAttribute('data-state')
        ).toBe('active');
    });
});

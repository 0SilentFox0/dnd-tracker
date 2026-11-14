// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { ModuleStep } from '../system/ModuleStep';

import '@/components/ui/__tests__/match-media';
import type { ModuleToggle } from '@/lib/utils/rules/systems/catalog';

afterEach(cleanup);

const renderToggles = (toggles: ModuleToggle[]) =>
    render(<ModuleStep toggles={toggles} set={vi.fn()} isDisabled={false} />);

const switchOf = (id: string) =>
    document.getElementById(`rules-module-${id}`) as HTMLElement;

describe('ModuleStep', () => {
    it('a module without its required module is disabled and says why', () => {
        renderToggles([
            {
                id: 'morale',
                active: false,
                available: false,
                reason: { code: 'missingRequires', module: 'skilltrees' },
                toggle: 'free',
            },
        ]);

        expect(switchOf('morale').hasAttribute('disabled')).toBe(true);
        expect(
            screen.getByText(/rules\.system\.modules\.requires/)
        ).toBeTruthy();
    });

    it('a conflict is disabled with the conflict message', () => {
        renderToggles([
            {
                id: 'morale',
                active: false,
                available: false,
                reason: { code: 'conflict', module: 'retaliation' },
                toggle: 'free',
            },
        ]);

        expect(switchOf('morale').hasAttribute('disabled')).toBe(true);
        expect(
            screen.getByText(/rules\.system\.modules\.conflicts/)
        ).toBeTruthy();
    });

    it('a module another one needs cannot be switched off', () => {
        renderToggles([
            {
                id: 'morale',
                active: true,
                available: false,
                reason: { code: 'requiredBy', module: 'retaliation' },
                toggle: 'free',
            },
        ]);

        expect(switchOf('morale').hasAttribute('disabled')).toBe(true);
        expect(
            screen.getByText(/rules\.system\.modules\.requiredBy/)
        ).toBeTruthy();
    });
});

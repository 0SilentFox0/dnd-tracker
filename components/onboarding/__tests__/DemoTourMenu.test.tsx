// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ startTour: vi.fn() }));

vi.mock('@/components/onboarding/DemoTourCoordinator', () => ({
    useDemoTour: () => ({ startTour: mocks.startTour, activeTour: null }),
}));
vi.mock('@/lib/hooks/onboarding', () => ({
    useOnboardingFlags: () => ({ flags: {} }),
}));
vi.mock('@/lib/i18n/use-translator', () => ({
    useTranslator: () => (key: string) => key,
}));

import { DemoTourMenu } from '@/components/onboarding/DemoTourMenu';

afterEach(cleanup);

describe('DemoTourMenu', () => {
    it('shows every demo tour in a single column', () => {
        render(<DemoTourMenu />);

        const list = screen.getByRole('list');

        expect(list.className).toContain('grid-cols-1');
        expect(list.className).not.toContain('sm:grid-cols-2');
        expect(screen.getAllByRole('listitem')).toHaveLength(7);
    });
});

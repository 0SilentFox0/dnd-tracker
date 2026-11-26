// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapQuickStart } from '../MapQuickStart';

vi.mock('next-intl', () => ({
    useTranslations: (ns?: string) => (key: string) => `${ns}.${key}`,
}));

afterEach(cleanup);

describe('MapQuickStart', () => {
    it.each(['image', 'uvtt', 'grid'] as const)('reports %s', (key) => {
        const onPick = vi.fn();

        render(<MapQuickStart onPick={onPick} />);

        fireEvent.click(
            screen.getByRole('button', {
                name: `battleSetup.map.quickStart.${key}`,
            })
        );

        expect(onPick).toHaveBeenCalledWith(key);
    });
});

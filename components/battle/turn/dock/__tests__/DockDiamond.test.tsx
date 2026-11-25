// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { DockDiamond } from '../DockDiamond';

import { render } from '@/lib/i18n/test/render-uk';

describe('DockDiamond', () => {
    afterEach(cleanup);

    it('ready: no spent text', () => {
        const { container } = render(
            <DockDiamond label="Дія" spent={false} spentLabel="використано" />
        );

        expect(
            container.querySelector('[data-state="ready"]')
        ).not.toBeNull();
        expect(screen.queryByText('використано')).toBeNull();
    });

    it('spent: grey state with a text label, not colour only', () => {
        const { container } = render(
            <DockDiamond label="Дія" spent spentLabel="використано" />
        );

        expect(container.querySelector('[data-state="spent"]')).not.toBeNull();
        expect(screen.getByText('використано')).toBeTruthy();
        expect(screen.getByText('Дія')).toBeTruthy();
    });
});

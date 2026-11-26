// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MapSourceChoice } from '../MapSourceChoice';

vi.mock('next-intl', () => ({
    useTranslations: (ns?: string) => (key: string) => `${ns}.${key}`,
}));

afterEach(cleanup);

describe('MapSourceChoice', () => {
    it('reports the picked source', () => {
        const onChange = vi.fn();

        render(
            <MapSourceChoice value="none" onChange={onChange} libraryVisible />
        );

        fireEvent.click(
            screen.getByRole('radio', {
                name: 'battleSetup.map.source.library',
            })
        );

        expect(onChange).toHaveBeenCalledWith('library');
    });

    it('offers two options without a library', () => {
        render(
            <MapSourceChoice
                value="own"
                onChange={vi.fn()}
                libraryVisible={false}
            />
        );

        expect(screen.getAllByRole('radio')).toHaveLength(2);
    });
});

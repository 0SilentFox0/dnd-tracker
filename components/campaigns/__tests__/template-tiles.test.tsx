// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { type TemplateTile, TemplateTiles } from '../templates/TemplateTiles';

afterEach(cleanup);

describe('TemplateTiles SRD source', () => {
    it.each(['en', null])(
        'links only canonical English SRD (%s) without offering a translated preview; private same-key content stays separate',
        (locale) => {
            const srd = (id: string, locale: string | null): TemplateTile => ({
                id,
                name: '5e SRD 5.2',
                description: 'English source',
                locale,
                templateKey: 'srd-5.2',
                kind: 'template',
                visibility: 'official',
            });

            render(
                <TemplateTiles
                    templates={[
                        srd('canonical', locale),
                        srd('legacy', 'uk'),
                        {
                            ...srd('private', 'uk'),
                            name: 'My copy',
                            visibility: 'private',
                        },
                    ]}
                />
            );

            expect(
                screen.getByRole('link', { name: /5e SRD/ })
            ).toHaveAttribute('href', '/campaigns/canonical');
            expect(
                screen.getByRole('link', { name: /My copy/ })
            ).toHaveAttribute('href', '/campaigns/private');
            expect(screen.queryByRole('combobox')).toBeNull();
            expect(screen.getByText('English')).toBeTruthy();
        }
    );
});

describe('TemplateTiles Grim source', () => {
    it('shows the canonical English Grim and hides the legacy uk one', () => {
        const grim = (id: string, locale: string | null): TemplateTile => ({
            id,
            name: 'Grim d100',
            description: 'd',
            locale,
            templateKey: 'grim-d100',
            kind: 'template',
            visibility: 'official',
        });

        render(
            <TemplateTiles
                templates={[grim('canonical', 'en'), grim('legacy', 'uk')]}
            />
        );

        expect(screen.getAllByRole('link')).toHaveLength(1);
        expect(screen.getByText('English')).toBeTruthy();
    });
});

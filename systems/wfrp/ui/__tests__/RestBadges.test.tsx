// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RestBadges } from '../RestBadges';

import { render } from '@/lib/i18n/test/render-uk';
import type { CharacterSheet } from '@/types/characters';

vi.unmock('next-intl');

describe('RestBadges', () => {
    afterEach(cleanup);

    it('shows Fortune and Fate as separate pills', () => {
        render(
            <RestBadges
                sheet={
                    {
                        systemSlot: {
                            key: 'wfrp',
                            data: {
                                fortune: 2,
                                fortuneMax: 4,
                                fate: 3,
                                fateLeft: 1,
                            },
                        },
                    } as unknown as CharacterSheet
                }
            />
        );

        expect(screen.getByText('Удача 2/4')).toBeInTheDocument();
        expect(screen.getByText('Доля 1')).toBeInTheDocument();
    });
});

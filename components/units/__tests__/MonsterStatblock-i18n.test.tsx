// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { MonsterStatblock } from '@/components/units/MonsterStatblock';

afterEach(cleanup);

describe('MonsterStatblock', () => {
    it('uses translation keys for labels', () => {
        render(
            <MonsterStatblock
                block={
                    {
                        languages: 'x',
                        telepathy: 30,
                        movement: { hover: true, fly: 30 },
                        senses: { passivePerception: 12 },
                    } as never
                }
            />
        );

        expect(screen.getByText(/gameTerms\.monster\.languages/)).toBeTruthy();
        expect(screen.getByText(/gameTerms\.monster\.telepathy/)).toBeTruthy();
        expect(
            screen.getByText(/gameTerms\.monster\.passivePerception/)
        ).toBeTruthy();
        expect(screen.getByText(/gameTerms\.monster\.hover/)).toBeTruthy();
    });
});

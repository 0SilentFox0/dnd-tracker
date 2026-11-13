// @vitest-environment happy-dom
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import { render } from '@/lib/i18n/test/render-uk';
import { createMockParticipant } from '@/lib/utils/battle/__tests__/fixtures/mock-participant';
import { SlotGrid } from '@/systems/d20/ui/battle/SlotGrid';

vi.unmock('next-intl');

describe('SlotGrid', () => {
    it("слоти: п'ять кіл римськими, порожнє коло — без кристалів", () => {
        const b = createMockParticipant();

        render(
            <SlotGrid
                participant={{
                    ...b,
                    spellcasting: {
                        ...b.spellcasting,
                        spellSlots: { '1': { max: 3, current: 2 } },
                    },
                }}
            />
        );

        for (const r of ['I', 'II', 'III', 'IV', 'V'])
            expect(screen.getByText(r)).toBeTruthy();
        expect(screen.getByLabelText('I коло: 2 з 3')).toBeTruthy();
    });
});

// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { sheetFixture } from '../../__tests__/sheet-fixture';
import { ProfileProvider } from '../../ProfileContext';
import { SheetRollDialog } from '../SheetRollDialog';

import { mockMatchMedia } from '@/components/ui/__tests__/match-media';
import { renderWithConfirm } from '@/components/ui/__tests__/render-with-confirm';
import type { SheetRest } from '@/types/characters';

const h = vi.hoisted(() => ({
    roll: {
        mutateAsync: vi.fn(async () => ({
            kind: 'percentile',
            label: 'Dodge',
            rawRoll: 40,
            roll: 40,
            reversed: false,
            target: 45,
            sl: 0,
            outcome: 'success',
            auto: null,
            difficulty: 'hard',
            mode: 'normal',
        })),
        isPending: false,
    },
}));

vi.mock('@/lib/hooks/characters', async (orig) => ({
    ...(await orig<object>()),
    useSheetRoll: () => h.roll,
}));
vi.mock('@/components/battle/fx/dice/DiceStage', () => ({
    DiceStage: () => null,
}));
vi.mock('@/components/ui/select-field', () => ({
    SelectField: ({
        value,
        options,
        onValueChange,
    }: {
        value: string;
        options: { value: string; label: string }[];
        onValueChange: (v: string) => void;
    }) => (
        <select
            aria-label="difficulty"
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
        >
            {options.map((o) => (
                <option key={o.value} value={o.value}>
                    {o.label}
                </option>
            ))}
        </select>
    ),
}));

const rest: SheetRest = {
    persist: true,
    hp: null,
    dead: false,
    exhaustion: 0,
    shortRestOpen: false,
    hitDice: [],
    charges: [],
    arcaneRecovery: null,
    inspiration: true,
    xp: null,
};

describe('SheetRollDialog percentile', () => {
    afterEach(() => {
        cleanup();
        h.roll.mutateAsync.mockClear();
    });

    it('wfrp: sends the chosen difficulty with the test and renders the percentile result', async () => {
        mockMatchMedia(false);
        renderWithConfirm(
            <ProfileProvider
                campaignId="c"
                characterId="ch"
                sheet={{ ...sheetFixture, system: 'wfrp', rest }}
                canEdit={false}
            >
                <SheetRollDialog
                    request={{
                        label: 'Dodge',
                        subject: { kind: 'test', skill: 'dodge' },
                    }}
                    onClose={() => {}}
                />
            </ProfileProvider>
        );

        expect(screen.queryByRole('switch')).toBeNull();

        fireEvent.change(screen.getByLabelText('difficulty'), {
            target: { value: 'hard' },
        });
        fireEvent.click(
            screen.getByRole('button', { name: 'rest.sheetRoll.roll' })
        );

        await waitFor(() => expect(screen.getByText('40')).toBeTruthy());
        expect(h.roll.mutateAsync).toHaveBeenCalledWith({
            kind: 'test',
            skill: 'dodge',
            difficulty: 'hard',
        });
    });

    it('d20 requests never carry a difficulty', async () => {
        mockMatchMedia(false);
        renderWithConfirm(
            <ProfileProvider
                campaignId="c"
                characterId="ch"
                sheet={{ ...sheetFixture, rest }}
                canEdit={false}
            >
                <SheetRollDialog
                    request={{
                        label: 'Stealth',
                        subject: { kind: 'check', skill: 'stealth' },
                    }}
                    onClose={() => {}}
                />
            </ProfileProvider>
        );

        fireEvent.click(
            screen.getByRole('button', { name: 'rest.sheetRoll.roll' })
        );

        await waitFor(() =>
            expect(h.roll.mutateAsync).toHaveBeenCalledWith({
                kind: 'check',
                skill: 'stealth',
            })
        );
    });
});

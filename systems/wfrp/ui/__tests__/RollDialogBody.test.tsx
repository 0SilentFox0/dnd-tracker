// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RollDialogBody } from '../RollDialogBody';

import type { SheetRollResult } from '@/types/characters';

const sheetFortune = vi.hoisted(() => vi.fn((): unknown => null));

vi.mock('@/systems/wfrp/hooks', () => ({ useSheetFortune: sheetFortune }));

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

const request = {
    label: 'Dodge',
    subject: { kind: 'test' as const, skill: 'dodge' },
};

const result: SheetRollResult = {
    kind: 'percentile',
    label: 'Dodge',
    rawRoll: 12,
    roll: 21,
    reversed: true,
    target: 45,
    sl: 2,
    outcome: 'success',
    auto: 'success',
    difficulty: 'challenging',
    mode: 'normal',
};

describe('wfrp RollDialogBody', () => {
    afterEach(cleanup);

    it('offers Critical and a hit location for notFail', () => {
        const set = vi.fn();

        sheetFortune.mockReturnValueOnce({
            left: 1,
            fateLeft: 1,
            value: 'notFail',
            onChange: () => {},
            advantageLabel: true,
            notFail: { critical: true, location: undefined, set },
        });
        render(
            <RollDialogBody
                extra={{ fortune: 'notFail', critical: true }}
                setExtra={() => {}}
                request={request}
                result={null}
                difficulty="challenging"
                setDifficulty={() => {}}
            />
        );
        fireEvent.click(
            screen.getByText('battleWfrp.ui.fortune.locations.rightArm')
        );

        expect(set).toHaveBeenCalledWith(true, 'rightArm');
    });

    it('lets the DM pick a difficulty', () => {
        const setDifficulty = vi.fn();

        render(
            <RollDialogBody
                extra={{}}
                setExtra={() => {}}
                request={request}
                result={null}
                difficulty="challenging"
                setDifficulty={setDifficulty}
            />
        );
        fireEvent.change(screen.getByLabelText('difficulty'), {
            target: { value: 'hard' },
        });

        expect(setDifficulty).toHaveBeenCalledWith('hard');
    });

    it('shows roll, target, SL, outcome and the reversed and auto marks', () => {
        render(
            <RollDialogBody
                extra={{}}
                setExtra={() => {}}
                request={request}
                result={result}
                difficulty="challenging"
                setDifficulty={() => {}}
            />
        );

        expect(screen.getByText('21')).toBeTruthy();
        expect(screen.getByText(/rest\.sheetRoll\.target/)).toBeTruthy();
        expect(
            screen.getByText(/gameTerms\.testOutcome\.success/)
        ).toBeTruthy();
        expect(screen.getByTitle('rest.sheetRoll.reversed')).toBeTruthy();
        expect(screen.getByText(/rest\.sheetRoll\.auto\.success/)).toBeTruthy();
    });
});

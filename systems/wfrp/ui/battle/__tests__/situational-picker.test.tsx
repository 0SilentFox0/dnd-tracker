// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import { FORTUNE_INPUT } from '../../../rules/percentile/fortune';
import { D100RollBody } from '../D100RollBody';
import { situationalControls } from '../fortune-controls';

import type { RollBodyProps } from '@/components/systems/types';
import { render } from '@/lib/i18n/test/render-uk';
import { RulesetSchema } from '@/lib/utils/rules/schema';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

vi.unmock('next-intl');

const canon = RulesetSchema.parse({
    ...WFRP_RULES,
    edition: { preset: 'canon5e' },
});

const model = (viewerIsDM: boolean) => {
    const actions = {
        roll: vi.fn(),
        aiRoll: vi.fn(),
        back: vi.fn(),
        setSystemInput: vi.fn(),
    };

    const wizard = {
        state: {
            index: 0,
            diceSlots: [],
            strikes: [{ targetId: 't', damage: [] }],
            targetIds: ['t'],
        },
        view: {
            rules: canon,
            viewerIsDM,
            judged: { target: null, attackerSide: undefined },
            attacker: { abilities: {}, battleData: {} },
        },
        actions,
    } as unknown as RollBodyProps['wizard'];

    return { wizard, actions };
};

describe('DM attack modifiers picker', () => {
    afterEach(cleanup);

    it('is hidden from players', () => {
        render(<D100RollBody wizard={model(false).wizard} />);
        expect(screen.queryByTestId('situational-picker')).toBeNull();
    });

    it('lets the DM set a called shot and flags', () => {
        const { wizard, actions } = model(true);

        render(<D100RollBody wizard={wizard} />);
        expect(screen.getByTestId('situational-picker')).toBeTruthy();

        fireEvent.click(screen.getByText('Голова'));

        const slot = actions.setSystemInput.mock.calls[0][0];

        expect(FORTUNE_INPUT.read(slot)).toEqual({
            kind: 'none',
            calledShot: 'head',
        });

        fireEvent.click(screen.getByText('Тісний простір'));
        expect(
            FORTUNE_INPUT.read(actions.setSystemInput.mock.calls[1][0])
        ).toMatchObject({ situational: { enclosed: true } });
    });
});

describe('situationalControls', () => {
    it('keeps Fortune and clears to nothing when emptied', () => {
        const writes: unknown[] = [];

        const slot = FORTUNE_INPUT.write({
            kind: 'sl',
            calledShot: 'head',
            situational: { enclosed: true },
        });

        situationalControls(slot, (s) => writes.push(s)).set({});

        expect(FORTUNE_INPUT.read(writes[0] as never)).toEqual({ kind: 'sl' });

        const bare = FORTUNE_INPUT.write({ kind: 'none', calledShot: 'head' });

        situationalControls(bare, (s) => writes.push(s)).set({});

        expect(writes[1]).toBeUndefined();
    });
});

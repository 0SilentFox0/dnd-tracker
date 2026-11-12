// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

import { SystemConditionsDialog } from '../SystemConditionsDialog';

import { render } from '@/lib/i18n/test/render-uk';
import { textRef } from '@/lib/i18n/text-ref';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import { applyWfrpConditionTo } from '@/systems/wfrp/rules/conditions/apply';

vi.unmock('next-intl');

const hero = makeParticipant({ id: 'p1' });

const bled = applyWfrpConditionTo(hero, {
    key: 'bleeding',
    levels: 2,
    round: 1,
    sourceName: textRef('battleWfrp.log.removed', {
        target: 'x',
        condition: 'y',
    }),
}).participant;

const open = (participant = hero) => {
    const onSubmit = vi.fn();

    render(
        <SystemConditionsDialog
            participant={participant}
            onClose={vi.fn()}
            onSubmit={onSubmit}
            isPending={false}
        />
    );

    return onSubmit;
};

describe('SystemConditionsDialog', () => {
    afterEach(cleanup);

    it('applies the chosen condition with levels', () => {
        const onSubmit = open();

        fireEvent.click(screen.getByRole('radio', { name: /Кровотеча/ }));
        fireEvent.change(screen.getByLabelText('Рівні'), {
            target: { value: '2' },
        });
        fireEvent.click(screen.getByRole('button', { name: 'Накласти' }));

        expect(onSubmit).toHaveBeenCalledWith({
            action: 'apply',
            participantId: 'p1',
            condition: 'bleeding',
            levels: 2,
        });
    });

    it('reduces by one level or removes the whole condition', () => {
        const onSubmit = open(bled);

        fireEvent.click(screen.getByRole('button', { name: '−1' }));
        expect(onSubmit).toHaveBeenLastCalledWith({
            action: 'remove',
            participantId: 'p1',
            condition: 'bleeding',
            all: false,
        });

        fireEvent.click(screen.getByRole('button', { name: 'Зняти' }));
        expect(onSubmit).toHaveBeenLastCalledWith({
            action: 'remove',
            participantId: 'p1',
            condition: 'bleeding',
            all: true,
        });
    });

    it('hides rounds for an untimed condition and submits without them', () => {
        const onSubmit = open();

        fireEvent.click(screen.getByRole('radio', { name: /Непритомний/ }));
        expect(document.querySelector('#wfrp-condition-rounds')).toBeNull();

        fireEvent.click(screen.getByRole('button', { name: 'Накласти' }));
        expect(onSubmit).toHaveBeenCalledWith({
            action: 'apply',
            participantId: 'p1',
            condition: 'unconscious',
        });

        fireEvent.click(screen.getByRole('radio', { name: /Оглушення/ }));
        expect(document.querySelector('#wfrp-condition-rounds')).not.toBeNull();
    });
});

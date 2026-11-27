// @vitest-environment happy-dom
import { useEffect } from 'react';
import { cleanup, fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/components/hud/fonts', () => ({ hudFontClassName: '' }));

vi.mock('next-intl', async () => (await import('./uk-intl')).catalogIntl());

import '@/components/systems/registry';
import { AttackWizard } from '@/components/battle/wizards/AttackWizard';
import { QuickAttackCard } from '@/components/battle/wizards/QuickAttackCard';
import { AttackType } from '@/lib/constants/battle';
import { useAttackWizard, useQuickAttack } from '@/lib/hooks/battle';
import { fakeScene } from '@/lib/hooks/battle/__tests__/fake-scene';
import { render } from '@/lib/i18n/test/render-uk';
import type { BattleAttack } from '@/types/battle';

vi.unmock('next-intl');

function Harness({
    attacker,
    targetId,
}: {
    attacker: Parameters<typeof useAttackWizard>[0];
    targetId?: string;
}) {
    const wizard = useAttackWizard(attacker);

    const quick = useQuickAttack(wizard, attacker, true);

    const { begin } = quick;

    useEffect(() => begin(targetId), [begin, targetId]);

    return (
        <>
            {quick.open && <QuickAttackCard quick={quick} />}
            <AttackWizard wizard={wizard} />
        </>
    );
}

const bow = {
    id: 'bow',
    name: 'Лук',
    type: AttackType.RANGED,
    range: '60 ft',
    attackBonus: 4,
    damageDice: '1d6',
    damageType: 'piercing',
} as BattleAttack;

afterEach(cleanup);

function setup() {
    const scene = fakeScene({
        map: { cols: 10, rows: 5, background: null, opacity: 0.3 },
    });

    scene.me.battleData.attacks = [bow, ...scene.me.battleData.attacks];
    scene.me.battleData.position = { x: 0, y: 0 };
    scene.gob.battleData.position = { x: 1, y: 0 };

    return scene;
}

describe('QuickAttackCard', () => {
    it('показує цілі, а після вибору - чипи зброї та кнопки', async () => {
        const { wrapper, me } = setup();

        render(<Harness attacker={me} />, { wrapper });

        fireEvent.click(await screen.findByRole('button', { name: /Гоблін/ }));

        expect(await screen.findByRole('button', { name: 'Лук' })).toBeTruthy();
        expect(screen.getByRole('button', { name: /Майстер атаки/ })).toBeTruthy();
    });

    it('«Атакувати» відправляє удар без діалогу візарда', async () => {
        const { wrapper, me, mutateAsync } = setup();

        render(<Harness attacker={me} targetId="gob" />, { wrapper });

        fireEvent.click(await screen.findByRole('button', { name: 'Атакувати' }));

        await waitFor(() =>
            expect(mutateAsync).toHaveBeenCalledWith(
                expect.objectContaining({ targetIds: ['gob'] })
            )
        );
        expect(screen.queryByText('Кидок атаки · d20')).toBeNull();
    });

    it('«Майстер атаки» відкриває візард на кроці кидка з тією ж ціллю', async () => {
        const { wrapper, me } = setup();

        render(<Harness attacker={me} targetId="gob" />, { wrapper });

        fireEvent.click(
            await screen.findByRole('button', { name: /Майстер атаки/ })
        );

        expect(await screen.findByText('Кидок атаки · d20')).toBeTruthy();
    });
});

// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { CharacterCombatParams } from '../CharacterCombatParams';

import { useCampaignRules } from '@/lib/hooks/campaigns';
import { render } from '@/lib/i18n/test/render-uk';
import type { CharacterFormBindings } from '@/lib/utils/characters/form/bindings';
import type { SheetTotal } from '@/types/characters';

vi.unmock('next-intl');
vi.mock('@/lib/hooks/campaigns', () => ({ useCampaignRules: vi.fn() }));
vi.mock('@/lib/utils/characters/initiative-range', () => ({
    heroInitiativeRange: () => ({ min: 8, max: 14 }),
}));

type Bindings = CharacterFormBindings['combatStats'];

const bindings = (over: Partial<Bindings['data']> = {}) => {
    const set = vi.fn();

    return {
        set,
        combatStats: {
            data: {
                armorClass: 12,
                initiative: 10,
                speed: 30,
                minTargets: 1,
                maxTargets: 2,
                ...over,
            },
            set,
        } as unknown as Bindings,
    };
};

const input = (id: string) => document.getElementById(id) as HTMLInputElement;

describe('CharacterCombatParams', () => {
    beforeEach(() => {
        vi.mocked(useCampaignRules).mockReturnValue({
            data: {},
        } as unknown as ReturnType<typeof useCampaignRules>);
    });
    afterEach(cleanup);

    it('edits armor class with a fallback of 10 for an unparsable value', () => {
        const { combatStats, set } = bindings();

        render(
            <CharacterCombatParams campaignId="c" combatStats={combatStats} />
        );
        fireEvent.change(input('armorClass'), { target: { value: '17' } });
        expect(set).toHaveBeenLastCalledWith('armorClass', 17);
        fireEvent.change(input('armorClass'), { target: { value: '' } });
        expect(set).toHaveBeenLastCalledWith('armorClass', 10);
    });

    it('falls back to 30 speed and 1 target when cleared', () => {
        const { combatStats, set } = bindings();

        render(
            <CharacterCombatParams campaignId="c" combatStats={combatStats} />
        );
        fireEvent.change(input('speed'), { target: { value: '' } });
        expect(set).toHaveBeenLastCalledWith('speed', 30);
        fireEvent.change(input('minTargets'), { target: { value: '0' } });
        expect(set).toHaveBeenLastCalledWith('minTargets', 1);
        fireEvent.change(input('maxTargets'), { target: { value: '4' } });
        expect(set).toHaveBeenLastCalledWith('maxTargets', 4);
    });

    it('passes the campaign initiative range to the field and clamps on blur', () => {
        const { combatStats, set } = bindings({ initiative: 99 });

        render(
            <CharacterCombatParams campaignId="c" combatStats={combatStats} />
        );
        expect(input('initiative')).toHaveAttribute('min', '8');
        expect(input('initiative')).toHaveAttribute('max', '14');
        fireEvent.blur(input('initiative'));
        expect(set).toHaveBeenLastCalledWith('initiative', 14);
    });

    it('does not clamp before the campaign rules load', () => {
        vi.mocked(useCampaignRules).mockReturnValue({
            data: undefined,
        } as unknown as ReturnType<typeof useCampaignRules>);

        const { combatStats, set } = bindings({ initiative: 99 });

        render(
            <CharacterCombatParams campaignId="c" combatStats={combatStats} />
        );
        fireEvent.blur(input('initiative'));
        expect(set).not.toHaveBeenCalled();
    });

    it('shows the class armor hint instead of the field when armor derives from class', () => {
        const { combatStats } = bindings();

        render(
            <CharacterCombatParams
                campaignId="c"
                combatStats={combatStats}
                classArmor={null}
            />
        );
        expect(document.getElementById('armorClass')).toBeNull();
        expect(
            screen.getByText('КЗ рахується з броні й Спритності')
        ).toBeInTheDocument();
    });

    it('shows the computed class armor total with its lines', () => {
        const { combatStats } = bindings();

        const classArmor: SheetTotal = {
            total: 15,
            lines: [{ label: 'raw text', value: '12' }],
        };

        render(
            <CharacterCombatParams
                campaignId="c"
                combatStats={combatStats}
                classArmor={classArmor}
            />
        );
        expect(screen.getByText('15')).toBeInTheDocument();
        expect(screen.getByText(/raw text 12/)).toBeInTheDocument();
    });

    it('renders the extra fields slot', () => {
        const { combatStats } = bindings();

        render(
            <CharacterCombatParams
                campaignId="c"
                combatStats={combatStats}
                extraFields={<span>EXTRA</span>}
            />
        );
        expect(screen.getByText('EXTRA')).toBeInTheDocument();
    });
});

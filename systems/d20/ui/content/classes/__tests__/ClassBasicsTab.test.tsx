// @vitest-environment happy-dom
import { useEffect, useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
    listOptions,
    pickOption,
} from '@/components/ui/__tests__/radix-select';
import { makeClass } from '@/lib/utils/characters/classes/__tests__/class-fixtures';
import { ClassBasicsTab } from '@/systems/d20/ui/content/classes/ClassBasicsTab';
import type { ClassFormData } from '@/types/classes';

vi.mock('@/systems/d20/ui/content/classes/SpellListHint', () => ({
    SpellListHint: ({ tag }: { tag: string }) => <p>{`hint:${tag}`}</p>,
}));
vi.mock('@/components/common/fields/ImageUpload', () => ({
    ImageUpload: ({ label }: { label: string }) => <span>{label}</span>,
}));

let latest: ClassFormData;

function Harness({
    initial,
    campaignId,
}: {
    initial: ClassFormData;
    campaignId?: string;
}) {
    const [data, set] = useState(initial);

    useEffect(() => {
        latest = data;
    });

    return <ClassBasicsTab form={{ data, set }} campaignId={campaignId} />;
}

const mount = (over: Partial<ClassFormData> = {}, campaignId?: string) =>
    render(<Harness initial={makeClass(over)} campaignId={campaignId} />);

const checkbox = (name: string) =>
    screen.getByRole('checkbox', { name: new RegExp(name) });

describe('ClassBasicsTab', () => {
    afterEach(cleanup);

    it('edits the class name', () => {
        mount();

        fireEvent.change(screen.getByLabelText('classes.basics.name'), {
            target: { value: 'Paladin' },
        });

        expect(latest.name).toBe('Paladin');
    });

    it('toggles saving throws on and off', () => {
        mount();

        fireEvent.click(checkbox('gameTerms.abilities.strength.label'));
        fireEvent.click(checkbox('gameTerms.abilities.dexterity.label'));
        expect(latest.savingThrows).toEqual(['strength', 'dexterity']);

        fireEvent.click(checkbox('gameTerms.abilities.strength.label'));
        expect(latest.savingThrows).toEqual(['dexterity']);
    });

    it('toggles skills the class can choose from', () => {
        mount({ skillChoices: { count: 2, from: ['stealth'] } });

        fireEvent.click(checkbox('gameTerms.dndSkills.arcana'));
        expect(latest.skillChoices.from).toEqual(['stealth', 'arcana']);

        fireEvent.click(checkbox('gameTerms.dndSkills.stealth'));
        expect(latest.skillChoices.from).toEqual(['arcana']);
        expect(latest.skillChoices.count).toBe(2);
    });

    it('skill count never goes below zero and ignores garbage', () => {
        mount({ skillChoices: { count: 2, from: [] } });

        const input = screen.getByLabelText('classes.basics.skillCount');

        fireEvent.change(input, { target: { value: '-3' } });
        expect(latest.skillChoices.count).toBe(0);

        fireEvent.change(input, { target: { value: '4' } });
        expect(latest.skillChoices.count).toBe(4);
    });

    it('picks the hit die as a number', async () => {
        mount({ hitDie: 10 });

        await pickOption(screen.getByLabelText('classes.basics.hitDie'), 'd12');

        expect(latest.hitDie).toBe(12);
    });

    it('proficiency lists are parsed from comma separated text', () => {
        mount();

        fireEvent.change(screen.getByLabelText('classes.basics.armor'), {
            target: { value: 'Light, Heavy' },
        });

        expect(latest.proficiencies.armor).toEqual(['Light', 'Heavy']);
        expect(latest.proficiencies.weapons).toEqual([]);
    });

    it('a non-caster has no spell fields', () => {
        mount({ caster: 'none' });

        expect(
            screen.queryByLabelText('classes.basics.spellAbility')
        ).toBeNull();
        expect(screen.queryByLabelText('classes.basics.spellList')).toBeNull();
    });

    it('a caster gets the spell ability and spell list fields', async () => {
        mount({ caster: 'full' });

        await pickOption(
            screen.getByLabelText('classes.basics.spellAbility'),
            'gameTerms.abilities.wisdom.label'
        );
        expect(latest.spellcastingAbility).toBe('wisdom');

        fireEvent.change(screen.getByLabelText('classes.basics.spellList'), {
            target: { value: 'cleric' },
        });
        expect(latest.spellList).toBe('cleric');

        fireEvent.change(screen.getByLabelText('classes.basics.spellList'), {
            target: { value: '   ' },
        });
        expect(latest.spellList).toBeNull();
    });

    it('switching the caster type to none hides the spell fields', async () => {
        mount({ caster: 'full' });

        const options = await listOptions(
            screen.getByLabelText('classes.basics.caster')
        );

        const none = options.find(
            (o) => o.textContent === 'classes.casters.none'
        );

        expect(none).toBeDefined();
        fireEvent.click(none as HTMLElement);

        expect(latest.caster).toBe('none');
        expect(screen.queryByLabelText('classes.basics.spellList')).toBeNull();
    });

    it('shows the spell list hint only with a campaign and a list tag', () => {
        mount({ caster: 'full', spellList: 'cleric' });
        expect(screen.queryByText('hint:cleric')).toBeNull();
        cleanup();

        mount({ caster: 'full', spellList: null }, 'c');
        expect(screen.queryByText(/^hint:/)).toBeNull();
        cleanup();

        mount({ caster: 'full', spellList: 'cleric' }, 'c');
        expect(screen.getByText('hint:cleric')).toBeTruthy();
    });
});

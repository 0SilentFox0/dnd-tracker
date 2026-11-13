// @vitest-environment happy-dom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DmCharacterCard } from '@/components/characters/list/DmCharacterCard';
import { defaultRulesFor } from '@/lib/utils/rules/section-registry';
import { RULE_SYSTEM_REGISTRY } from '@/lib/utils/rules/systems';
import type { CharacterListItem } from '@/types/characters';
import type { GameClassData } from '@/types/classes';

const mocks = vi.hoisted(() => ({
    rules: vi.fn(),
    classMode: vi.fn(),
    system: vi.fn(),
}));

vi.mock('@/lib/hooks/campaigns', () => ({ useCampaignRules: mocks.rules }));
vi.mock('@/lib/hooks/systems', () => ({ useRuleSystem: mocks.system }));
vi.mock('@/lib/hooks/classes', () => ({ useClassMode: mocks.classMode }));
vi.mock('@/components/character-profile/HeroPortrait', () => ({
    HeroPortrait: () => null,
}));
vi.mock('@/components/common/ActionsMenu', () => ({
    ActionsMenu: ({ actions }: { actions: { label: string }[] }) => (
        <ul>
            {actions.map((a) => (
                <li key={a.label}>{a.label}</li>
            ))}
        </ul>
    ),
}));

const fighter = {
    id: 'f',
    name: 'Воїн',
    hitDie: 10,
    subclasses: [],
} as unknown as GameClassData;

const character = {
    id: 'c',
    campaignId: 'camp',
    type: 'PLAYER',
    controlledBy: null,
    name: 'Х',
    level: 3,
    class: 'Воїн',
    race: 'Людина',
    subrace: null,
    avatar: null,
    constitution: 14,
    archetype: null,
    armorClass: 10,
    initiative: 0,
} as unknown as CharacterListItem;

const renderCard = (c: CharacterListItem) =>
    render(
        <DmCharacterCard
            character={c}
            campaignId="camp"
            busy={false}
            actions={{ onDelete: vi.fn() }}
        />
    );

describe('DmCharacterCard HP', () => {
    beforeEach(() => {
        mocks.rules.mockReturnValue({
            data: defaultRulesFor({ key: 'dnd5e' }),
        });
        mocks.system.mockReturnValue({
            key: 'dnd5e',
            system: RULE_SYSTEM_REGISTRY.dnd5e,
            ready: true,
        });
    });
    afterEach(cleanup);

    it('клас-режим: HP з класів, як у листі', () => {
        mocks.classMode.mockReturnValue({
            enabled: true,
            byId: { f: fighter },
        });
        renderCard({ ...character, classes: [{ classId: 'f', level: 3 }] });

        expect(screen.getByText('28')).toBeTruthy();
    });

    it('без записів класів HP за формулою героя', () => {
        mocks.classMode.mockReturnValue({
            enabled: true,
            byId: { f: fighter },
        });
        renderCard(character);

        expect(screen.queryByText('28')).toBeNull();
    });

    it('класи вимкнені в правилах — формула героя навіть із записами', () => {
        mocks.classMode.mockReturnValue({ enabled: false, byId: {} });
        renderCard({ ...character, classes: [{ classId: 'f', level: 3 }] });

        expect(screen.queryByText('28')).toBeNull();
    });
});

describe('DmCharacterCard before the rules load', () => {
    afterEach(cleanup);

    it('renders no Level and HP chips until the system is known', () => {
        mocks.system.mockReturnValue({
            key: undefined,
            system: undefined,
            ready: false,
        });
        mocks.rules.mockReturnValue({ data: undefined });
        mocks.classMode.mockReturnValue({ enabled: false, byId: {} });
        renderCard(character);

        expect(screen.queryByText('HP')).toBeNull();
        expect(screen.queryByText('characters.card.statLevel')).toBeNull();
    });
});

describe('DmCharacterCard HP before the ruleset loads', () => {
    afterEach(cleanup);

    it('shows a dash instead of 0/0 while the system is ready but rules are not', () => {
        mocks.system.mockReturnValue({
            key: 'dnd5e',
            system: RULE_SYSTEM_REGISTRY.dnd5e,
            ready: true,
        });
        mocks.rules.mockReturnValue({ data: undefined });
        mocks.classMode.mockReturnValue({ enabled: false, byId: {} });
        renderCard(character);

        expect(screen.getByText('—')).toBeTruthy();
        expect(screen.getByText('HP').parentElement?.textContent).not.toMatch(
            /0/
        );
    });
});

describe('DmCharacterCard class line', () => {
    afterEach(cleanup);

    const setup = (key: 'dnd5e' | 'wfrp' | undefined) => {
        mocks.rules.mockReturnValue({ data: undefined });
        mocks.classMode.mockReturnValue({ enabled: false, byId: {} });
        mocks.system.mockReturnValue(
            key
                ? { key, system: RULE_SYSTEM_REGISTRY[key], ready: true }
                : { key: undefined, system: undefined, ready: false }
        );
        renderCard(character);
    };

    it('d20 shows the class', () => {
        setup('dnd5e');
        expect(screen.getByText(/Людина · Воїн/)).toBeTruthy();
    });

    it('wfrp and not-ready rules hide the class', () => {
        setup('wfrp');
        expect(screen.queryByText(/Воїн/)).toBeNull();
        cleanup();
        setup(undefined);
        expect(screen.queryByText(/Воїн/)).toBeNull();
    });
});

describe('DmCharacterCard level-up menu', () => {
    beforeEach(() => {
        mocks.rules.mockReturnValue({ data: undefined });
        mocks.system.mockReturnValue({
            key: 'dnd5e',
            system: RULE_SYSTEM_REGISTRY.dnd5e,
            ready: true,
        });
    });
    afterEach(cleanup);

    const withLevelUp = (c: CharacterListItem) =>
        render(
            <DmCharacterCard
                character={c}
                campaignId="camp"
                busy={false}
                actions={{ onLevelUp: vi.fn(), onDelete: vi.fn() }}
            />
        );

    it('offers a plain level-up when the hero has no classes', () => {
        mocks.classMode.mockReturnValue({
            enabled: false,
            byId: {},
            isPending: false,
        });
        withLevelUp(character);

        expect(screen.getByText('characters.card.levelUp')).toBeTruthy();
    });

    it('hides it for a hero with classes: the server needs a class pick, which only the profile dialog sends', () => {
        mocks.classMode.mockReturnValue({
            enabled: true,
            byId: { f: fighter },
            isPending: false,
        });
        withLevelUp({
            ...character,
            classes: [{ classId: 'f', level: 3 }],
        } as unknown as CharacterListItem);

        expect(screen.queryByText('characters.card.levelUp')).toBeNull();
    });
});

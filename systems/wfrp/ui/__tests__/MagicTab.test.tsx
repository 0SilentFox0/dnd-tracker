// @vitest-environment happy-dom
import { cleanup, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { MagicTab } from '../MagicTab';

import { sheetFixture } from '@/components/character-profile/__tests__/sheet-fixture';
import { ProfileProvider } from '@/components/character-profile/ProfileContext';
import { render } from '@/lib/i18n/test/render-uk';
import type { CharacterSheet } from '@/types/characters';
import type { BookSpell } from '@/types/spells';

vi.unmock('next-intl');

const spell = (
    id: string,
    name: string,
    lore: string | null,
    magic?: { cn: number; kind: 'arcane' | 'petty' }
) =>
    ({
        id,
        name,
        level: 1,
        spellGroup: lore ? { id: lore, name: lore } : null,
        casting: magic ? { magic: { overcast: null, ...magic } } : undefined,
    }) as unknown as BookSpell;

const sheet = (spells: BookSpell[]) =>
    ({
        ...sheetFixture,
        system: 'wfrp',
        slots: [],
        magic: undefined,
        spells,
        systemSlot: {
            key: 'wfrp',
            data: {
                characteristics: [
                    { key: 'wp', base: 30, advances: 0, value: 41, bonus: 4 },
                ],
                skills: [
                    {
                        key: 'language',
                        spec: 'magick',
                        characteristic: 'int',
                        target: 52,
                        advances: 5,
                        trained: true,
                        kind: 'advanced',
                    },
                ],
            },
        },
    }) as unknown as CharacterSheet;

const mount = (s: CharacterSheet) =>
    render(
        <ProfileProvider
            campaignId="c"
            characterId="ch"
            sheet={s}
            canEdit={false}
        >
            <MagicTab />
        </ProfileProvider>
    );

describe('wfrp MagicTab', () => {
    afterEach(cleanup);

    it('groups known spells by lore with CN and kind, no slots', () => {
        mount(
            sheet([
                spell('1', 'Fireball', 'Fire', { cn: 6, kind: 'arcane' }),
                spell('2', 'Sting', 'Fire', { cn: 0, kind: 'petty' }),
                spell('3', 'Mist', null, { cn: 4, kind: 'arcane' }),
            ])
        );

        expect(screen.getByText('Fire')).toBeTruthy();
        expect(screen.getByText('Fireball')).toBeTruthy();
        expect(screen.getByText('СН 6 · Аркана')).toBeTruthy();
        expect(screen.getByText('СН 0 · Дрібна')).toBeTruthy();
        expect(screen.getByText('Інше')).toBeTruthy();
        expect(screen.queryByText(/слот/i)).toBeNull();
    });

    it('shows the Language (Magick) target and Channelling falling back to WP', () => {
        mount(sheet([]));

        expect(screen.getByText('52')).toBeTruthy();
        expect(screen.getByText('41')).toBeTruthy();
        expect(screen.getByText('Заклинань ще не знає.')).toBeTruthy();
    });
});

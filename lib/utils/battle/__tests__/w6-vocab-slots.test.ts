import { describe, expect, it } from 'vitest';

import { isWeaponSlot } from '@/lib/utils/artifacts/weapon-slot';
import { legendaryActionSchema } from '@/lib/utils/battle/actions/schema';
import { extractAttacksFromCharacter } from '@/lib/utils/battle/participant/extract-attacks';
import { UNITS_IMPORT } from '@/lib/utils/content/import/fields/units';

const body = (kind: string) => ({
    action: 'legendary',
    participantId: 'p',
    option: { kind, abilityKey: 'k' },
});

describe('W6 module vocab consumers', () => {
    it.each(['ability', 'lair'])('legendary body kind %s passes', (kind) => {
        expect(legendaryActionSchema.safeParse(body(kind)).success).toBe(true);
    });

    it('legendary body with an unknown kind is rejected', () => {
        expect(legendaryActionSchema.safeParse(body('other')).success).toBe(
            false
        );
    });

    it('weapon slots keep the stored set', () => {
        for (const s of ['weapon', 'mainHand', 'offHand', 'range_weapon'])
            expect(isWeaponSlot(s)).toBe(true);

        expect(isWeaponSlot('shield')).toBe(false);
    });

    it('an item in the offHand slot gives the same attack as before', async () => {
        const row = {
            id: 'd',
            name: 'd',
            slot: 'weapon',
            bonuses: {},
            modifiers: [{ type: 'damageDice', value: '1d4' }],
        };

        const attacks = await extractAttacksFromCharacter(
            {
                id: 'c',
                campaignId: 'camp',
                inventory: { equipped: { offHand: 'd' } },
            } as never,
            { d: row } as never
        );

        const weapon = attacks.find((a) => a.id === 'd');

        expect(weapon).toMatchObject({ id: 'd', damageDice: '1d4' });
        expect(weapon?.hand).toBeUndefined();
    });

    it('unit import keeps the int morale field between gridSize and minTargets', () => {
        const keys = UNITS_IMPORT.fields.map((f) => f.key);

        expect(keys.slice(keys.indexOf('gridSize'))).toEqual(
            expect.arrayContaining(['gridSize', 'morale', 'minTargets'])
        );
        expect(keys.indexOf('morale')).toBe(keys.indexOf('gridSize') + 1);
        expect(UNITS_IMPORT.fields.find((f) => f.key === 'morale')).toMatchObject({
            key: 'morale',
            type: 'int',
        });
    });
});

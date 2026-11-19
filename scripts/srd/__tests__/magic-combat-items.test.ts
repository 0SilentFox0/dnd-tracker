import { describe, expect, it } from 'vitest';

import { readSrdData } from '../lib/data-files';

import { AbilitySchema } from '@/lib/utils/abilities/schema';

const artifacts = readSrdData().artifacts;

const row = (slug: string) => artifacts.find((a) => a.slug === slug)!;

const ids = (slug: string) => (row(slug).abilities ?? []).map((a) => a.id);

describe('magic items with combat effects', () => {
    it.each([
        'mace-of-smiting',
        'scimitar-of-speed',
        'dagger-of-venom',
        'cloak-of-displacement',
        'ring-of-free-action',
        'armor-of-invulnerability',
        'dragon-scale-mail',
    ])('%s abilities parse', (name) => {
        for (const a of row(`srd-2024_${name}`).abilities ?? [])
            expect(AbilitySchema.safeParse(a).success, a.id).toBe(true);
    });

    it('Mace of Smiting: crit rider, construct damage and to-hit riders, construct crit destroys at 25 HP', () => {
        expect(ids('srd-2024_mace-of-smiting')).toEqual([
            'smite-crit',
            'smite-construct',
            'smite-construct-hit',
            'smite-construct-crit',
        ]);
        expect(
            row('srd-2024_mace-of-smiting').abilities?.[3].effects[0]
        ).toMatchObject({ kind: 'dealDamage', amount: 7, killIfHpAtMost: 32 });
    });

    it('Scimitar of Speed keeps +2 and grants a bound item attack as a bonus action', () => {
        const r = row('srd-2024_scimitar-of-speed');

        expect(r.weapon).toMatchObject({ attackBonus: 2, damageBonus: 2 });
        expect(r.abilities?.[0]).toMatchObject({
            trigger: { event: 'bonusAction' },
            effects: [{ kind: 'grantAction', itemAttacks: 1 }],
        });
    });

    it('Dagger of Venom and Armor of Invulnerability spend their single dawn charge', () => {
        for (const slug of [
            'srd-2024_dagger-of-venom',
            'srd-2024_armor-of-invulnerability',
        ]) {
            expect(row(slug).item?.charges).toEqual({ max: 1, rest: 'long' });
            expect(ids(slug)).not.toContain('charge');
        }
    });

    it('Armor of Invulnerability: resistance plus a 10-minute immunity action', () => {
        const shell = row('srd-2024_armor-of-invulnerability').abilities?.find(
            (a) => a.id === 'metal-shell'
        );

        expect(shell?.trigger).toEqual({ event: 'action' });
        expect(shell?.effects).toHaveLength(3);
        expect(shell?.effects[0]).toMatchObject({
            flag: 'resistance',
            percent: 100,
            duration: { rounds: 100 },
        });
    });

    it('Dragon Scale Mail is one row with a damage-type parameter', () => {
        const r = row('srd-2024_dragon-scale-mail');

        expect(r.item?.parameter?.options.map((o) => o.key)).toEqual([
            'acid',
            'cold',
            'fire',
            'lightning',
            'poison',
        ]);
        expect(ids('srd-2024_dragon-scale-mail')).toContain(
            'parameter-resistance'
        );
    });
});

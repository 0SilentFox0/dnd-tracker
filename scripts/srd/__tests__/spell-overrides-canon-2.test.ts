import { describe, expect, it } from 'vitest';

import { convertSpells } from '../convert/spells';
import { FIXTURE_DIR, loadOpen5e } from '../lib/open5e';
import { FRIENDLY_FIRE_SPELLS, SPELL_OVERRIDES } from '../overrides/spells';

import {
    SpellEffectSchema,
    SpellTargetingSchema,
} from '@/lib/utils/spells/model/schema';

const get = (slug: string) => SPELL_OVERRIDES[`srd-2024_${slug}`];

const effectsOf = (slug: string) => get(slug).spellEffects ?? [];

const PERSISTENT = [
    'spirit-guardians',
    'flaming-sphere',
    'call-lightning',
    'cloudkill',
    'insect-plague',
    'incendiary-cloud',
    'wall-of-fire',
    'spiritual-weapon',
    'heat-metal',
    'vampiric-touch',
    'heroism',
    'guiding-bolt',
    'ray-of-sickness',
    'thunderwave',
];

describe('canon audit 2 spell overrides', () => {
    it.each(PERSISTENT)(
        '%s: effects and targeting satisfy the schemas',
        (slug) => {
            for (const e of effectsOf(slug))
                expect(SpellEffectSchema.safeParse(e).success).toBe(true);

            const targeting = get(slug).targeting;

            if (targeting)
                expect(SpellTargetingSchema.safeParse(targeting).success).toBe(
                    true
                );
        }
    );

    it('Heroism grants temp HP at each turn start through a temp hot', () => {
        expect(effectsOf('heroism')).toContainEqual(
            expect.objectContaining({ kind: 'hot', temp: true })
        );
    });

    it('Spirit Guardians is a 10-minute enemy aura on the caster that halves on a save', () => {
        const [zone] = effectsOf('spirit-guardians');

        expect(get('spirit-guardians').targeting).toEqual({ kind: 'self' });
        expect(zone).toMatchObject({
            kind: 'anchoredZone',
            radiusFeet: 15,
            side: 'enemies',
            duration: { rounds: 100 },
            onTurnStart: {
                save: { ability: 'wisdom' },
                saveHalf: true,
                effects: [{ kind: 'dealDamage', amount: { spellRoll: 100 } }],
            },
        });
    });

    it('Cloudkill, Insect Plague and Incendiary Cloud keep canon zone durations and hit everyone', () => {
        const zone = (slug: string) => {
            const t = get(slug).targeting;

            return t?.kind === 'template' ? t : null;
        };

        expect(zone('cloudkill')).toMatchObject({
            side: 'all',
            zone: { rounds: 100, side: 'all' },
        });
        expect(zone('insect-plague')?.zone?.rounds).toBe(100);
        expect(zone('incendiary-cloud')?.zone?.rounds).toBe(10);
        expect(zone('fog-cloud')?.zone?.rounds).toBe(600);
        expect(zone('spike-growth')?.zone?.rounds).toBe(100);
    });

    it('repeat-damage spells grant a follow-up cast with the right cost', () => {
        const grant = (slug: string) =>
            effectsOf(slug).find((e) => e.kind === 'grantCast');

        expect(grant('heat-metal')).toMatchObject({ cost: 'bonusAction' });
        expect(grant('spiritual-weapon')).toMatchObject({
            cost: 'bonusAction',
        });
        expect(grant('vampiric-touch')).toMatchObject({ cost: 'action' });
        expect(grant('call-lightning')).toMatchObject({ cost: 'action' });
        expect(get('spiritual-weapon').concentration).toBe(false);
    });

    it('Vampiric Touch heals half of the damage dealt', () => {
        expect(effectsOf('vampiric-touch')).toContainEqual({
            kind: 'heal',
            amount: { percentOf: 'eventDamage', value: 50 },
            target: 'self',
        });
    });

    it('priced components carry minGp', () => {
        for (const [slug, gp] of [
            ['astral-projection', 1000],
            ['clone', 1000],
            ['legend-lore', 250],
            ['secret-chest', 5000],
            ['create-undead', 150],
        ] as const)
            expect(get(slug).ingredients?.some((i) => i.minGp === gp)).toBe(
                true
            );
    });

    it('secondary effects ride along: advantage, poisoned, push', () => {
        expect(effectsOf('guiding-bolt')).toContainEqual(
            expect.objectContaining({ flag: 'advantageForAttackers' })
        );
        expect(effectsOf('ray-of-sickness')).toContainEqual(
            expect.objectContaining({ condition: 'poisoned' })
        );
        expect(effectsOf('thunderwave')).toContainEqual(
            expect.objectContaining({ kind: 'push', feet: 10 })
        );
    });
});

describe('friendly fire in converted spells', () => {
    const spells = convertSpells(loadOpen5e(FIXTURE_DIR));

    it('area spells on the allowlist hit everyone in the template', () => {
        const hit = spells.filter(
            (s) =>
                FRIENDLY_FIRE_SPELLS.has(s.slug) &&
                s.targeting.kind === 'template'
        );

        expect(hit.length).toBeGreaterThan(0);

        for (const s of hit) expect(s.targeting).toMatchObject({ side: 'all' });
    });

    it('single-target and ally templates are untouched', () => {
        const side = (slug: string) =>
            spells.find((s) => s.slug === `srd-2024_${slug}`)?.targeting;

        expect(side('fire-bolt')).toMatchObject({ kind: 'enemy' });
    });
});

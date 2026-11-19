import { describe, expect, it } from 'vitest';

import { resolveSpellDuration } from '../overrides/durations';
import { SPELL_OVERRIDES } from '../overrides/spells';
import { UTILITY_SPELL_OVERRIDES } from '../overrides/spells-utility';
import implemented from './fixtures/implemented-empty-spells.json';

import {
    SpellEffectSchema,
    SpellTargetingSchema,
} from '@/lib/utils/spells/model/schema';

const slugs = Object.keys(UTILITY_SPELL_OVERRIDES);

describe('utility spell overrides', () => {
    it('cover exactly the formerly empty SRD spells', () => {
        expect(slugs.map((s) => s.replace('srd-2024_', '')).sort()).toEqual(
            [...implemented].sort()
        );
    });

    it.each(slugs)('%s has valid effects and targeting', (slug) => {
        const o = resolveSpellDuration(SPELL_OVERRIDES[slug], 600);

        const zone =
            o.targeting?.kind === 'template' && o.targeting.zone !== undefined;

        expect(o.spellEffects?.length || zone).toBeTruthy();

        for (const e of o.spellEffects ?? [])
            expect(SpellEffectSchema.safeParse(e).success).toBe(true);

        expect(SpellTargetingSchema.safeParse(o.targeting).success).toBe(true);
    });

    it('revival spells revive from the dead', () => {
        for (const slug of ['raise-dead', 'resurrection', 'true-resurrection'])
            expect(SPELL_OVERRIDES[`srd-2024_${slug}`]).toMatchObject({
                targeting: { kind: 'allyDead' },
                spellEffects: expect.arrayContaining([
                    expect.objectContaining({ kind: 'heal', revive: true }),
                ]),
            });
    });

    it('misty step teleports to an aimed cell', () => {
        expect(SPELL_OVERRIDES['srd-2024_misty-step']).toMatchObject({
            targeting: { kind: 'template', exact: true, range: 30 },
            spellEffects: [{ kind: 'teleportSelf' }],
        });
    });

    it('summon spells use inline statblocks', () => {
        for (const slug of ['find-familiar', 'animate-dead', 'summon-dragon'])
            expect(
                SPELL_OVERRIDES[`srd-2024_${slug}`].spellEffects?.[0].kind
            ).toBe('summonInline');
    });
});

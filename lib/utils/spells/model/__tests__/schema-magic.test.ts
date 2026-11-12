import { describe, expect, it } from 'vitest';

import {
    readSpellDefinition,
    spellDefinitionColumns,
} from '@/lib/utils/spells/model/read';
import {
    SPELL_MAGIC_KINDS,
    SpellCastingTimeSchema,
    SpellMagicSchema,
} from '@/lib/utils/spells/model/schema';

describe('SpellMagicSchema', () => {
    it('parses with overcast defaulting to null', () => {
        expect(
            SpellCastingTimeSchema.parse({ magic: { cn: 6, kind: 'arcane' } })
                .magic
        ).toEqual({ cn: 6, kind: 'arcane', overcast: null });
    });

    it('accepts every kind and an attribute', () => {
        for (const kind of SPELL_MAGIC_KINDS)
            expect(SpellMagicSchema.safeParse({ cn: 0, kind }).success).toBe(
                true
            );
        expect(
            SpellMagicSchema.safeParse({
                cn: 4,
                kind: 'hedge',
                overcast: 'dice',
                attribute: { condition: 'stunned', levels: 1 },
            }).success
        ).toBe(true);
    });

    it('rejects bad cn and kind', () => {
        expect(
            SpellMagicSchema.safeParse({ cn: -1, kind: 'arcane' }).success
        ).toBe(false);
        expect(
            SpellMagicSchema.safeParse({ cn: 31, kind: 'arcane' }).success
        ).toBe(false);
        expect(SpellMagicSchema.safeParse({ cn: 3, kind: 'x' }).success).toBe(
            false
        );
    });

    it('round-trips casting.magic through read and columns', () => {
        const casting = { magic: { cn: 6, kind: 'arcane', overcast: null } };

        const def = readSpellDefinition({ id: 's', casting });

        expect(def.casting?.magic).toEqual(casting.magic);
        expect(
            readSpellDefinition({ id: 's', ...spellDefinitionColumns(def) })
                .casting
        ).toEqual(casting);
    });

    it('row without magic is unchanged', () => {
        const def = readSpellDefinition({ id: 's', casting: { rounds: 2 } });

        expect(def.casting).toEqual({ rounds: 2 });
        expect(def.casting).not.toHaveProperty('magic');
    });
});

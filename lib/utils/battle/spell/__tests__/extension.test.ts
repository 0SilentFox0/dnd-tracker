import { describe, expect, it } from 'vitest';

import { ParticipantSide } from '@/lib/constants/battle';
import { makeParticipant } from '@/lib/utils/abilities/__tests__/fixtures';
import {
    extendSpell,
    isExtended,
    NO_EXTENSION,
    scaledRounds,
    widenTargeting,
} from '@/lib/utils/battle/spell/extension';
import {
    resolveSpellTargets,
    trimToExtension,
} from '@/lib/utils/battle/spell/spell-targeting';
import { DEFAULT_RULES } from '@/lib/utils/rules/__tests__/fixtures/default-rules';
import type { CastExtension } from '@/lib/utils/rules/systems/types';
import type { SpellDefinition } from '@/lib/utils/spells/model/schema';

const rules = DEFAULT_RULES;

const wider = (over: Partial<CastExtension>): CastExtension => ({
    ...NO_EXTENSION,
    ...over,
});

describe('cast extension helpers', () => {
    it('scales rounds, leaves Instant alone and caps at the day', () => {
        expect(scaledRounds(4, wider({ durationMul: 2 }))).toBe(8);
        expect(scaledRounds(4, wider({ durationAddRounds: 6 }))).toBe(10);
        expect(scaledRounds(0, wider({ durationMul: 3 }))).toBe(0);
    });

    it('widens range and template size only where the spell has them', () => {
        const burst = {
            kind: 'template',
            shape: 'circle',
            size: 10,
            side: 'enemy',
            maxTargets: 4,
            range: 60,
        } as const;

        expect(
            widenTargeting(burst, wider({ rangeMul: 2, aoeMul: 2 }))
        ).toMatchObject({ range: 120, size: 20 });
        expect(
            widenTargeting({ kind: 'enemy', range: 5 }, wider({ rangeAddFt: 18 }))
        ).toEqual({ kind: 'enemy', range: 23 });
        expect(widenTargeting({ kind: 'self' }, wider({ rangeMul: 3 }))).toEqual({
            kind: 'self',
        });
        expect(widenTargeting(burst, NO_EXTENSION)).toBe(burst);
        expect(isExtended(NO_EXTENSION)).toBe(false);
    });

    it('extends effect and zone durations of a spell', () => {
        const spell = {
            definition: {
                targeting: {
                    kind: 'template',
                    shape: 'circle',
                    size: 10,
                    side: 'enemy',
                    maxTargets: 2,
                    zone: { rounds: 3 },
                },
                effects: [
                    { kind: 'buff', duration: { rounds: 4 } },
                    { kind: 'createTerrain', rounds: 2 },
                    { kind: 'dealDamage' },
                ],
            } as unknown as SpellDefinition,
        };

        const out = extendSpell(spell, wider({ durationMul: 2 }));

        expect(out.definition.targeting).toMatchObject({ zone: { rounds: 6 } });
        expect(out.definition.effects).toEqual([
            { kind: 'buff', duration: { rounds: 8 } },
            { kind: 'createTerrain', rounds: 4 },
            { kind: 'dealDamage' },
        ]);
        expect(extendSpell(spell, undefined)).toBe(spell);
    });
});

describe('trimToExtension', () => {
    const caster = makeParticipant({ id: 'c', side: ParticipantSide.ALLY });

    const foes = ['a', 'b', 'c2'].map((id) =>
        makeParticipant({ id, side: ParticipantSide.ENEMY, hp: 20, maxHp: 20 })
    );

    const ps = [caster, ...foes];

    const spell = { id: 's', groupId: null, level: 1 };

    const targeting = { kind: 'enemy', range: 60 } as const;

    const ctx = (extension: CastExtension) => ({
        map: null,
        rules,
        extension,
    });

    const planned = wider({ targets: 2 });

    const resolved = resolveSpellTargets(
        ps,
        caster,
        spell,
        targeting,
        ['a', 'b', 'c2'],
        ctx(planned)
    );

    it('accepts the planned targets and drops those the roll did not buy', () => {
        if (!resolved.ok) throw new Error('planned reach resolves');

        expect(resolved.targetIds).toEqual(['a', 'b', 'c2']);

        const trimmed = trimToExtension(
            ps,
            caster,
            spell,
            targeting,
            ['a', 'b', 'c2'],
            resolved,
            ctx(wider({ targets: 1 }))
        );

        expect(trimmed.targetIds).toEqual(['a', 'b']);

        const none = trimToExtension(
            ps,
            caster,
            spell,
            targeting,
            ['a', 'b', 'c2'],
            resolved,
            ctx(NO_EXTENSION)
        );

        expect(none.targetIds).toEqual(['a']);
    });

    it('rejects more targets than the spell and plan allow', () => {
        const over = resolveSpellTargets(
            ps,
            caster,
            spell,
            targeting,
            ['a', 'b', 'c2'],
            ctx(NO_EXTENSION)
        );

        expect(over.ok).toBe(false);
    });
});

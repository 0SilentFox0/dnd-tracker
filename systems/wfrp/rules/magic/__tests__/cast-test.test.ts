import { describe, expect, it } from 'vitest';

import { applyWfrpConditionTo } from '../../conditions/apply';
import { FORTUNE_INPUT } from '../../percentile/fortune';
import { ACTION_SLOT } from '../../slots';
import { withWfrpState } from '../../state';
import { wfrpCastTest } from '../cast-test';
import { MAX_OVERCAST_STEPS } from '../constants';
import { caster } from './fixtures';

import { textRef } from '@/lib/i18n/text-ref';
import { mulberry32 } from '@/lib/utils/common/rng';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { CastTestCtx } from '@/lib/utils/rules/systems/types';
import type { SpellMagic } from '@/lib/utils/spells/model/schema';
import { WFRP_RULES } from '@/systems/wfrp/rules/rules-preset';

const castOf = (r: { details: SystemSlot }) =>
    ACTION_SLOT.read(r.details)?.cast;

const spell = {
    id: 's',
    name: 'Bolt',
    level: 1,
    groupId: null,
    definition: {},
} as unknown as CastTestCtx['spell'];

const run = (
    presetRoll: number,
    magic: Partial<SpellMagic> = {},
    extra: Partial<CastTestCtx> = {}
) =>
    wfrpCastTest({
        caster: caster(),
        spell,
        magic: { cn: 2, kind: 'arcane', overcast: null, ...magic },
        rules: WFRP_RULES,
        rng: mulberry32(1),
        presetRoll,
        ...extra,
    });

describe('wfrpCastTest', () => {
    it('roll 30 against 50 gives SL 2 and meets CN 2', () => {
        const r = run(30);

        expect(r.success).toBe(true);
        expect(r.margin).toBe(2);
        expect(r.overcastSteps).toBe(0);
        expect(r.miscast).toBeNull();
        expect(castOf(r)).toMatchObject({
            roll: 30,
            target: 50,
            cn: 2,
            outcome: 'success',
        });
    });

    it('caps overcast steps', () => {
        const r = wfrpCastTest({
            caster: caster({ channelledSl: 10 }),
            spell,
            magic: { cn: 0, kind: 'arcane', overcast: 'dice' },
            rules: WFRP_RULES,
            rng: mulberry32(1),
            presetRoll: 10,
        });

        expect(r.overcastSteps).toBe(MAX_OVERCAST_STEPS);
    });

    it('fails when SL is below CN', () => {
        const r = run(30, { cn: 3 });

        expect(r.success).toBe(false);
        expect(castOf(r)?.outcome).toBe('failure');
    });

    it('channelled SL carries a cast over CN', () => {
        const r = wfrpCastTest({
            caster: caster({ channelledSl: 2 }),
            spell,
            magic: { cn: 4, kind: 'arcane', overcast: null },
            rules: WFRP_RULES,
            rng: mulberry32(1),
            presetRoll: 30,
        });

        expect(r.success).toBe(true);
        expect(castOf(r)?.channelled).toBe(2);
    });

    it('overcast steps come from surplus SL for dice overcast only', () => {
        const high = (
            overcast: SpellMagic['overcast'],
            kind: SpellMagic['kind'] = 'arcane'
        ) =>
            wfrpCastTest({
                caster: caster({ channelledSl: 1 }),
                spell,
                magic: { cn: 2, kind, overcast },
                rules: WFRP_RULES,
                rng: mulberry32(1),
                presetRoll: 3,
            });

        expect(high('dice').margin).toBe(6);
        expect(high('dice').overcastSteps).toBe(2);
        expect(high('dice', 'petty').overcastSteps).toBe(0);
        expect(high(null).overcastSteps).toBe(0);
    });

    it('doubles with success meeting CN is a critical cast with a minor miscast', () => {
        const r = run(33, { cn: 2 });

        expect(r.success).toBe(true);
        expect(castOf(r)?.outcome).toBe('critical');
        expect(r.miscast).toBe('minor');
        expect(r.lines[0]).toMatchObject({
            message: 'wfrpMagic.log.castCritical',
        });
    });

    it('critical success below CN does not bypass it', () => {
        const r = run(33, { cn: 8 });

        expect(r.success).toBe(false);
        expect(castOf(r)?.outcome).toBe('failure');
        expect(r.overcastSteps).toBe(0);
        expect(r.miscast).toBe('minor');
        expect(r.lines[0]).toMatchObject({ message: 'wfrpMagic.log.castFail' });
    });

    it('doubles with failure fails with a minor miscast', () => {
        const r = run(77);

        expect(r.success).toBe(false);
        expect(r.miscast).toBe('minor');
    });

    it('100 is a major miscast', () => {
        expect(run(100).miscast).toBe('major');
    });

    it('Fatigued lowers the target', () => {
        const tired = applyWfrpConditionTo(caster(), {
            key: 'fatigued',
            levels: 2,
            round: 1,
            sourceName: textRef('battleWfrp.log.removed', {
                target: 'x',
                condition: 'y',
            }),
        }).participant;

        const r = wfrpCastTest({
            caster: tired,
            spell,
            magic: { cn: 2, kind: 'arcane', overcast: null },
            rules: WFRP_RULES,
            rng: mulberry32(1),
            presetRoll: 30,
        });

        expect(castOf(r)?.target).toBe(30);
    });

    it('Fortune sl adds a level and is reported', () => {
        const r = run(30, {}, { system: FORTUNE_INPUT.write({ kind: 'sl' }) });

        expect(r.margin).toBe(3);
        expect(r.casterUpdate?.(caster()).battleData.system).toEqual({
            key: 'wfrp',
            data: { fortune: 0 },
        });
    });

    it('Fortune reroll is not spent on a first-roll success', () => {
        const r = run(
            30,
            {},
            {
                system: FORTUNE_INPUT.write({
                    kind: 'reroll',
                    manualReroll: 10,
                }),
            }
        );

        expect(r.casterUpdate).toBeUndefined();
        expect(castOf(r)?.roll).toBe(30);
    });

    it('Fortune reroll replaces a failed roll', () => {
        const r = run(
            60,
            {},
            {
                system: FORTUNE_INPUT.write({
                    kind: 'reroll',
                    manualReroll: 30,
                }),
            }
        );

        expect(r.success).toBe(true);
        expect(r.casterUpdate?.(caster()).battleData.system).toEqual({
            key: 'wfrp',
            data: { fortune: 0 },
        });
    });

    it('success and failure lines carry name, spell, roll, target, sl and cn', () => {
        expect(run(30).lines[0]).toEqual(
            textRef('wfrpMagic.log.castSuccess', {
                name: 'c',
                spell: 'Bolt',
                roll: 30,
                target: 50,
                sl: 2,
                cn: 2,
            })
        );
        expect(run(60).lines[0]).toMatchObject({
            message: 'wfrpMagic.log.castFail',
        });
    });
});

describe('castPreview and badge', () => {
    it('shows both targets, banked SL and armour', async () => {
        const { WFRP_TESTED_MAGIC } = await import('../index');

        expect(
            WFRP_TESTED_MAGIC.castPreview(caster({ channelledSl: 2 }))
        ).toEqual({
            target: 50,
            channelTarget: 40,
            channelled: 2,
            armourSl: 0,
        });
    });

    it('badge only while SL is banked', async () => {
        const { channelBadge } = await import('../badge');

        expect(channelBadge(caster())).toBeNull();
        expect(channelBadge(caster({ channelledSl: 3 }))).toMatchObject({
            permanent: true,
            label: { params: { sl: 3 } },
        });
    });
});

describe('prayers', () => {
    const pray = (
        presetRoll: number,
        kind: SpellMagic['kind'],
        over: { sin?: number; channelledSl?: number; cn?: number } = {}
    ) =>
        wfrpCastTest({
            caster: caster({
                base: { fel: 35 },
                sin: over.sin,
                channelledSl: over.channelledSl,
            }),
            spell,
            magic: { cn: over.cn ?? 0, kind, overcast: 'dice' },
            rules: WFRP_RULES,
            rng: mulberry32(1),
            presetRoll,
        });

    it('Blessing: Pray (Fel 35) preset 30 succeeds with no CN and no overcast', () => {
        const r = pray(30, 'blessing');

        expect(r.success).toBe(true);
        expect(castOf(r)).toMatchObject({ target: 35, cn: 0 });
        expect(r.overcastSteps).toBe(0);
    });

    it('Blessing fails when the roll is above the target', () => {
        expect(pray(60, 'blessing').success).toBe(false);
    });

    it('Miracle with CN 2 fails on SL 1', () => {
        const r = pray(25, 'miracle', { cn: 2 });

        expect(castOf(r)?.sl).toBe(1);
        expect(r.success).toBe(false);
    });

    it('uses the Pray skill advances', () => {
        const r = wfrpCastTest({
            caster: caster({ base: { fel: 35 }, skillAdvances: { pray: 10 } }),
            spell,
            magic: { cn: 0, kind: 'blessing', overcast: null },
            rules: WFRP_RULES,
            rng: mulberry32(1),
            presetRoll: 30,
        });

        expect(castOf(r)?.target).toBe(45);
    });

    it('doubles with units at or below Sin bring wrath', () => {
        expect(pray(22, 'blessing', { sin: 3 }).miscast).toBe('wrath');
        expect(pray(66, 'blessing', { sin: 3 }).miscast).toBeNull();
        expect(pray(33, 'miracle', { sin: 3, cn: 1 }).miscast).toBe('wrath');
    });

    it('Sin 0 never brings wrath, and prayers have no minor or major miscast', () => {
        expect(pray(22, 'blessing', { sin: 0 }).miscast).toBeNull();
        expect(pray(100, 'blessing', { sin: 0 }).miscast).toBeNull();
    });

    it('channelled SL does not help a prayer and is kept', () => {
        const r = pray(60, 'miracle', { channelledSl: 3, cn: 1 });

        expect(r.success).toBe(false);
        expect(castOf(r)?.channelled).toBe(0);
        expect(r.casterUpdate).toBeUndefined();
    });

    it('an ordinary spell spends the banked channelled SL', () => {
        const banked = withWfrpState(caster(), { channelledSl: 2 });

        const r = run(30, { cn: 0 }, { caster: banked });

        expect(r.casterUpdate?.(banked).battleData.system).toEqual({
            key: 'wfrp',
            data: {},
        });
    });

    it('an ordinary spell with nothing banked leaves the caster alone', () => {
        expect(run(30).casterUpdate).toBeUndefined();
    });

    it('preview of a prayer ignores channelling and armour', async () => {
        const { WFRP_TESTED_MAGIC } = await import('../index');

        expect(
            WFRP_TESTED_MAGIC.castPreview(
                caster({
                    base: { fel: 35 },
                    channelledSl: 2,
                    ap: { head: 1, arm: 1, body: 1, leg: 1 },
                }),
                'blessing'
            )
        ).toMatchObject({ target: 35, channelled: 0, armourSl: 0 });
    });
});

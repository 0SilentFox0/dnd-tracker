import { skillTarget, value } from '../characteristics/derive';
import { participantChars } from '../combat/participant';
import { editionOf } from '../edition';
import { DIFFICULTY_SL, resolvePercentileTest } from '../percentile';
import type { CritBonus } from '../percentile/fortune';
import { castTargetOf } from './cast-test';
import { CAST_SKILL, DISPEL_PERSISTENT_SL_OWN } from './constants';

import { type AppMessageKey, textRef } from '@/lib/i18n/text-ref';
import type { Rng } from '@/lib/utils/common/rng';
import type { Ruleset } from '@/lib/utils/rules';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

export const isCanonDispel = (rules?: Ruleset): boolean =>
    editionOf(rules).magicModel === 'canon5e';

/** Language (Magick) is an Advanced skill: only a trained hero can attempt a dispel */
export const canDispel = (p: BattleParticipant): boolean =>
    skillTarget(participantChars(p), CAST_SKILL.key, CAST_SKILL.spec)
        ?.trained === true;

/** The dispeller reaches spells aimed at a creature or point within WP yards of themselves */
export const dispelRangeYards = (p: BattleParticipant): number =>
    value(participantChars(p), 'wp');

export const inDispelRange = (
    dispeller: BattleParticipant,
    distanceYards: number
): boolean => distanceYards <= dispelRangeYards(dispeller);

export interface DispelCtx {
    dispeller: BattleParticipant;
    caster: BattleParticipant;
    spellName: string;
    /** SL the spell was cast with */
    castSl: number;
    critBonus?: CritBonus;
    rules: Ruleset;
    rng: Rng;
    presetRoll?: number;
}

export interface DispelResult {
    /** The spell has no effect */
    dispelled: boolean;
    reason: 'dispelled' | 'caster' | 'failed' | 'unstoppable' | 'unsupported';
    roll?: number;
    sl?: number;
    lines: LogLine[];
}

/** Reactive, once per round: an opposed Language (Magick) test against the casting SL */
export function wfrpDispel(ctx: DispelCtx): DispelResult {
    const { dispeller, caster, spellName } = ctx;

    const params = {
        name: dispeller.basicInfo.name,
        caster: caster.basicInfo.name,
        spell: spellName,
    };

    if (!isCanonDispel(ctx.rules))
        return { dispelled: false, reason: 'unsupported', lines: [] };

    if (ctx.critBonus === 'unstoppableForce')
        return {
            dispelled: false,
            reason: 'unstoppable',
            lines: [textRef('wfrpMagic.log.dispelUnstoppable', params)],
        };

    const test = resolvePercentileTest({
        target: castTargetOf(dispeller, ctx.rules),
        slModel: editionOf(ctx.rules).slModel,
        doubles: false,
        rng: ctx.rng,
        presetRoll: ctx.presetRoll,
    });

    const passed = test.outcome === 'success' || test.outcome === 'critical';

    const higherSl = editionOf(ctx.rules).opposedModel === 'higherSl';

    const won = higherSl
        ? test.sl > ctx.castSl
        : passed && test.sl > ctx.castSl;

    const line = (key: AppMessageKey) =>
        textRef(key, { ...params, roll: test.roll, sl: test.sl });

    if (won)
        return {
            dispelled: true,
            reason: 'dispelled',
            roll: test.roll,
            sl: test.sl,
            lines: [line('wfrpMagic.log.dispelSuccess')],
        };

    return {
        dispelled: false,
        reason: passed ? 'caster' : 'failed',
        roll: test.roll,
        sl: test.sl,
        lines: [line('wfrpMagic.log.dispelFail')],
    };
}

export interface PersistentDispelCtx {
    dispeller: BattleParticipant;
    spellName: string;
    /** SL gathered so far against the spell's CN */
    progress: number;
    cn: number;
    ownSpell: boolean;
    rules: Ruleset;
    rng: Rng;
    presetRoll?: number;
}

export interface PersistentDispelResult {
    progress: number;
    done: boolean;
    lines: LogLine[];
}

/** Extended Challenging Language (Magick) test, one Action per attempt; own spells get +1 SL */
export function wfrpDispelPersistent(
    ctx: PersistentDispelCtx
): PersistentDispelResult {
    const test = resolvePercentileTest({
        target: castTargetOf(ctx.dispeller, ctx.rules),
        slModifier:
            DIFFICULTY_SL.challenging +
            (ctx.ownSpell ? DISPEL_PERSISTENT_SL_OWN : 0),
        slModel: editionOf(ctx.rules).slModel,
        doubles: false,
        rng: ctx.rng,
        presetRoll: ctx.presetRoll,
    });

    const progress = Math.max(0, ctx.progress + test.sl);

    const done = progress >= ctx.cn;

    return {
        progress,
        done,
        lines: [
            textRef(
                done
                    ? 'wfrpMagic.log.dispelEnded'
                    : 'wfrpMagic.log.dispelProgress',
                {
                    name: ctx.dispeller.basicInfo.name,
                    spell: ctx.spellName,
                    roll: test.roll,
                    sl: test.sl,
                    progress,
                    cn: ctx.cn,
                }
            ),
        ],
    };
}

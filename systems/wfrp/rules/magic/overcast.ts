import { bonus } from '../characteristics/derive';
import { yardsToFeet } from '../combat/movement';
import { participantChars } from '../combat/participant';
import { editionOf } from '../edition';
import { FORTUNE_INPUT } from '../percentile/fortune';
import {
    BLESSING_OVERCAST,
    OVERCAST_DIRECTIONS,
    OVERCAST_TABLE,
    type OvercastDirection,
    type OvercastPlan,
    type OvercastRow,
    PRAYER_KINDS,
    PRAYER_PLAN_STEPS,
} from './constants';
import { type PrayerOvercast, prayerOvercast } from './prayer-overcast';

import { NO_EXTENSION } from '@/lib/utils/battle/spell/extension';
import type {
    CastExtension,
    MaxExtensionCtx,
} from '@/lib/utils/rules/systems/types';
import type {
    SpellEffect,
    SpellMagic,
    SpellTargeting,
} from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';

/** Touch is 5 ft or less (p236) */
const TOUCH_FEET = 5;

export const overcastRowOf = (spent: number): OvercastRow | undefined =>
    OVERCAST_TABLE.filter((r) => r.sl <= spent).at(-1);

/** SL a caster may spend on overcasting: IB + WPB (p236) */
export const overcastCap = (caster: BattleParticipant): number =>
    bonus(participantChars(caster), 'int') +
    bonus(participantChars(caster), 'wp');

const hasRounds = (effects: readonly SpellEffect[]): boolean =>
    effects.some((e) => {
        const raw = e as unknown as Record<string, unknown>;

        if (raw.kind === 'chooseOne')
            return hasRounds(raw.options as SpellEffect[]);

        return (
            ((raw.duration as { rounds?: number } | undefined)?.rounds ?? 0) >
                0 || (typeof raw.rounds === 'number' && raw.rounds > 0)
        );
    });

/** What the spell's own numbers allow to extend (p236); derived from the spell data, not the legacy `overcast` flag */
export function overcastDirections(
    magic: SpellMagic,
    targeting: SpellTargeting,
    effects: readonly SpellEffect[]
): OvercastDirection[] {
    if (magic.kind === 'petty' || PRAYER_KINDS.has(magic.kind)) return [];

    const reaches =
        targeting.kind === 'ally' ||
        targeting.kind === 'enemy' ||
        targeting.kind === 'area' ||
        targeting.kind === 'template';

    const out: OvercastDirection[] = [];

    if (reaches) out.push('targets');

    if (
        reaches &&
        'range' in targeting &&
        (targeting.range ?? 0) > TOUCH_FEET
    )
        out.push('range');

    if (targeting.kind === 'template') out.push('aoe');

    const zone = targeting.kind === 'template' ? targeting.zone : undefined;

    if (zone || hasRounds(effects)) out.push('duration');

    if (magic.missile || magic.overcast === 'dice') out.push('damage');

    return out;
}

export interface OvercastSpend {
    spent: OvercastPlan;
    extension: CastExtension;
    damage: number;
}

export function extensionOf(spent: OvercastPlan): CastExtension {
    return {
        ...NO_EXTENSION,
        targets: overcastRowOf(spent.targets ?? 0)?.targets ?? 0,
        rangeMul: overcastRowOf(spent.range ?? 0)?.rangeMul ?? 1,
        aoeMul: overcastRowOf(spent.aoe ?? 0)?.aoeMul ?? 1,
        durationMul: overcastRowOf(spent.duration ?? 0)?.durationMul ?? 1,
    };
}

/** Spends the budget on the planned directions in table order; a plan beyond the budget is cut, no plan puts it all into Damage */
export function spendOvercast(
    budget: number,
    plan: OvercastPlan | undefined,
    allowed: readonly OvercastDirection[]
): OvercastSpend {
    const spent: OvercastPlan = {};

    if (plan) {
        let left = Math.max(0, budget);

        for (const dir of OVERCAST_DIRECTIONS) {
            const n = Math.min(plan[dir] ?? 0, left);

            if (n <= 0 || !allowed.includes(dir)) continue;

            spent[dir] = n;
            left -= n;
        }
    } else if (allowed.includes('damage') && budget > 0)
        spent.damage = budget;

    return {
        spent,
        extension: extensionOf(spent),
        damage: overcastRowOf(spent.damage ?? 0)?.damage ?? 0,
    };
}

export function blessingExtension(p: PrayerOvercast): CastExtension {
    return {
        ...NO_EXTENSION,
        targets: p.bonus.targets ?? 0,
        rangeAddFt: yardsToFeet(p.bonus.rangeYards ?? 0),
        durationAddRounds: p.bonus.durationRounds ?? 0,
    };
}

/** The most the caster's plan may reach before the roll; the roll can only buy less */
export function maxExtensionOf(ctx: MaxExtensionCtx): CastExtension {
    const { caster, magic, rules } = ctx;

    if (editionOf(rules).magicModel !== 'canon5e') return NO_EXTENSION;

    const input = FORTUNE_INPUT.read(ctx.system);

    if (magic.kind === 'blessing')
        return blessingExtension(
            prayerOvercast(
                magic.kind,
                PRAYER_PLAN_STEPS,
                input?.blessing ?? BLESSING_OVERCAST[0].dimension
            )
        );

    return spendOvercast(
        overcastCap(caster),
        input?.overcast,
        overcastDirections(magic, ctx.targeting, ctx.effects)
    ).extension;
}

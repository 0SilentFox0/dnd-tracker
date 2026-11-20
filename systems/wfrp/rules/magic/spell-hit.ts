import { bonus } from '../characteristics/derive';
import { applyWfrpCrit } from '../combat/crit-effect';
import { rollCrit } from '../combat/crit-table';
import { computeWfrpDamage } from '../combat/damage';
import { asLocation, hitLocation, sideOf } from '../combat/location';
import { step, totalLabel, wardedHit } from '../combat/mitigate';
import {
    apAt,
    participantChars,
    participantStats,
} from '../combat/participant';
import { editionOf } from '../edition';
import { ACTION_SLOT } from '../slots';

import type {
    MitigateResult,
    SpellHitCtx,
} from '@/lib/utils/rules/systems/types';

/** Damage of a magic missile (p235): declared Damage + WPB (+ overcast, + SL per prayer), minus TB and AP of the struck location, at least 1 (p164) */
export function wfrpSpellHit(ctx: SpellHitCtx): MitigateResult | null {
    const { caster, target, magic, cast, rules } = ctx;

    const missile = magic.missile;

    const edition = editionOf(rules);

    if (!missile || edition.magicModel !== 'canon5e') return null;

    const warded = wardedHit(target, ctx.rng);

    if (warded) return warded;

    const details = ACTION_SLOT.read(cast.details)?.cast;

    const spot = hitLocation(
        details?.rawRoll ?? details?.roll ?? 1,
        edition.hitLocationModel === 'side'
    );

    const location = asLocation(spot);

    const ignored = new Set(missile.ignore);

    const tb = ignored.has('tb') ? 0 : (participantStats(target)?.tb ?? 0);

    const ap = ignored.has('ap') ? 0 : apAt(participantStats(target), location);

    const base = computeWfrpDamage({
        weapon: ctx.amount,
        sb: missile.wpb ? bonus(participantChars(caster), 'wp') : 0,
        netSl:
            ctx.overcastDamage +
            (missile.perSl ?? 0) * Math.max(0, cast.margin),
        tb,
        ap,
    });

    const keyOf = (key: string) =>
        key === 'sb' ? 'wpb' : key === 'netSl' ? 'overcast' : key;

    const steps = base.steps
        .filter((s) => s.key === 'weapon' || s.value !== 0)
        .map((s) => step(s.key === 'weapon' ? 'spell' : keyOf(s.key), s.value));

    const raw = base.steps.reduce((sum, s) => sum + s.value, 0);

    if (base.total !== raw) steps.push(step('minimum', base.total - raw));

    const counted = edition.woundModel === 'critical';

    const crit =
        details?.critBonus === 'criticalDamage' &&
        (counted || target.combatStats.currentHp > 0)
            ? rollCrit(
                  location,
                  rules,
                  ctx.rng,
                  undefined,
                  0,
                  sideOf(spot),
                  participantStats(target)?.tb ?? 0
              )
            : undefined;

    if (crit?.bonusDamage) steps.push(step('crit', crit.bonusDamage));

    const amount = base.total + (crit?.bonusDamage ?? 0);

    if (!crit) return { amount, steps, totalLabel };

    return {
        amount,
        steps,
        totalLabel,
        afterHit: (p, round) => applyWfrpCrit(p, crit, round, edition),
    };
}

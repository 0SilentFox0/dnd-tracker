import { MAX_DURATION_ROUNDS } from '@/lib/constants/duration';
import { textRef } from '@/lib/i18n/text-ref';
import { findParticipant } from '@/lib/utils/abilities/engine/core/participants';
import { footprintDistance, gridOf } from '@/lib/utils/battle/grid/geometry';
import { cellsOf } from '@/lib/utils/battle/grid/occupancy';
import { areaRadiusCells, feetToCells } from '@/lib/utils/battle/grid/template';
import { TOUCH_FEET } from '@/lib/utils/battle/spell/attack-type';
import type { ChosenSpell } from '@/lib/utils/battle/spell/cast/state';
import type { Ruleset } from '@/lib/utils/rules/schema';
import type { CastExtension } from '@/lib/utils/rules/systems/types';
import type { BattleParticipant } from '@/types/battle';
import type { BattleMapConfig, GridPoint } from '@/types/battle-grid';
import type { LogLine } from '@/types/text';

type ChosenEffect = ChosenSpell['definition']['effects'][number];

const scaled = (rounds: number, mul: number) =>
    Math.min(MAX_DURATION_ROUNDS, Math.round(rounds * mul));

function withDuration(e: ChosenEffect, mul: number): ChosenEffect {
    const bag = e as unknown as Record<string, unknown>;

    const own = bag.duration as { rounds?: number } | undefined;

    if (own?.rounds)
        return {
            ...bag,
            duration: { ...own, rounds: scaled(own.rounds, mul) },
        } as unknown as ChosenEffect;

    return typeof bag.rounds === 'number' && bag.rounds > 0
        ? ({
              ...bag,
              rounds: scaled(bag.rounds, mul),
          } as unknown as ChosenEffect)
        : e;
}

export interface ExtensionContext {
    caster: BattleParticipant;
    participants: BattleParticipant[];
    rules: Ruleset;
    aim?: GridPoint;
    map?: BattleMapConfig | null;
}

export interface AppliedExtension {
    spell: ChosenSpell;
    targetIds: string[];
    messages: LogLine[];
    /** Set only when targets were dropped */
    dropped?: boolean;
}

/** Cuts a cast back to what its roll paid for: the requested spread was validated against the declared extension */
export function applyCastExtension(
    spell: ChosenSpell,
    targetIds: string[],
    declared: CastExtension | undefined,
    actual: CastExtension | undefined,
    ctx: ExtensionContext
): AppliedExtension {
    if (!actual) return { spell, targetIds, messages: [] };

    const def = spell.definition;

    const mul = actual.durationMul ?? 1;

    const next =
        mul > 1
            ? {
                  ...spell,
                  definition: {
                      ...def,
                      effects: def.effects.map((e) => withDuration(e, mul)),
                  },
              }
            : spell;

    if (!declared) return { spell: next, targetIds, messages: [] };

    const t = def.targeting;

    const base = 'maxTargets' in t ? t.maxTargets : 1;

    const capped =
        t.kind === 'ally' ||
        t.kind === 'enemy' ||
        t.kind === 'area' ||
        t.kind === 'template'
            ? (declared.extraTargets ?? 0) > (actual.extraTargets ?? 0)
                ? base + (actual.extraTargets ?? 0)
                : Infinity
            : Infinity;

    const reach =
        'range' in t &&
        t.range !== undefined &&
        t.range > TOUCH_FEET &&
        (declared.rangeMul ?? 1) > (actual.rangeMul ?? 1)
            ? feetToCells(t.range * (actual.rangeMul ?? 1), ctx.rules)
            : undefined;

    const radius =
        t.kind === 'template' &&
        t.shape === 'circle' &&
        ctx.aim &&
        (declared.areaMul ?? 1) > (actual.areaMul ?? 1)
            ? t.exact
                ? feetToCells(t.size * (actual.areaMul ?? 1), ctx.rules)
                : areaRadiusCells(t.size * (actual.areaMul ?? 1))
            : undefined;

    const grid = gridOf(ctx.map);

    const inReach = (p: BattleParticipant) =>
        p.battleData.position === undefined ||
        ((reach === undefined ||
            footprintDistance(
                cellsOf(ctx.caster, grid),
                cellsOf(p, grid),
                grid
            ) <= reach) &&
            (radius === undefined ||
                !ctx.aim ||
                footprintDistance([ctx.aim], cellsOf(p, grid), grid) <= radius));

    const kept: string[] = [];

    const messages: LogLine[] = [];

    for (const id of targetIds) {
        const p = findParticipant(ctx.participants, id);

        if (kept.length < capped && (!p || inReach(p))) kept.push(id);
        else
            messages.push(
                textRef('battleActions.spell.extensionDropped', {
                    name: p?.basicInfo.name ?? id,
                    spell: spell.name,
                })
            );
    }

    return {
        spell: next,
        targetIds: kept,
        messages,
        ...(messages.length > 0 && { dropped: true }),
    };
}

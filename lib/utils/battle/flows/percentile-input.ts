import { parseDieInput } from './die-input';

import { isExtended } from '@/lib/utils/battle/spell/extension';
import type { Ruleset } from '@/lib/utils/rules';
import { ruleSystemOf } from '@/lib/utils/rules/systems';
import type { SystemSlot } from '@/lib/utils/rules/systems/slot';
import type { CastExtension } from '@/lib/utils/rules/systems/types';
import type { SpellMagicKind } from '@/lib/utils/spells/model/schema';
import type { BattleParticipant } from '@/types/battle';
import type { BookSpell } from '@/types/spells';

export const PERCENTILE_SIDES = 100;

export const TENS_OPTIONS = Array.from({ length: 10 }, (_, i) => i * 10);

/** Tens die (00-90) plus units die (0-9); 00 + 0 reads as 100. */
export function composePercentile(
    tens: number | undefined,
    units: number | undefined
): number | undefined {
    if (tens === undefined || units === undefined) return undefined;

    return tens + units || PERCENTILE_SIDES;
}

export const parsePercentileField = (raw: string) =>
    parseDieInput(raw, PERCENTILE_SIDES);

/** Casting-test numbers shown before the roll; null outside systems with a casting test. */
export function castPreviewOf(
    caster: BattleParticipant,
    rules: Ruleset,
    kind?: SpellMagicKind
): {
    target: number;
    channelTarget: number;
    channelled: number;
    armourSl: number;
} | null {
    return ruleSystemOf(rules).magic.tested?.castPreview(caster, kind, rules) ?? null;
}

/** Reach the caster's planned overcast may use, for sizing the target picker; undefined without a casting test or a plan that reaches further */
export function castReachOf(
    caster: BattleParticipant,
    rules: Ruleset,
    spell: Pick<BookSpell, 'casting' | 'targeting' | 'spellEffects'>,
    system: SystemSlot | undefined
): CastExtension | undefined {
    const magic = spell.casting?.magic;

    const reach =
        magic &&
        ruleSystemOf(rules).magic.tested?.maxExtension?.({
            caster,
            magic,
            targeting: spell.targeting ?? { kind: 'enemy' },
            effects: spell.spellEffects ?? [],
            rules,
            system,
        });

    return isExtended(reach) ? reach : undefined;
}

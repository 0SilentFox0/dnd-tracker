import { parseSkillAdvanceKey, skillDef } from '../skills/catalog';
import type { AdvancementRules, AdvancementTrack } from './rules';

/** Advancement XP Costs, p191: price of the Nth purchase (+5 each) */
export const CHARACTERISTIC_PURCHASE_COSTS = [
    125, 175, 250, 350, 500, 700, 950, 1300, 1800, 2550, 3600, 5025, 6950, 9000,
    11250,
] as const;

export const SKILL_PURCHASE_COSTS = [
    50, 75, 100, 150, 250, 400, 600, 850, 1200, 1700, 2500, 3500, 4750, 6500,
    8500,
] as const;

/** Flat price of any talent purchase under canon5e (audit B/M-05) */
export const CANON_TALENT_COST = 100;

/** Points (3 x 5 per +5 purchase, 15 purchases) */
export const CANON_ADVANCE_MAX = 75;

const canonTrack = (costs: readonly number[]) => ({
    brackets: costs.map((cost, i) => ({ upTo: i + 1, cost })),
    max: CANON_ADVANCE_MAX,
});

export const CANON_ADVANCEMENT_TRACKS = {
    characteristic: canonTrack(CHARACTERISTIC_PURCHASE_COSTS),
    skill: canonTrack(SKILL_PURCHASE_COSTS),
};

const isPurchaseIndexed = (track: AdvancementTrack) =>
    track.brackets[0]?.upTo === 1;

/** Price tables in effect: canon5e campaigns that still carry legacy (+1-indexed) brackets get the canon tables */
export function advancementFor(
    rules: AdvancementRules,
    edition: { xpTables: 'legacy' | 'canon5e' }
): AdvancementRules {
    if (edition.xpTables !== 'canon5e') return rules;

    const pick = (kind: 'characteristic' | 'skill') =>
        isPurchaseIndexed(rules[kind])
            ? rules[kind]
            : CANON_ADVANCEMENT_TRACKS[kind];

    return {
        ...rules,
        characteristic: pick('characteristic'),
        skill: pick('skill'),
    };
}

/** Advanced skills (and non-basic specialisations) of the catalog; unknown keys count as advanced */
export function isAdvancedSkill(advanceKey: string): boolean {
    const { key, spec } = parseSkillAdvanceKey(advanceKey);

    const def = skillDef(key);

    if (!def) return true;

    if (def.basicSpecs) return !spec || !def.basicSpecs.includes(spec);

    return def.kind === 'advanced';
}

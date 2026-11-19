import type { AbilityKey } from '@/lib/constants/abilities';
import {
    collectModifiers,
    type ModifierResult,
} from '@/lib/utils/abilities/engine/core/collect-modifiers';
import { withSelf } from '@/lib/utils/abilities/engine/core/participants';
import type { SaveSourceTag } from '@/lib/utils/abilities/schema/kinds';
import { uniqueLines } from '@/lib/utils/battle/log/lines';
import {
    ARMOR_PENALTY_LABEL,
    armorPenalty,
    armorPenaltyAffects,
} from '@/lib/utils/battle/proficiency';
import type {
    SaveRollInput,
    SaveRollMode,
    SaveRollResult,
    SaveSource,
} from '@/lib/utils/battle/saves/types';
import type { Ruleset } from '@/lib/utils/rules/schema';
import { rollD20WithMode } from '@/systems/d20/rules/dice/roll-d20';
import type { BattleParticipant } from '@/types/battle';
import type { LogLine } from '@/types/text';

const covers = (
    abilities: readonly AbilityKey[] | 'all',
    ability: AbilityKey
) => abilities === 'all' || abilities.includes(ability);

const SAVE_FLAGS = [
    'saveAdvantage',
    'saveDisadvantage',
    'autoFailSave',
    'saveProficiency',
] as const;

type SaveFlagEntries = ModifierResult['entries'];

const saveFlagEntries = (
    ps: BattleParticipant[],
    id: string
): SaveFlagEntries => collectModifiers(ps, id, { flags: SAVE_FLAGS }).entries;

function matchesSource(
    flag: { vsTags?: readonly SaveSourceTag[]; vsCreatureTypes?: string[] },
    source?: SaveSource
): boolean {
    if (flag.vsTags && !flag.vsTags.some((t) => source?.tags?.includes(t)))
        return false;

    if (!flag.vsCreatureTypes) return true;

    const type = source?.creatureType?.trim().toLowerCase();

    return (
        !!type && flag.vsCreatureTypes.some((t) => t.trim().toLowerCase() === type)
    );
}

function modeFrom(
    entries: SaveFlagEntries,
    ability: AbilityKey,
    vsSpell?: boolean,
    armorBlocked = false,
    source?: SaveSource
): {
    mode: SaveRollMode;
    autoFail: boolean;
    reasons: { advantage: LogLine[]; disadvantage: LogLine[] };
} {
    const advantage = entries
        .filter(
            (e) =>
                e.flag?.flag === 'saveAdvantage' &&
                covers(e.flag.abilities, ability) &&
                (!e.flag.vsSpells || vsSpell) &&
                matchesSource(e.flag, source)
        )
        .map((e) => e.label);

    const disadvantage = [
        ...entries
            .filter(
                (e) =>
                    e.flag?.flag === 'saveDisadvantage' &&
                    covers(e.flag.abilities, ability)
            )
            .map((e) => e.label),
        ...(armorBlocked && armorPenaltyAffects(ability)
            ? [ARMOR_PENALTY_LABEL]
            : []),
    ];

    const autoFail = entries.some(
        (e) =>
            e.flag?.flag === 'autoFailSave' &&
            e.flag.abilities.includes(ability)
    );

    const reasons = {
        advantage: uniqueLines(advantage),
        disadvantage: uniqueLines(disadvantage),
    };

    const adv = reasons.advantage.length > 0;

    const dis = reasons.disadvantage.length > 0;

    return {
        mode:
            adv && !dis ? 'advantage' : dis && !adv ? 'disadvantage' : 'normal',
        autoFail,
        reasons,
    };
}

export function saveRollMode(
    target: BattleParticipant,
    ability: AbilityKey,
    participants: BattleParticipant[],
    opts: { vsSpell?: boolean; source?: SaveSource } = {}
): {
    mode: SaveRollMode;
    autoFail: boolean;
    reasons: { advantage: LogLine[]; disadvantage: LogLine[] };
} {
    return modeFrom(
        saveFlagEntries(withSelf(participants, target), target.basicInfo.id),
        ability,
        opts.vsSpell,
        armorPenalty(target),
        opts.source
    );
}

function proficiencyBonus(
    target: BattleParticipant,
    ability: AbilityKey,
    entries: SaveFlagEntries,
    rules: Ruleset
): number {
    const byRules =
        rules.saves.proficiency &&
        !!target.abilities.saveProficiencies?.includes(ability);

    const byFlag = entries.some(
        (e) =>
            e.flag?.flag === 'saveProficiency' &&
            e.flag.abilities.includes(ability)
    );

    return byRules || byFlag ? target.abilities.proficiencyBonus : 0;
}

export function bestSaveAbility(
    target: BattleParticipant,
    [first, second]: [AbilityKey, AbilityKey],
    participants: BattleParticipant[],
    rules: Ruleset
): AbilityKey {
    const entries = saveFlagEntries(
        withSelf(participants, target),
        target.basicInfo.id
    );

    const bonus = (a: AbilityKey) =>
        target.abilities.modifiers[a] +
        proficiencyBonus(target, a, entries, rules);

    return bonus(second) > bonus(first) ? second : first;
}

export function rollSave(input: SaveRollInput): SaveRollResult {
    const {
        target,
        ability,
        dc,
        participants,
        rules,
        rng,
        presetRoll,
        vsSpell,
        source,
        rider: pickRider,
    } = input;

    const mod = target.abilities.modifiers[ability];

    const ps = withSelf(participants, target);

    const entries = saveFlagEntries(ps, target.basicInfo.id);

    const sm = modeFrom(
        entries,
        ability,
        vsSpell,
        armorPenalty(target),
        source
    );

    const mode: SaveRollMode = input.advantage
        ? sm.reasons.disadvantage.length > 0
            ? 'normal'
            : 'advantage'
        : sm.mode;

    const { autoFail } = sm;

    if (autoFail)
        return {
            roll: 0,
            rolls: [],
            mod,
            bonus: 0,
            total: 0,
            success: false,
            mode,
            autoFail: true,
        };

    const { roll, rolls } = rollD20WithMode(mode, rng, presetRoll);

    const bonus =
        proficiencyBonus(target, ability, entries, rules) +
        collectModifiers(ps, target.basicInfo.id, { stat: 'savingThrow' }).flat;

    const base = roll + mod + bonus;

    const offered =
        dc !== undefined && roll > 1 && base < dc
            ? pickRider?.({
                  holder: target,
                  kind: 'save',
                  total: base,
                  needed: dc,
              })
            : undefined;

    const total = base + (offered?.bonus ?? 0);

    return {
        roll,
        rolls,
        mod,
        bonus,
        total,
        ...(offered && { riderBonus: offered.bonus }),
        success: dc !== undefined && total >= dc,
        mode,
        autoFail: false,
    };
}

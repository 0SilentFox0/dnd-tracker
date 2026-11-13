import type { BattleParticipant } from '@/types/battle';

const ABILITY_LABELS = {
    strength: 'STR',
    dexterity: 'DEX',
    constitution: 'CON',
    intelligence: 'INT',
    wisdom: 'WIS',
    charisma: 'CHA',
} as const;

export function spellcastingModifier(p: BattleParticipant): {
    mod: number;
    label: string;
} {
    const ability = p.spellcasting?.spellcastingAbility;

    if (!ability) return { mod: 0, label: '' };

    return {
        mod: p.abilities.modifiers[ability],
        label: ABILITY_LABELS[ability],
    };
}

/** Предмет-зброя із заклинання: мод. від характеристики кастера, а без неї — від кращої з STR/DEX власника. */
export function weaponModifier(p: BattleParticipant): {
    mod: number;
    label: string;
} {
    if (p.spellcasting?.spellcastingAbility) return spellcastingModifier(p);

    const { strength, dexterity } = p.abilities.modifiers;

    return strength >= dexterity
        ? { mod: strength, label: ABILITY_LABELS.strength }
        : { mod: dexterity, label: ABILITY_LABELS.dexterity };
}

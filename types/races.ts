import type { Prisma } from '@prisma/client';

import type { Ability, ConversionIssue } from '@/lib/utils/abilities/schema';
import type { Choice } from '@/types/choices';

export interface StatModifier {
    bonus?: boolean;
    nonNegative?: boolean;
    alwaysZero?: boolean;
}

export interface SpellSlotProgression {
    level: number;
    slots: number;
}

export interface RacePassiveAbility {
    creatureType?: string;
    name?: string;
    icon?: string;
    description: string;
    appearanceDescription?: string;
    statImprovements?: string;
    statModifiers?: Record<string, StatModifier>;
}

export interface Race {
    abilities?: Ability[];
    icon?: string | null;
    color?: string | null;
    abilityIssues?: ConversionIssue[];
    choices?: Choice[];
    id: string;
    campaignId: string;
    name: string;
    availableSkills: string[];
    disabledSkills: string[];
    passiveAbility?: RacePassiveAbility | null;
    spellSlotProgression?: SpellSlotProgression[];
    createdAt: Date;
    updatedAt: Date;
}

export interface RaceFormData {
    name: string;
    icon?: string;
    color?: string;
    availableSkills: string[];
    disabledSkills: string[];
    passiveAbility?: RacePassiveAbility;
    spellSlotProgression?: SpellSlotProgression[];
    abilities: Ability[];
    choices?: Choice[];
}

export type RaceRow = Prisma.RaceGetPayload<object>;

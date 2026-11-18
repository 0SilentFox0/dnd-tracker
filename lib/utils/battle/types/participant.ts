import type { Prisma } from '@prisma/client';

import type { AttackType } from '@/lib/constants/battle';
import type { WeaponTrait } from '@/lib/constants/weapon-traits';
import type { Ruleset } from '@/lib/utils/rules';
import type { BackgroundData } from '@/types/backgrounds';
import type { BattleAttack } from '@/types/battle';
import type { FeatData } from '@/types/choices';
import type { GameClassData } from '@/types/classes';

export type ArtifactModifier = {
    type: string;
    value: number;
    isPercentage?: boolean;
};

export type ExtractedAttack = {
    id: string;
    name: string;
    type: AttackType;
    attackBonus: number;
    damageDice: string;
    damageType: string;
    range?: string;
    properties?: string;
    minTargets?: number;
    maxTargets?: number;
    traits?: WeaponTrait[];
    versatileDice?: string;
    hand?: 'off';
    damageBonus?: number;
    weaponCategory?: 'simple' | 'martial';
    targetType?: 'target' | 'aoe';
    system?: BattleAttack['system'];
    ammo?: BattleAttack['ammo'];
    reachCells?: number;
    blastRadius?: number;
    ignoresEngagement?: true;
    noLevelDice?: true;
};

export type CharacterFromPrisma = Prisma.CharacterGetPayload<{
    include: {
        inventory?: true;
    };
}>;

export type UnitFromPrisma = Prisma.UnitGetPayload<Record<string, never>>;

export interface CampaignSpellContext {
    ext: Record<string, unknown>;
    spells: Array<{
        id: string;
        level: number;
        spellGroup?: { id: string } | null;
    }>;
    allSkills: Array<Prisma.SkillGetPayload<object>>;
    racesByName: Record<string, Prisma.RaceGetPayload<object> | null>;
    campaign: { maxLevel: number };
    rules: Ruleset;
    classesById?: Record<string, GameClassData>;
    featsById?: Record<string, FeatData>;
    backgroundsById?: Record<string, BackgroundData>;
    skillsById?: Record<string, Prisma.SkillGetPayload<object>>;
    artifactsById?: Record<string, Prisma.ArtifactGetPayload<object>>;
}

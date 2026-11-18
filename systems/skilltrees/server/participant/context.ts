import type { Prisma } from '@prisma/client';

import { defineContextExt } from '@/lib/utils/battle/types/context-ext';

export interface SkillTreeContextBranch {
    id: string;
    spellGroupId: string | null;
    name: string;
    role: string | null;
}

export interface SkillTreeContext {
    treeByRace: Record<string, Prisma.SkillTreeGetPayload<object> | null>;
    mainSkills: SkillTreeContextBranch[];
}

export const skillTreeContext =
    defineContextExt<SkillTreeContext>('skilltrees');

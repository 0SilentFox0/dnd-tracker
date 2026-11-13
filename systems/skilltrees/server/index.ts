import { mainSkillsResource } from './content/main-skills';
import { skillsResource } from './content/skills';
import { resolveLearnedSpellsAndMastery } from './participant/learned-spells';
import { SKILLTREES_OPERATIONS } from './operations';

import type { SystemServer } from '@/lib/server/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const SKILLTREES_MODULE_SERVER = defineAddon<SystemServer>(() => ({
    operations: SKILLTREES_OPERATIONS,
    contentKinds: {
        'main-skills': { resource: mainSkillsResource },
        skills: { resource: skillsResource },
    },
    routes: {
        character: {
            progression: { GET: { operation: 'progression' } },
            'progression.learn': { POST: { operation: 'progression.learn' } },
            'progression.unlearn': {
                POST: { operation: 'progression.unlearn' },
            },
            'progression.reset': { POST: { operation: 'progression.reset' } },
        },
    },
    participant: { learnedSpells: [resolveLearnedSpellsAndMastery] },
}));

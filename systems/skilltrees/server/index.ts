import { SKILLTREES_CONTENT } from './content/content-contribution';
import { mainSkillsResource } from './content/main-skills';
import { skillsResource } from './content/skills';
import { skillTreeCharacterContext } from './participant/character-context';
import { resolveLearnedSpellsAndMastery } from './participant/learned-spells';
import { prepareSkillTreeContext } from './participant/prepare-context';
import { loadSkillEntries } from './participant/skill-entries';
import { SKILLTREES_OPERATIONS } from './operations';

import type { SystemServer } from '@/lib/server/systems/types';
import { defineAddon } from '@/lib/utils/rules/systems/compose';

export const SKILLTREES_MODULE_SERVER = defineAddon<SystemServer>(() => ({
    operations: SKILLTREES_OPERATIONS,
    content: SKILLTREES_CONTENT,
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
    participant: {
        learnedSpells: [resolveLearnedSpellsAndMastery],
        skillEntries: [loadSkillEntries],
        prepareContext: [prepareSkillTreeContext],
        characterContext: [skillTreeCharacterContext],
    },
}));
